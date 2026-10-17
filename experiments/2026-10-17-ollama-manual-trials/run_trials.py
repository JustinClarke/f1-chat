"""Manual trial harness: one pipeline, two interchangeable providers (local Ollama or Cloudflare Workers AI).

Runs one question through the same loop as the app: the model writes run_sql, the
query runs in DuckDB against the 2024 Parquet files, the rows go back, and the model
answers. Up to 8 tool steps, as in web/src/chat.ts.

Shared internal format (the loop in run_question): assistant tool calls store
function.arguments as a dict; tool results use the key tool_name. Prompt, RULES, tools,
loop, 8-step limit and row cap are identical for both providers. Only chat() differs:
- ollama: POST OLLAMA_URL (native /api/chat, default http://localhost:11434/api/chat).
  Messages are sent as they are (dict arguments, tool_name). Options: temperature 0,
  num_predict MAX_OUT (env, default 8192), num_ctx NUM_CTX (env, default 20480). No reasoning field is sent.
  The reply is read from the "message" key.
- cloudflare: POST CF_WORKER_URL (the Worker). A copy of messages is converted to the
  OpenAI form: each assistant tool call gets an id (generated if missing, reused on the
  matching tool result), type "function" and arguments as a JSON string; each tool result
  gets tool_call_id and name "run_sql" (tool_name is dropped). The original list is not
  changed. Body: messages, tools, temperature 0, max_tokens CF_MAX_OUT (env, default 32768) and the Cloudflare-only
  extra reasoning {"effort": "medium"}. The reply is read from choices[0].message. The
  Worker picks its own model (wrangler.toml AI_MODEL), so MODEL is only a label there.
The one setting that differs: num_ctx for Ollama, reasoning for Cloudflare.
run_question parses tool-call arguments given as a dict or a JSON string.

Differences from the app, on purpose for these trials:
- The prompt is the experiment's data guide (variants/v3.txt by default, or GUIDE_FILE) plus
  the schema and the rules below, not web/src/dataGuide.ts.
- SQL errors are returned to the model as {"error": ...}; there is no retry cap.

Env vars: PROVIDER (ollama|cloudflare, default ollama), MODEL, CF_WORKER_URL, ROW_CAP (50),
GUIDE_FILE, QUESTION, RUNS (default 1), DATA_ROOT, OLLAMA_URL, NUM_CTX (20480).
Usage: DATA_ROOT=/path/to/off-the-pace/data python3 run_trials.py  (needs duckdb)
Output goes to stdout; copy results into RESULTS.md.
"""
import glob
import json
import os
import urllib.request

import duckdb

HERE = os.path.dirname(os.path.abspath(__file__))
PROVIDER = os.environ.get("PROVIDER", "ollama")
if PROVIDER not in ("ollama", "cloudflare"):
    raise SystemExit(f"PROVIDER must be ollama or cloudflare, got {PROVIDER!r}")
MODEL = os.environ.get("MODEL", "gpt-oss:20b" if PROVIDER == "ollama" else "@cf/openai/gpt-oss-20b")
CF_WORKER_URL = os.environ.get("CF_WORKER_URL", "http://localhost:8787/chat")
OLLAMA_URL = os.environ.get("OLLAMA_URL", "http://localhost:11434/api/chat")
NUM_CTX = int(os.environ.get("NUM_CTX", "20480"))
MAX_OUT = int(os.environ.get("MAX_OUT", "8192"))  # Ollama num_predict
CF_MAX_OUT = int(os.environ.get("CF_MAX_OUT", "32768"))  # Workers AI max_tokens (accepted up to 65536 in a probe)
ROW_CAP = int(os.environ.get("ROW_CAP", "50"))
DATA_ROOT = os.environ.get("DATA_ROOT", "/Users/justin/github/off-the-pace/data")
GUIDE_FILE = os.environ.get("GUIDE_FILE") or os.path.join(HERE, "..", "2026-10-15-prompt-variants", "variants", "v3.txt")
GUIDE = open(GUIDE_FILE).read()
QUESTION = os.environ.get("QUESTION", "Which driver made the most pit stops in the 2024 Bahrain Grand Prix, and how many?")
RUNS = int(os.environ.get("RUNS", "1"))
MAX_STEPS = 8

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
    "description": f"Run one read-only DuckDB SELECT/WITH query against the laps, results and driver_seasons tables. Returns up to {ROW_CAP} rows as JSON.",
    "parameters": {"type": "object", "properties": {"sql": {"type": "string", "description": "A single DuckDB SQL SELECT statement"}}, "required": ["sql"]}}}]


def to_openai(messages):
    """Copy of messages in OpenAI form (see module docstring). The input is not modified."""
    out, ids = [], []
    for m in messages:
        m = dict(m)
        if m.get("tool_calls"):
            calls = []
            for i, c in enumerate(m["tool_calls"]):
                f = dict(c["function"])
                if not isinstance(f["arguments"], str):
                    f["arguments"] = json.dumps(f["arguments"])
                cid = c.get("id") or f"call_{len(out)}_{i}"
                ids.append(cid)
                calls.append({"id": cid, "type": "function", "function": f})
            m["tool_calls"] = calls
        if m["role"] == "tool":
            m.pop("tool_name", None)
            m["tool_call_id"] = ids.pop(0) if ids else "call_0"
            m["name"] = "run_sql"
        out.append(m)
    return out


def chat(messages, provider):
    """One model call. Returns the assistant message dict. See module docstring for the
    two provider branches."""
    if provider == "cloudflare":
        url = CF_WORKER_URL
        body = {"messages": to_openai(messages), "tools": TOOLS, "temperature": 0, "max_tokens": CF_MAX_OUT,
                "reasoning": {"effort": "medium"}}
    else:
        url = OLLAMA_URL
        body = {"model": MODEL, "messages": messages, "tools": TOOLS, "stream": False,
                "options": {"temperature": 0, "num_predict": MAX_OUT, "num_ctx": NUM_CTX}}
    req = urllib.request.Request(url, data=json.dumps(body).encode(), headers={"Content-Type": "application/json"})
    r = json.load(urllib.request.urlopen(req, timeout=900))
    return r["choices"][0]["message"] if provider == "cloudflare" else r["message"]


def run_question(con, system, question):
    messages = [{"role": "system", "content": system}, {"role": "user", "content": question}]
    for step in range(MAX_STEPS):
        m = chat(messages, PROVIDER)
        calls = m.get("tool_calls") or []
        if not calls:
            return f"steps={step} ANSWER: {m.get('content')!r}"
        call = calls[0]
        args = call["function"]["arguments"]
        if isinstance(args, str):  # Cloudflare returns a JSON string, Ollama a dict
            args = json.loads(args)
        sql = args["sql"]
        messages.append({"role": "assistant", "content": "", "tool_calls": [
            {"function": {"name": "run_sql", "arguments": {"sql": sql}}}]})
        try:
            cur = con.execute(sql)
            rows = [dict(zip([d[0] for d in cur.description], r)) for r in cur.fetchall()]
            rows = [{k: (int(v) if isinstance(v, float) and v.is_integer() else v) for k, v in r.items()} for r in rows]
            out = {"row_count": len(rows), "rows": rows[:ROW_CAP]}
        except Exception as e:
            out = {"error": str(e)}
        print(f"  step {step + 1} SQL: {sql}")
        messages.append({"role": "tool", "tool_name": "run_sql", "content": json.dumps(out, default=str)})
    return f"stopped after {MAX_STEPS} steps, no answer"


if __name__ == "__main__":
    print(f"provider={PROVIDER} model={MODEL} row_cap={ROW_CAP} guide={os.path.normpath(GUIDE_FILE)}")
    if PROVIDER == "cloudflare":
        print("note: the Worker uses its own model; MODEL is a label only")
    con = connect()
    system = system_prompt(con)
    print(f"system prompt chars: {len(system)}")
    for i in range(1, RUNS + 1):
        print(f"== run {i} ==")
        print(run_question(con, system, QUESTION))
