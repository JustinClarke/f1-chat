# Eval run 2026-10-17T16-02-39-673Z

Model: `@cf/openai/gpt-oss-20b` (from wrangler.toml (the Worker's default)). Repeats: 1. Full detail per run: `runs.jsonl` (one line per run; `run_id` is the key).

Scorer: all expected values (from ground_truth.py) must appear in the answer; numbers are exact (commas, spaces, 1:21.432 times and ns handled); names whole-word; unanswerable needs a refusal and no driver name. See eval/score.mjs.

## Pass counts (pass / runs)

| question | guide on | guide off |
|---|---|---|
| wins_driver | 1/1 | 0/1 |
| wins_team | 1/1 | 0/1 |
| team_wins_and_points | 0/1 | 0/1 |
| distinct_winners | 0/1 | 0/1 |
| races_count | 1/1 | 1/1 |
| poles | 1/1 | 0/1 |
| points_driver | 1/1 | 1/1 |
| points_team | 1/1 | 1/1 |
| fastest_monza | 1/1 | 1/1 |
| nor_monaco_laps | 1/1 | 1/1 |
| top_compound | 1/1 | 0/1 |
| bahrain_clean_pace | 1/1 | 0/1 |
| unanswerable | 1/1 | 1/1 |

## Every run

| question | config | #1 |
|---|---|---|
| wins_driver | guide on | PASS |
| wins_driver | guide off | FAIL |
| wins_team | guide on | PASS |
| wins_team | guide off | FAIL |
| team_wins_and_points | guide on | ERROR |
| team_wins_and_points | guide off | FAIL |
| distinct_winners | guide on | FAIL |
| distinct_winners | guide off | FAIL |
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
| nor_monaco_laps | guide off | PASS |
| top_compound | guide on | PASS |
| top_compound | guide off | FAIL |
| bahrain_clean_pace | guide on | PASS |
| bahrain_clean_pace | guide off | FAIL |
| unanswerable | guide on | PASS |
| unanswerable | guide off | PASS |

## Non-passing runs (9)

### team_wins_and_points|guide=on|notes=off|rep=1 -> ERROR
- Question: Which team won the most races in 2024, and how many Grand Prix race points did that team score in total over the season?
- Expected: team=Red Bull Racing/Red Bull, wins=9, points=537
- Why: infrastructure error: Error: AiError: 3043: Internal server error
- Parsed from answer: numbers [3043], times(s) []
- Answer: Gave up: Error: AiError: 3043: Internal server error
- SQL 1: `SELECT TeamName, COUNT(*) AS wins, SUM(Points) AS total_points FROM results WHERE session='R' GROUP BY TeamName ORDER BY wins DESC, total_points DESC LIMIT 5;` -> 5 rows [{"TeamName":"McLaren","wins":48,"total_points":609},{"TeamName":"Ferrari","wins":48,"total_points":595},{"TeamName":"Red Bull Racing","wins":48,"total_points":537},{"TeamName":"Mercedes","wins":48,"t
- SQL 2: `SELECT COUNT(DISTINCT race) FROM results WHERE session='R';` -> 1 rows [{"count(DISTINCT race)":24}]
- SQL 3: `SELECT COUNT(DISTINCT race, Abbreviation) FROM results WHERE session='R';` -> ERROR Binder Error: No function matches the given name and argument types 'count(VARCHAR, VARCHAR)'. You might need to add explicit type casts.
	Candidate f
- Details: `jq 'select(.run_id=="team_wins_and_points|guide=on|notes=off|rep=1")' runs.jsonl` (4 Worker calls, 8.6s)

### distinct_winners|guide=on|notes=off|rep=1 -> FAIL
- Question: How many different drivers won a race in 2024?
- Expected: distinct winners=7
- Why: missing: distinct winners (7)
- Parsed from answer: numbers [2024], times(s) []
- Answer: Seven different drivers won a race in the 2024 season.
- SQL 1: `SELECT COUNT(DISTINCT r.Abbreviation) as driver_wins FROM results r WHERE r.session = 'R' AND r.Position = 1 AND r.season = 2024;` -> ERROR Unexpected token 'S', "SELECT COU"... is not valid JSON
- SQL 2: `SELECT COUNT(DISTINCT r.Abbreviation) as driver_wins FROM results r WHERE r.session = 'R' AND r.Position = 1 AND r.season = 2024;` -> 1 rows [{"driver_wins":7}]
- Details: `jq 'select(.run_id=="distinct_winners|guide=on|notes=off|rep=1")' runs.jsonl` (3 Worker calls, 5.1s)

### wins_driver|guide=off|notes=off|rep=1 -> FAIL
- Question: Who won the most races in 2024, and how many?
- Expected: driver=Max Verstappen/Verstappen, wins=9
- Why: missing: wins (9)
- Parsed from answer: numbers [1,2024,19], times(s) []
- Answer: Max Verstappen (DriverNumber 1) won the most races in 2024, with **19 victories**.
- SQL 1: `SELECT r.DriverNumber, ds.full_name, COUNT(*) as wins FROM results r JOIN driver_seasons ds ON r.DriverNumber = ds.driver_code AND r.season = ds.season WHERE r.season = 2024 AND r.Position = 1 GROUP BY r.DriverNumber, ds.full_name ORDER BY wins DESC LIMIT 5;` -> 0 rows []
- SQL 2: `SELECT r.DriverNumber, ds.full_name, COUNT(*) as wins FROM results r JOIN driver_seasons ds ON r.DriverId = ds.driver_id AND r.season = ds.season WHERE r.season = 2024 AND r.Position = 1 GROUP BY r.DriverNumber, ds.full_name ORDER BY wins DESC LIMIT 5;` -> 5 rows [{"DriverNumber":"1","full_name":"Max Verstappen","wins":19},{"DriverNumber":"4","full_name":"Lando Norris","wins":12},{"DriverNumber":"63","full_name":"George Russell","wins":5},{"DriverNumber":"16",
- Details: `jq 'select(.run_id=="wins_driver|guide=off|notes=off|rep=1")' runs.jsonl` (3 Worker calls, 5.6s)

### wins_team|guide=off|notes=off|rep=1 -> FAIL
- Question: Which team won the most races in 2024, and how many?
- Expected: team=Red Bull Racing/Red Bull, wins=9
- Why: missing: wins (9)
- Parsed from answer: numbers [2024,19], times(s) []
- Answer: Red Bull Racing won the most races in 2024, with **19 victories**.
- SQL 1: `SELECT TeamName, COUNT(*) AS wins FROM results WHERE season=2024 AND Position=1 GROUP BY TeamName ORDER BY wins DESC` -> 4 rows [{"TeamName":"Red Bull Racing","wins":19},{"TeamName":"McLaren","wins":14},{"TeamName":"Ferrari","wins":8},{"TeamName":"Mercedes","wins":7}]
- Details: `jq 'select(.run_id=="wins_team|guide=off|notes=off|rep=1")' runs.jsonl` (2 Worker calls, 3.9s)

### team_wins_and_points|guide=off|notes=off|rep=1 -> FAIL
- Question: Which team won the most races in 2024, and how many Grand Prix race points did that team score in total over the season?
- Expected: team=Red Bull Racing/Red Bull, wins=9, points=537
- Why: missing: wins (9)
- Parsed from answer: numbers [2024,13,537], times(s) []
- Answer: Red Bull Racing won the most races in 2024, with **13 victories**. Over the season the team accumulated **537 Grand Prix race points** in total.
- SQL 1: `SELECT TeamName, COUNT(*) AS wins, SUM(Points) AS total_points FROM results WHERE season = 2024 GROUP BY TeamName ORDER BY wins DESC, total_points DESC LIMIT 10;` -> 10 rows [{"TeamName":"McLaren","wins":96,"total_points":609},{"TeamName":"Ferrari","wins":96,"total_points":595},{"TeamName":"Red Bull Racing","wins":96,"total_points":537},{"TeamName":"Mercedes","wins":96,"t
- SQL 2: `SELECT TeamName, COUNT(DISTINCT race) AS wins FROM results WHERE season=2024 AND Position=1 GROUP BY TeamName ORDER BY wins DESC, TeamName LIMIT 10;` -> 4 rows [{"TeamName":"Red Bull Racing","wins":13},{"TeamName":"McLaren","wins":10},{"TeamName":"Ferrari","wins":6},{"TeamName":"Mercedes","wins":5}]
- SQL 3: `SELECT SUM(Points) AS total_points FROM results WHERE season=2024 AND TeamName='Red Bull Racing';` -> 1 rows [{"total_points":537}]
- Details: `jq 'select(.run_id=="team_wins_and_points|guide=off|notes=off|rep=1")' runs.jsonl` (4 Worker calls, 7.9s)

### distinct_winners|guide=off|notes=off|rep=1 -> FAIL
- Question: How many different drivers won a race in 2024?
- Expected: distinct winners=7
- Why: missing: distinct winners (7)
- Parsed from answer: numbers [2024,1,2024], times(s) []
- Answer: Seven different drivers won a race in 2024. *(We counted rows where `Position = 1` in the 2024 results; this includes every driver who finished first in any race.)*
- SQL 1: `SELECT COUNT(DISTINCT DriverId) AS num_winners FROM results WHERE season = 2024 AND Position = 1` -> 1 rows [{"num_winners":7}]
- Details: `jq 'select(.run_id=="distinct_winners|guide=off|notes=off|rep=1")' runs.jsonl` (2 Worker calls, 3.3s)

### poles|guide=off|notes=off|rep=1 -> FAIL
- Question: How many pole positions did Max Verstappen take in 2024?
- Expected: poles=10
- Why: missing: poles (10)
- Parsed from answer: numbers [23,2024,3,3,23,3,3], times(s) []
- Answer: Max Verstappen secured **23 pole positions** in the 2024 season. *How that was counted:* I selected every race where Verstappen’s Q3 time was present and then compared it to the minimum Q3 time of all drivers in that race. The 23 races where his Q3 matched the race‑wide minimum are the ones where he took pole. This count excludes any race in which Verstappen had no Q3 time recorded (e.g., the São 
- SQL 1: `SELECT * FROM driver_seasons WHERE driver_code = 'VER' AND season = 2024;` -> ERROR Unexpected token 'S', "SELECT * F"... is not valid JSON
- SQL 2: `SELECT * FROM driver_seasons WHERE driver_code = 'VER' AND season = 2024;` -> ERROR Unexpected token 'S', "SELECT * F"... is not valid JSON
- SQL 3: `SELECT * FROM driver_seasons WHERE driver_code = 'VER' AND season = 2024;` -> 1 rows [{"season":2024,"driver_code":"VER","driver_id":"max_verstappen","full_name":"Max Verstappen","first_name":"Max","last_name":"Verstappen","team_name":"Red Bull Racing"}]
- SQL 4: `SELECT race, MIN(Q3) as min_q3 FROM results WHERE season=2024 GROUP BY race HAVING min_q3 IS NOT NULL;` -> 24 rows [{"race":"abu_dhabi_grand_prix","min_q3":82595000000},{"race":"australian_grand_prix","min_q3":75915000000},{"race":"austrian_grand_prix","min_q3":64314000000},{"race":"azerbaijan_grand_prix","min_q3"
- SQL 5: `SELECT r.race, r.Q3, d.full_name FROM results r JOIN driver_seasons d ON r.DriverId = d.driver_id AND r.season = d.season WHERE r.season = 2024 AND d.driver_code = 'VER';` -> 48 rows [{"race":"abu_dhabi_grand_prix","Q3":null,"full_name":"Max Verstappen"},{"race":"abu_dhabi_grand_prix","Q3":82945000000,"full_name":"Max Verstappen"},{"race":"australian_grand_prix","Q3":null,"full_na
- SQL 6: `SELECT r.race, r.Q3, d.full_name, (SELECT MIN(Q3) FROM results WHERE season=2024 AND race=r.race AND Q3 IS NOT NULL) AS min_q3 FROM results r JOIN driver_seasons d ON r.DriverId = d.driver_id AND r.season = d.season WHERE r.season=2024 AND d.driver_code='VER' AND r.Q3 IS NOT NULL;` -> 23 rows [{"race":"abu_dhabi_grand_prix","Q3":82945000000,"full_name":"Max Verstappen","min_q3":82595000000},{"race":"australian_grand_prix","Q3":75915000000,"full_name":"Max Verstappen","min_q3":75915000000},
- Details: `jq 'select(.run_id=="poles|guide=off|notes=off|rep=1")' runs.jsonl` (7 Worker calls, 27.8s)

### top_compound|guide=off|notes=off|rep=1 -> FAIL
- Question: Which tyre compound was used for the most race laps in 2024?
- Expected: compound=HARD, laps on that compound=13767
- Why: missing: laps on that compound (13767)
- Parsed from answer: numbers [2024,13770,2024], times(s) []
- Answer: The tyre compound that saw the highest number of race laps in 2024 was **HARD**, with **13 770 laps**. *(This count includes every lap row in the `laps` table for 2024, regardless of whether the lap was deleted or marked as a pit lap; it does not exclude any lap type.)*
- SQL 1: `SELECT Compound, COUNT(*) AS lap_count FROM laps WHERE season = 2024 GROUP BY Compound ORDER BY lap_count DESC LIMIT 5;` -> 5 rows [{"Compound":"HARD","lap_count":13770},{"Compound":"MEDIUM","lap_count":8967},{"Compound":"SOFT","lap_count":8384},{"Compound":"INTERMEDIATE","lap_count":2770},{"Compound":"WET","lap_count":300}]
- Details: `jq 'select(.run_id=="top_compound|guide=off|notes=off|rep=1")' runs.jsonl` (2 Worker calls, 3.3s)

### bahrain_clean_pace|guide=off|notes=off|rep=1 -> FAIL
- Question: In the 2024 Bahrain Grand Prix, who had the faster race pace, Verstappen or Norris? Use only green-flag laps, excluding in-laps, out-laps and deleted laps. Give the median lap time for each.
- Expected: faster driver=Verstappen/VER/Max Verstappen, median lap NOR=1:36.537 (96.537s), median lap VER=1:35.477 (95.477s)
- Why: run did not finish: Stopped: too many tool steps.
- Parsed from answer: numbers [], times(s) []
- Answer: Stopped: too many tool steps.
- SQL 1: `SELECT ds.full_name AS Driver, MEDIAN(l.LapTime) AS median_lap_time FROM laps l JOIN driver_seasons ds ON l.Driver = ds.driver_id AND l.season = ds.season WHERE l.race = 'bahrain_grand_prix' AND l.season = 2024 AND l.PitOutTime IS NULL AND l.PitInTime IS NULL AND l.Deleted = false AND l.LapTime IS NOT NULL AND l.LapNumber > 0 GROUP BY ds.full_name ORDER BY median_lap_time;` -> 0 rows []
- SQL 2: `SELECT ds.full_name AS Driver, MEDIAN(l.LapTime) AS median_lap_time FROM laps l JOIN driver_seasons ds ON l.Driver = ds.driver_id AND l.season = ds.season WHERE l.race = 'bahrain_grand_prix' AND l.season = 2024 AND l.PitOutTime IS NULL AND l.PitInTime IS NULL AND l.Deleted = false AND l.LapTime IS NOT NULL GROUP BY ds.full_name ORDER BY median_lap_time;` -> 0 rows []
- SQL 3: `SELECT DISTINCT race FROM laps LIMIT 10;` -> 10 rows [{"race":"abu_dhabi_grand_prix"},{"race":"australian_grand_prix"},{"race":"austrian_grand_prix"},{"race":"azerbaijan_grand_prix"},{"race":"bahrain_grand_prix"}]
- SQL 4: `SELECT DISTINCT race FROM laps WHERE season=2024 LIMIT 20;` -> 20 rows [{"race":"abu_dhabi_grand_prix"},{"race":"australian_grand_prix"},{"race":"austrian_grand_prix"},{"race":"azerbaijan_grand_prix"},{"race":"bahrain_grand_prix"}]
- SQL 5: `SELECT * FROM laps WHERE Driver='VER' AND season=2024 LIMIT 5;` -> 5 rows [{"Time":3507597000000,"Driver":"VER","DriverNumber":"1","LapTime":99510000000,"LapNumber":1,"Stint":1,"PitOutTime":null,"PitInTime":null,"Sector1Time":null,"Sector2Time":39931000000,"Sector3Time":349
- SQL 6: `SELECT * FROM driver_seasons WHERE driver_id='ver' LIMIT 5;` -> 0 rows []
- SQL 7: `SELECT * FROM driver_seasons WHERE driver_code='VER' LIMIT 5;` -> 5 rows [{"season":2018,"driver_code":"VER","driver_id":"max_verstappen","full_name":"Max Verstappen","first_name":"Max","last_name":"Verstappen","team_name":"Red Bull Racing"},{"season":2019,"driver_code":"V
- SQL 8: `SELECT * FROM driver_seasons WHERE season=2024 AND driver_code='VER';` -> ERROR no tool result recorded (run ended: Stopped: too many tool steps.)
- Details: `jq 'select(.run_id=="bahrain_clean_pace|guide=off|notes=off|rep=1")' runs.jsonl` (8 Worker calls, 43.0s)
