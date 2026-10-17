"""Computes ground truth for eval/questions.json straight from the raw Parquet files (not the app's views).
Run: .venv/bin/python eval/ground_truth.py   (needs `pip install duckdb` in .venv)"""
import duckdb, json, os

DATA = os.environ.get("DATA_ROOT", "/Users/justin/github/off-the-pace/data") + "/bronze"
HERE = os.path.dirname(os.path.abspath(__file__))
c = duckdb.connect()
for t in ("laps", "results"):  # same race/session derivation as the app, written independently here
    c.execute(f"""create view {t} as select *, regexp_extract(filename,'race=([^/]+)',1) as race,
      case when filename like '%/session=Q/%' then 'Q' else 'R' end as session
      from read_parquet('{DATA}/{t}/season=2024/**/*.parquet', union_by_name=true, filename=true)""")

def mss(ns):  # nanoseconds -> m:ss.mmm
    s = ns / 1e9
    return f"{int(s // 60)}:{s % 60:06.3f}"

# Expected-value builders. Every value is built from the Python DuckDB output, never from a model answer.
# number: exact (ints compared exactly; floats within 1e-9). time: seconds, compared within 0.5 ms.
# name: any alias, whole-word, case/accents-insensitive. refusal: answer must decline; forbidden names must not appear.
def num(label, v):
    v = float(v)
    return {"kind": "number", "label": label, "value": int(v) if v == int(v) else v}
def time_s(label, ns):
    return {"kind": "time", "label": label, "seconds": ns / 1e9, "display": mss(ns)}
def name(label, *aliases):
    return {"kind": "name", "label": label, "any": list(dict.fromkeys(aliases))}
def driver(full):  # last name straight from the results table
    return name("driver", full, c.execute("select any_value(LastName) from results where FullName=?", [full]).fetchone()[0])
def team(t):  # also accept the name without a trailing "Racing" (e.g. "Red Bull")
    return name("team", t, t.removesuffix(" Racing"))

# (id, category, question, ground-truth SQL, expected(rows) -> list of expected-value dicts)
Q = [
 ("wins_driver", "aggregate", "Who won the most races in 2024, and how many?",
  "SELECT FullName, count(*) AS wins FROM results WHERE session='R' AND Position=1 GROUP BY 1 ORDER BY 2 DESC LIMIT 2",
  lambda r: [driver(r[0][0]), num("wins", r[0][1])]),
 ("wins_team", "aggregate", "Which team won the most races in 2024, and how many?",
  "SELECT TeamName, count(*) FROM results WHERE session='R' AND Position=1 GROUP BY 1 ORDER BY 2 DESC LIMIT 2",
  lambda r: [team(r[0][0]), num("wins", r[0][1])]),
 ("team_wins_and_points", "multi-step", "Which team won the most races in 2024, and how many Grand Prix race points did that team score in total over the season?",
  """WITH w AS (SELECT TeamName, count(*) AS wins FROM results WHERE session='R' AND Position=1 GROUP BY 1 ORDER BY 2 DESC LIMIT 1)
SELECT w.TeamName, w.wins, (SELECT sum(Points) FROM results r WHERE r.session='R' AND r.TeamName=w.TeamName) AS points FROM w""",
  lambda r: [team(r[0][0]), num("wins", r[0][1]), num("points", r[0][2])]),
 ("distinct_winners", "naive-wrong", "How many different drivers won a race in 2024?",
  "SELECT count(DISTINCT FullName) FROM results WHERE session='R' AND Position=1",
  lambda r: [num("distinct winners", r[0][0])]),
 ("races_count", "naive-wrong", "How many races were there in the 2024 season?",
  "SELECT count(DISTINCT race) FROM results WHERE session='R'",
  lambda r: [num("races", r[0][0])]),
 ("poles", "naive-wrong", "How many pole positions did Max Verstappen take in 2024?",
  "SELECT count(*) FROM results WHERE session='Q' AND Position=1 AND FullName='Max Verstappen'",
  lambda r: [num("poles", r[0][0])]),
 ("points_driver", "aggregate", "Which driver scored the most points across the 2024 Grand Prix races, and how many?",
  "SELECT FullName, sum(Points) FROM results WHERE session='R' GROUP BY 1 ORDER BY 2 DESC LIMIT 2",
  lambda r: [driver(r[0][0]), num("points", r[0][1])]),
 ("points_team", "aggregate", "Which team scored the most points across the 2024 Grand Prix races, and how many?",
  "SELECT TeamName, sum(Points) FROM results WHERE session='R' GROUP BY 1 ORDER BY 2 DESC LIMIT 2",
  lambda r: [team(r[0][0]), num("points", r[0][1])]),
 ("fastest_monza", "lap-level", "What was the fastest lap in the 2024 Italian Grand Prix (Monza) race, and who set it?",
  "SELECT Driver, LapTime FROM laps WHERE session='R' AND race='italian_grand_prix' AND LapTime IS NOT NULL ORDER BY LapTime LIMIT 2",
  lambda r: [name("driver", r[0][0], c.execute("select any_value(LastName) from results where Abbreviation=?", [r[0][0]]).fetchone()[0]),
             time_s("lap time", r[0][1])]),
 ("nor_monaco_laps", "lap-level", "How many race laps did Lando Norris complete in the 2024 Monaco Grand Prix?",
  "SELECT count(*) FROM laps WHERE session='R' AND race='monaco_grand_prix' AND Driver='NOR'",
  lambda r: [num("laps", r[0][0])]),
 ("top_compound", "lap-level", "Which tyre compound was used for the most race laps in 2024?",
  "SELECT Compound, count(*) FROM laps WHERE session='R' GROUP BY 1 ORDER BY 2 DESC LIMIT 2",
  lambda r: [name("compound", r[0][0]), num("laps on that compound", r[0][1])]),
 ("bahrain_clean_pace", "lap-level", "In the 2024 Bahrain Grand Prix, who had the faster race pace, Verstappen or Norris? Use only green-flag laps, excluding in-laps, out-laps and deleted laps. Give the median lap time for each.",
  # Green-flag lap = TrackStatus is exactly '1' (no yellow/SC/VSC/red code at any point in the lap). In-lap = PitInTime not null,
  # out-lap = PitOutTime not null, deleted = Deleted true. Median of an even count is the mean of the middle two laps.
  """SELECT Driver, median(LapTime) AS median_ns, count(*) AS laps_used FROM laps
WHERE session='R' AND race='bahrain_grand_prix' AND Driver IN ('VER','NOR') AND TrackStatus='1' AND LapTime IS NOT NULL
AND PitInTime IS NULL AND PitOutTime IS NULL AND coalesce(Deleted, false) = false GROUP BY Driver ORDER BY median_ns""",
  lambda r: [name("faster driver", "Verstappen", "VER", "Max Verstappen")] + [time_s(f"median lap {x[0]}", x[1]) for x in sorted(r)]),
 ("unanswerable", "unanswerable", "Who won the 2023 Monaco Grand Prix?",
  "SELECT count(*) FROM results WHERE season <> 2024", lambda r: None),  # 0 rows outside 2024 => no data
]

def show(e):
    return {"number": lambda: f"{e['label']}={e['value']}", "time": lambda: f"{e['label']}={e['display']} ({e['seconds']:.3f}s)",
            "name": lambda: f"{e['label']}={'/'.join(e['any'])}"}[e["kind"]]()

out = []
for qid, cat, q, sql, ex in Q:
    rows = c.execute(sql).fetchall()
    ev = ex(rows)
    if ev is None:  # unanswerable: decline, and name none of the 2024 drivers
        assert rows[0][0] == 0
        forbidden = [x[0] for x in c.execute("select distinct LastName from results where LastName is not null order by 1").fetchall()]
        ev = [{"kind": "refusal", "label": "declines (data covers 2024 only)", "forbidden_names": forbidden}]
        expected = "Refuse: the data covers the 2024 season only; name no driver."
    else:
        expected = ", ".join(show(e) for e in ev)
    print(f"{qid:20} expected: {expected}\n    sql: {' '.join(sql.split())}\n    output: {rows}")
    out.append({"id": qid, "category": cat, "question": q, "ground_truth_sql": " ".join(sql.split()),
                "ground_truth_output": [list(r) for r in rows], "expected": expected, "expected_values": ev})
json.dump(out, open(f"{HERE}/questions.json", "w"), indent=2, default=str, ensure_ascii=False)
