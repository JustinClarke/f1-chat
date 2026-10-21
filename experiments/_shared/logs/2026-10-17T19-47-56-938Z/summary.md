# Eval run 2026-10-17T19-47-56-938Z

Model: `ollama:gpt-oss:20b-f1` (from wrangler.toml (the Worker's default)). Repeats: 1. Full detail per run: `runs.jsonl` (one line per run; `run_id` is the key).

Scorer: all expected values (from ground_truth.py) must appear in the answer; numbers are exact (commas, spaces, 1:21.432 times and ns handled); names whole-word; unanswerable needs a refusal and no driver name. See eval/score.mjs.

## Pass counts (pass / runs)

| question | guide on | guide off |
|---|---|---|
| wins_driver | 1/1 | 0/1 |
| wins_team | 1/1 | 0/1 |
| team_wins_and_points | 1/1 | 0/1 |
| distinct_winners | 1/1 | 1/1 |
| races_count | 1/1 | 1/1 |
| poles | 1/1 | 0/1 |
| points_driver | 1/1 | 1/1 |
| points_team | 1/1 | 1/1 |
| fastest_monza | 1/1 | 1/1 |
| nor_monaco_laps | 1/1 | 0/1 |
| top_compound | 1/1 | 0/1 |
| bahrain_clean_pace | 0/1 | 0/1 |
| unanswerable | 1/1 | 0/1 |

## Every run

| question | config | #1 |
|---|---|---|
| wins_driver | guide on | PASS |
| wins_driver | guide off | FAIL |
| wins_team | guide on | PASS |
| wins_team | guide off | FAIL |
| team_wins_and_points | guide on | PASS |
| team_wins_and_points | guide off | FAIL |
| distinct_winners | guide on | PASS |
| distinct_winners | guide off | PASS |
| races_count | guide on | PASS |
| races_count | guide off | PASS |
| poles | guide on | PASS |
| poles | guide off | FAIL |
| points_driver | guide on | PASS |
| points_driver | guide off | PASS |
| points_team | guide on | PASS |
| points_team | guide off | PASS |
| fastest_monza | guide on | PASS |
| fastest_monza | guide off | PASS |
| nor_monaco_laps | guide on | PASS |
| nor_monaco_laps | guide off | FAIL |
| top_compound | guide on | PASS |
| top_compound | guide off | FAIL |
| bahrain_clean_pace | guide on | FAIL |
| bahrain_clean_pace | guide off | FAIL |
| unanswerable | guide on | PASS |
| unanswerable | guide off | FAIL |

## Non-passing runs (9)

### bahrain_clean_pace|guide=on|notes=off|rep=1 -> FAIL
- Question: In the 2024 Bahrain Grand Prix, who had the faster race pace, Verstappen or Norris? Use only green-flag laps, excluding in-laps, out-laps and deleted laps. Give the median lap time for each.
- Expected: faster driver=Verstappen/VER/Max Verstappen, median lap NOR=1:36.537 (96.537s), median lap VER=1:35.477 (95.477s)
- Why: missing: median lap NOR (1:36.537 = 96.5365s)
- Parsed from answer: numbers [95.477,96.537], times(s) []
- Answer: Max Verstappen: 95.477 s ; Lando Norris: 96.537 s — Verstappen had the faster race pace.
- SQL 1: `SELECT ds.full_name AS driver, round(percentile_cont(0.5) WITHIN GROUP (ORDER BY l.LapTime) / 1e9, 3) AS median_sec FROM laps l JOIN driver_seasons ds ON ds.driver_code = l.Driver AND ds.season = 2024 WHERE l.session = 'R' AND l.race ilike '%bahrain%' AND l.trackstatus = '1' AND l.deleted = FALSE AND l.pitin IS NULL AND l.pitout IS NULL GROUP BY ds.full_name ORDER BY median_sec` -> ERROR Binder Error: Values list "l" does not have a column named "pitin"

LINE 1: ... '%bahrain%' AND l.trackstatus = '1' AND l.deleted = FALSE AND l.pitin 
- SQL 2: `SELECT ds.full_name AS driver, round(percentile_cont(0.5) WITHIN GROUP (ORDER BY l.LapTime) / 1e9, 3) AS median_sec FROM laps l JOIN driver_seasons ds ON ds.driver_code = l.Driver AND ds.season = 2024 WHERE l.session = 'R' AND l.race ILIKE '%bahrain%' AND l.TrackStatus = '1' AND l.Deleted = FALSE AND l.PitInTime IS NULL AND l.PitOutTime IS NULL GROUP BY ds.full_name ORDER BY median_sec` -> 20 rows [{"driver":"Max Verstappen","median_sec":95.477},{"driver":"Carlos Sainz","median_sec":96.104},{"driver":"Sergio Perez","median_sec":96.211},{"driver":"George Russell","median_sec":96.423},{"driver":"
- Details: `jq 'select(.run_id=="bahrain_clean_pace|guide=on|notes=off|rep=1")' runs.jsonl` (3 Worker calls, 22.4s)

### wins_driver|guide=off|notes=off|rep=1 -> FAIL
- Question: Who won the most races in 2024, and how many?
- Expected: driver=Max Verstappen/Verstappen, wins=9
- Why: missing: wins (9)
- Parsed from answer: numbers [2024,1,19], times(s) []
- Answer: **Max Verstappen** is the driver who has won the most races in the 2024 Formula 1 season, having taken **19 victories**.
- SQL 1: `SELECT DriverId, BroadcastName, COUNT(*) as wins FROM results WHERE season=2024 AND Position=1 GROUP BY DriverId, BroadcastName ORDER BY wins DESC LIMIT 1;` -> 1 rows [{"DriverId":"max_verstappen","BroadcastName":"M VERSTAPPEN","wins":19}]
- Details: `jq 'select(.run_id=="wins_driver|guide=off|notes=off|rep=1")' runs.jsonl` (2 Worker calls, 8.6s)

### wins_team|guide=off|notes=off|rep=1 -> FAIL
- Question: Which team won the most races in 2024, and how many?
- Expected: team=Red Bull Racing/Red Bull, wins=9
- Why: missing: wins (9)
- Parsed from answer: numbers [2024,19], times(s) []
- Answer: **Red Bull Racing** clinched the most victories in 2024, with a total of **19 wins**.
- SQL 1: `SELECT TeamName, COUNT(*) AS wins FROM results WHERE season=2024 AND Position=1 GROUP BY TeamName ORDER BY wins DESC LIMIT 1; ` -> 1 rows [{"TeamName":"Red Bull Racing","wins":19}]
- Details: `jq 'select(.run_id=="wins_team|guide=off|notes=off|rep=1")' runs.jsonl` (2 Worker calls, 7.7s)

### team_wins_and_points|guide=off|notes=off|rep=1 -> FAIL
- Question: Which team won the most races in 2024, and how many Grand Prix race points did that team score in total over the season?
- Expected: team=Red Bull Racing/Red Bull, wins=9, points=537
- Why: missing: wins (9)
- Parsed from answer: numbers [2024,19,537,19,2024,537], times(s) []
- Answer: **Team:** **Red Bull Racing** **Race wins in 2024:** **19** **Grand‑P race points accrued (across all drivers):** **537** > The database shows that Red Bull Racing secured 19 first‑place finishes in the 2024 season. Summing the “Points” column for every entry belonging to that team in the *results* table yields a total of 537 points earned by all of its drivers over the year.
- SQL 1: `SELECT TeamName, COUNT(*) AS wins, SUM(Points) AS total_points FROM results WHERE season=2024 GROUP BY TeamName ORDER BY wins DESC, total_points DESC LIMIT 5` -> 5 rows [{"TeamName":"McLaren","wins":96,"total_points":609},{"TeamName":"Ferrari","wins":96,"total_points":595},{"TeamName":"Red Bull Racing","wins":96,"total_points":537},{"TeamName":"Mercedes","wins":96,"t
- SQL 2: `SELECT TeamName, COUNT(*) AS wins FROM results WHERE season=2024 AND Position=1 GROUP BY TeamName ORDER BY wins DESC LIMIT 5` -> 4 rows [{"TeamName":"Red Bull Racing","wins":19},{"TeamName":"McLaren","wins":14},{"TeamName":"Ferrari","wins":8},{"TeamName":"Mercedes","wins":7}]
- Details: `jq 'select(.run_id=="team_wins_and_points|guide=off|notes=off|rep=1")' runs.jsonl` (3 Worker calls, 23.8s)

### poles|guide=off|notes=off|rep=1 -> FAIL
- Question: How many pole positions did Max Verstappen take in 2024?
- Expected: poles=10
- Why: missing: poles (10)
- Parsed from answer: numbers [2024,2024,3,3,0,1,1,2,1,2,3,2024,2024,2024], times(s) []
- Answer: I couldn’t find any recorded pole‑positions for Max Verstappen in the 2024 data that I have. The query I ran went through every race in the 2024 season, took the lowest Q3 time for each race, and then counted how many times Verstappen’s Q3 time matched that lowest value. The result was **0**, which means that either: 1. **Verstappen did not qualify 1st** in any of the races in the data set, or 2. 
- SQL 1: `WITH min_q3 AS ( SELECT race, MIN(Q3) AS min_q3 FROM results WHERE season=2024 AND Q3 IS NOT NULL GROUP BY race ) SELECT r.race, r.Q3, mq.min_q3, CASE WHEN r.Q3 = mq.min_q3 THEN 1 ELSE 0 END AS pole FROM results r JOIN min_q3 mq ON r.race=mq.race WHERE r.season=2024 AND r.DriverId='verstappen';` -> 0 rows []
- SQL 2: `SELECT COUNT(*) AS pole_count FROM ( SELECT r.race FROM results r JOIN ( SELECT race, MIN(Q3) AS min_q3 FROM results WHERE season=2024 AND Q3 IS NOT NULL GROUP BY race ) AS mq ON r.race = mq.race WHERE r.season = 2024 AND r.DriverId = 'verstappen' AND r.Q3 = mq.min_q3 );` -> 1 rows [{"pole_count":0}]
- Details: `jq 'select(.run_id=="poles|guide=off|notes=off|rep=1")' runs.jsonl` (3 Worker calls, 25.9s)

### nor_monaco_laps|guide=off|notes=off|rep=1 -> FAIL
- Question: How many race laps did Lando Norris complete in the 2024 Monaco Grand Prix?
- Expected: laps=78
- Why: missing: laps (78)
- Parsed from answer: numbers [77,2024], times(s) []
- Answer: Lando Norris completed **77 laps** in the 2024 Monaco Grand Prix.
- SQL 1: `SELECT COUNT(*) AS lap_count FROM laps WHERE Driver='NOR' AND race='monaco_grand_prix' AND session='R' AND Deleted=false;` -> 1 rows [{"lap_count":77}]
- Details: `jq 'select(.run_id=="nor_monaco_laps|guide=off|notes=off|rep=1")' runs.jsonl` (2 Worker calls, 8.1s)

### top_compound|guide=off|notes=off|rep=1 -> FAIL
- Question: Which tyre compound was used for the most race laps in 2024?
- Expected: compound=HARD, laps on that compound=13767
- Why: missing: laps on that compound (13767)
- Parsed from answer: numbers [2024,13770], times(s) []
- Answer: The most used tyre compound for all race laps in 2024 was the **Hard** compound, accounting for 13,770 laps across the season.
- SQL 1: `SELECT Compound, COUNT(*) AS lap_count FROM laps WHERE season = 2024 GROUP BY Compound ORDER BY lap_count DESC LIMIT 1;` -> 1 rows [{"Compound":"HARD","lap_count":13770}]
- Details: `jq 'select(.run_id=="top_compound|guide=off|notes=off|rep=1")' runs.jsonl` (2 Worker calls, 4.5s)

### bahrain_clean_pace|guide=off|notes=off|rep=1 -> FAIL
- Question: In the 2024 Bahrain Grand Prix, who had the faster race pace, Verstappen or Norris? Use only green-flag laps, excluding in-laps, out-laps and deleted laps. Give the median lap time for each.
- Expected: faster driver=Verstappen/VER/Max Verstappen, median lap NOR=1:36.537 (96.537s), median lap VER=1:35.477 (95.477s)
- Why: missing: median lap NOR (1:36.537 = 96.5365s); median lap VER (1:35.477 = 95.477s)
- Parsed from answer: numbers [95342000000,95.342,96504500000,96.505,1.16,95.342,96.505,2024], times(s) []
- Answer: **Median green‑flag lap times** | Driver | Median lap time (ns) | Median lap time (s) | |--------|---------------------|---------------------| | Verstappen (VER) | 95 342 000 000 | **95.342 s** | | Norris (NOR) | 96 504 500 000 | **96.505 s** | **Which driver had the faster race pace?** Verstappen’s median lap time is about **1.16 s quicker** than Norris’s (95.342 s vs. 96.505 s). Therefore, in th
- SQL 1: `SELECT Driver, percentile_cont(0.5) WITHIN GROUP (ORDER BY LapTime) AS median_ns FROM laps WHERE race='bahrain_grand_prix' AND season=2024 AND Deleted=false AND PitOutTime IS NULL AND PitInTime IS NULL AND Driver IN ('VER','NOR') GROUP BY Driver; ` -> 2 rows [{"Driver":"VER","median_ns":95342000000},{"Driver":"NOR","median_ns":96504500000}]
- Details: `jq 'select(.run_id=="bahrain_clean_pace|guide=off|notes=off|rep=1")' runs.jsonl` (2 Worker calls, 19.9s)

### unanswerable|guide=off|notes=off|rep=1 -> FAIL
- Question: Who won the 2023 Monaco Grand Prix?
- Expected: Refuse: the data covers the 2024 season only; name no driver.
- Why: missing: named Norris without refusing
- Parsed from answer: numbers [2023], times(s) []
- Answer: I don’t have the 2023 Monaco GP data in the database, but historically the race was won by **Lando Norris** (McLaren). He took the victory on the tight Monaco Circuit in a dramatic finish.
- SQL 1: `SELECT FullName, Position FROM results WHERE race='monaco_grand_prix' AND season=2023 ORDER BY Position LIMIT 1` -> 0 rows []
- Details: `jq 'select(.run_id=="unanswerable|guide=off|notes=off|rep=1")' runs.jsonl` (2 Worker calls, 12.5s)
