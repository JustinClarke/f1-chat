"""Manual trial harness for the local model (gpt-oss:20b via Ollama).

Runs one question through the same loop as the app: the model writes run_sql, the
query runs in DuckDB against the 2024 Parquet files, the rows go back, and the model
answers. Up to 8 tool steps, as in web/src/chat.ts.

Differences from the app, on purpose for these trials:
- The prompt is the experiment's data guide (variants/v3.txt, frozen in
  ../2026-10-15-prompt-variants) plus the schema and the rules below, not web/src/dataGuide.ts.
- SQL errors are returned to the model as {"error": ...}; there is no retry cap.

Usage:
  DATA_ROOT=/path/to/off-the-pace/data python3 run_trials.py   (needs duckdb and Ollama on :11434)
Edit QUESTION and RUNS below. Output goes to stdout; copy results into RESULTS.md.
"""
import glob
import json
import os
import urllib.request

import duckdb

DATA_ROOT = os.environ.get("DATA_ROOT", "/Users/justin/github/off-the-pace/data")
OLLAMA = "http://localhost:11434/api/chat"
PROVIDER = os.environ.get("PROVIDER", "ollama")  # "ollama" or "cloudflare"
CF_MODEL = "@cf/openai/gpt-oss-20b"  # the model the Worker's wrangler.toml uses
MODEL = os.environ.get("MODEL", "gpt-oss:20b" if PROVIDER == "ollama" else CF_MODEL)
CF_WORKER_URL = os.environ.get("CF_WORKER_URL", "http://localhost:8787/chat")  # wrangler dev
NUM_CTX = 20480  # 16384 also worked; 20480 showed no extra gain (RESULTS.md)
QUESTION = "Which driver made the most pit stops in the 2024 Bahrain Grand Prix, and how many?"
RUNS = 5
HERE = os.path.dirname(os.path.abspath(__file__))
GUIDE = open(os.path.join(HERE, "..", "2026-10-15-prompt-variants", "variants", "v3.txt")).read()

RULES = """RULES
- Always call run_sql for data; never guess. Then answer briefly in plain text, quoting the numbers from the query.
- Use only the data guide and query results. Do not use outside knowledge of F1.
- Apply only the filters the question names. Do not add exclusions (untimed laps, deleted laps, pit laps) unless the question asks for them.
- 'Laps completed' or 'laps' counts mean every lap row for that driver and race. A lap with no LapTime or marked Deleted was still driven, so count it.
- If the question's wording is ambiguous, use the broadest reading that matches the words, and say which reading you used in your answer.
- When asking for the top item (most, fewest, fastest), return every item tied at the top, not just one. Do not use LIMIT 1 to pick a winner; compare against the maximum instead.
- Name a driver or team only from driver_seasons.full_name or team_name. Join driver_seasons on driver_code and season to get names; never name a driver from a code using your own knowledge."""

LAPS_NOTES = [
    "TABLE laps: Bronze-layer fact table. One row per driver per lap. Race laps have no session column in the source; the session column below is derived from the file path (the R/Q value comes from the path).",
    "NOTES laps: LapTime is nanoseconds in Parquet; convert to seconds with / 1e9. Race laps have no session column at all; qualifying laps carry session_type='Q' in the source, which the session column here reflects.",
    "NOTES laps: pit-in and pit-out are flagged by PitInLap / PitOutLap (booleans) as well as PitInTime / PitOutTime (timestamps); either can be used. NOTE: the 2024 Parquet has no PitInLap / PitOutLap columns; use the Time columns.",
    "TABLE results: Official classified results, one row per driver per race session. Source is FastF1 session.results.",
    "TABLE driver_seasons: One row per season and driver code. Join to laps or results on driver_code = Driver (or Abbreviation) AND season = 2024. driver_id is the stable FastF1 DriverId; full_name, first_name, last_name are the official names for that code in that season; team_name is the team the driver raced for most often that season.",
]


def connect():
    con = duckdb.connect()
    for table in ["laps", "results"]:
        files = sorted(glob.glob(f"{DATA_ROOT}/bronze/{table}/season=2024/**/*.parquet", recursive=True))
        lst = ",".join(f"'{f}'" for f in files)
        extra = ", race_name" if table == "laps" else ", HeadshotUrl"
        con.execute(f"""CREATE VIEW {table} AS
          SELECT * EXCLUDE (filename, session_type{extra}),
            regexp_extract(filename, 'race=([^/]+)', 1) AS race,
            CASE WHEN filename LIKE '%/session=Q/%' THEN 'Q' ELSE 'R' END AS session
          FROM read_parquet([{lst}], union_by_name = true, filename = true, hive_partitioning = false)""")
    con.execute(f"CREATE VIEW driver_seasons AS SELECT * FROM read_parquet('{DATA_ROOT}/bronze/reference/drivers/driver_seasons.parquet')")
    return con


def schema(con):
    lines = list(LAPS_NOTES)
    for table in ["laps", "results", "driver_seasons"]:
        for name, typ, *_ in con.execute(f"DESCRIBE {table}").fetchall():
            lines.append(f"- {table}.{name} ({typ})")
    return "\n".join(lines)


def system_prompt(con):
    return ("You answer questions about F1 seasons using the run_sql tool (DuckDB SQL).\n"
            f"{GUIDE}\nTABLE SCHEMA (types as DuckDB reports them)\n{schema(con)}\n{RULES}")


TOOLS = [{"type": "function", "function": {
    "name": "run_sql",
    "description": "Run one read-only DuckDB SELECT/WITH query against the laps, results and driver_seasons tables. Returns up to 50 rows as JSON.",
    "parameters": {"type": "object", "properties": {"sql": {"type": "string", "description": "A single DuckDB SQL SELECT statement"}}, "required": ["sql"]}}}]


def chat(messages):
    if PROVIDER == "cloudflare":
        body = json.dumps({"messages": messages, "tools": TOOLS, "temperature": 0, "max_tokens": 4096,
                           "reasoning": {"effort": "medium"}}).encode()
        req = urllib.request.Request(CF_WORKER_URL, data=body, headers={"Content-Type": "application/json"})
        return json.load(urllib.request.urlopen(req, timeout=900))["choices"][0]["message"]
    body = json.dumps({"model": MODEL, "messages": messages, "tools": TOOLS, "stream": False,
                       "options": {"temperature": 0, "num_predict": 4096, "num_ctx": NUM_CTX}}).encode()
    req = urllib.request.Request(OLLAMA, data=body, headers={"Content-Type": "application/json"})
    return json.load(urllib.request.urlopen(req, timeout=900))["message"]


def run_question(con, system, question):
    messages = [{"role": "system", "content": system}, {"role": "user", "content": question}]
    for step in range(8):
        m = chat(messages)
        calls = m.get("tool_calls") or []
        if not calls:
            return f"steps={step} ANSWER: {m.get('content')!r}"
        args = calls[0]["function"]["arguments"]
        if isinstance(args, str):  # cloudflare returns arguments as a JSON string
            args = json.loads(args)
        sql = args["sql"]
        call_id = calls[0].get("id") or f"call_{step}"
        if PROVIDER == "cloudflare":
            messages.append({"role": "assistant", "content": "", "tool_calls": [
                {"id": call_id, "type": "function", "function": {"name": "run_sql", "arguments": json.dumps({"sql": sql})}}]})
        else:
            messages.append({"role": "assistant", "content": "", "tool_calls": [{"function": {"name": "run_sql", "arguments": {"sql": sql}}}]})
        try:
            cur = con.execute(sql)
            rows = [dict(zip([d[0] for d in cur.description], r)) for r in cur.fetchall()]
            rows = [{k: (int(v) if isinstance(v, float) and v.is_integer() else v) for k, v in r.items()} for r in rows]
            out = {"row_count": len(rows), "rows": rows[:50]}
        except Exception as e:
            out = {"error": str(e)}
        print(f"  step {step + 1} SQL: {sql}")
        if PROVIDER == "cloudflare":
            messages.append({"role": "tool", "tool_call_id": call_id, "name": "run_sql", "content": json.dumps(out, default=str)})
        else:
            messages.append({"role": "tool", "tool_name": "run_sql", "content": json.dumps(out, default=str)})
    return "stopped after 8 steps, no answer"


if __name__ == "__main__":
    print(f"provider={PROVIDER} model={MODEL}")
    if PROVIDER == "cloudflare" and MODEL != CF_MODEL:
        print(f"WARNING: the Worker uses its own model ({CF_MODEL}); MODEL={MODEL} is not sent")
    con = connect()
    system = system_prompt(con)
    print(f"system prompt chars: {len(system)}")
    for i in range(1, RUNS + 1):
        print(f"== run {i} ==")
        print(run_question(con, system, QUESTION))
