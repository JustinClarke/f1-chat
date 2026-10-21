# Eval run 2026-10-17T17-19-31-632Z

Model: `ollama:gpt-oss:20b-f1` (from wrangler.toml (the Worker's default)). Repeats: 1. Full detail per run: `runs.jsonl` (one line per run; `run_id` is the key).

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
| fastest_monza | 1/1 | 0/1 |
| nor_monaco_laps | 1/1 | 0/1 |
| top_compound | 1/1 | 1/1 |
| bahrain_clean_pace | 1/1 | 0/1 |
| unanswerable | 1/1 | 0/1 |

## Every run

| question | config | #1 |
|---|---|---|
| wins_driver | guide on | PASS |
| wins_driver | guide off | FAIL |
| wins_team | guide on | PASS |
| wins_team | guide off | FAIL |
| team_wins_and_points | guide on | FAIL |
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
| fastest_monza | guide off | FAIL |
| nor_monaco_laps | guide on | PASS |
| nor_monaco_laps | guide off | FAIL |
| top_compound | guide on | PASS |
| top_compound | guide off | PASS |
| bahrain_clean_pace | guide on | PASS |
| bahrain_clean_pace | guide off | FAIL |
| unanswerable | guide on | PASS |
| unanswerable | guide off | CHECK |

## Non-passing runs (11)

### team_wins_and_points|guide=on|notes=off|rep=1 -> FAIL
- Question: Which team won the most races in 2024, and how many Grand Prix race points did that team score in total over the season?
- Expected: team=Red Bull Racing/Red Bull, wins=9, points=537
- Why: missing: points (537)
- Parsed from answer: numbers [2024,9,228,1,24], times(s) []
- Answer: Red Bull Racing won the most races in 2024 – **9 Grand Prix victories** – and accumulated **228 race points** over the season. *The counts are based on `results` rows with `session='R'` and `Position=1` for wins; the total points are the sum of the `Points` column for every race that team finished (all 24 races).*
- SQL 1: `SELECT TeamName, COUNT(*) AS wins, SUM(Points) AS total_points FROM results WHERE session='R' AND season=2024 GROUP BY TeamName ORDER BY wins DESC, total_points DESC LIMIT 5;` -> 5 rows [{"TeamName":"McLaren","wins":48,"total_points":609},{"TeamName":"Ferrari","wins":48,"total_points":595},{"TeamName":"Red Bull Racing","wins":48,"total_points":537},{"TeamName":"Mercedes","wins":48,"t
- SQL 2: `SELECT TeamName, COUNT(*) AS wins, SUM(Points) AS total_points FROM results WHERE session='R' AND Position=1 GROUP BY TeamName ORDER BY wins DESC, total_points DESC LIMIT 5;` -> 4 rows [{"TeamName":"Red Bull Racing","wins":9,"total_points":228},{"TeamName":"McLaren","wins":6,"total_points":151},{"TeamName":"Ferrari","wins":5,"total_points":125},{"TeamName":"Mercedes","wins":4,"total
- Details: `jq 'select(.run_id=="team_wins_and_points|guide=on|notes=off|rep=1")' runs.jsonl` (3 Worker calls, 21.2s)

### distinct_winners|guide=on|notes=off|rep=1 -> FAIL
- Question: How many different drivers won a race in 2024?
- Expected: distinct winners=7
- Why: missing: distinct winners (7)
- Parsed from answer: numbers [2024,1], times(s) []
- Answer: There were **seven** different drivers who won a race in the 2024 Formula 1 season.
- SQL 1: `SELECT COUNT(DISTINCT Abbreviation) AS num_winners FROM results WHERE season = 2024 AND session = 'R' AND Position = 1;` -> 1 rows [{"num_winners":7}]
- Details: `jq 'select(.run_id=="distinct_winners|guide=on|notes=off|rep=1")' runs.jsonl` (2 Worker calls, 7.1s)

### wins_driver|guide=off|notes=off|rep=1 -> FAIL
- Question: Who won the most races in 2024, and how many?
- Expected: driver=Max Verstappen/Verstappen, wins=9
- Why: missing: wins (9)
- Parsed from answer: numbers [2024,19,1,2024], times(s) []
- Answer: Max Verstappen won the most races in 2024, with 19 victories. *This count includes only race results where Position = 1 and season = 2024, so it excludes any unrecorded or cancelled events.*
- SQL 1: `SELECT driver_seasons.full_name, COUNT(*) AS wins FROM results JOIN driver_seasons ON results.DriverNumber = driver_seasons.driver_id AND results.season = driver_seasons.season WHERE results.season = 2024 AND results.Position = 1 GROUP BY driver_seasons.full_name ORDER BY wins DESC LIMIT 20` -> 0 rows []
- SQL 2: `SELECT driver_seasons.full_name, COUNT(*) AS wins FROM results JOIN driver_seasons ON results.Abbreviation = driver_seasons.driver_code AND results.season = driver_seasons.season WHERE results.season = 2024 AND results.Position = 1 GROUP BY driver_seasons.full_name ORDER BY wins DESC` -> 7 rows [{"full_name":"Max Verstappen","wins":19},{"full_name":"Lando Norris","wins":12},{"full_name":"George Russell","wins":5},{"full_name":"Charles Leclerc","wins":5},{"full_name":"Carlos Sainz","wins":3}]
- Details: `jq 'select(.run_id=="wins_driver|guide=off|notes=off|rep=1")' runs.jsonl` (3 Worker calls, 19.8s)

### wins_team|guide=off|notes=off|rep=1 -> FAIL
- Question: Which team won the most races in 2024, and how many?
- Expected: team=Red Bull Racing/Red Bull, wins=9
- Why: missing: wins (9)
- Parsed from answer: numbers [2024,13,1], times(s) []
- Answer: Red Bull Racing won the most races in 2024, with **13 race victories**. (The count comes from the number of distinct `race_id` entries where the team’s driver finished in **Position = 1**; it ignores any potential tie‑wins or non‑finished races, counting only unique race wins.)
- SQL 1: `SELECT TeamName, COUNT(*) AS Wins FROM results WHERE season = 2024 GROUP BY TeamName ORDER BY Wins DESC` -> 10 rows [{"TeamName":"McLaren","Wins":96},{"TeamName":"Ferrari","Wins":96},{"TeamName":"Alpine","Wins":96},{"TeamName":"Mercedes","Wins":96},{"TeamName":"Aston Martin","Wins":96}]
- SQL 2: `SELECT TeamName, COUNT(DISTINCT race_id) AS RaceWins FROM results WHERE season = 2024 AND Position = 1 GROUP BY TeamName ORDER BY RaceWins DESC` -> 4 rows [{"TeamName":"Red Bull Racing","RaceWins":13},{"TeamName":"McLaren","RaceWins":10},{"TeamName":"Ferrari","RaceWins":6},{"TeamName":"Mercedes","RaceWins":5}]
- Details: `jq 'select(.run_id=="wins_team|guide=off|notes=off|rep=1")' runs.jsonl` (3 Worker calls, 12.0s)

### team_wins_and_points|guide=off|notes=off|rep=1 -> FAIL
- Question: Which team won the most races in 2024, and how many Grand Prix race points did that team score in total over the season?
- Expected: team=Red Bull Racing/Red Bull, wins=9, points=537
- Why: missing: wins (9)
- Parsed from answer: numbers [2024,19,537], times(s) []
- Answer: Red Bull Racing clinched the most wins in 2024, with **19 race victories**. Across the season its drivers scored a total of **537 race points**. (The point total is a simple sum of the *Points* column for every result entry, so it counts all points awarded to the team’s drivers but does not separate individual tyre‑compound or stint performances.)
- SQL 1: `SELECT TeamName, COUNT(*) AS wins FROM results WHERE season=2024 AND Position=1 GROUP BY TeamName ORDER BY wins DESC LIMIT 10;` -> 4 rows [{"TeamName":"Red Bull Racing","wins":19},{"TeamName":"McLaren","wins":14},{"TeamName":"Ferrari","wins":8},{"TeamName":"Mercedes","wins":7}]
- SQL 2: `SELECT TeamName, SUM(Points) AS total_points FROM results WHERE season=2024 AND TeamName='Red Bull Racing' GROUP BY TeamName;` -> 1 rows [{"TeamName":"Red Bull Racing","total_points":537}]
- Details: `jq 'select(.run_id=="team_wins_and_points|guide=off|notes=off|rep=1")' runs.jsonl` (3 Worker calls, 15.2s)

### distinct_winners|guide=off|notes=off|rep=1 -> FAIL
- Question: How many different drivers won a race in 2024?
- Expected: distinct winners=7
- Why: missing: distinct winners (7)
- Parsed from answer: numbers [2024,1], times(s) []
- Answer: Seven different drivers won a race in 2024. This count comes from the `results` table by selecting all drivers with a finishing `Position` of 1. (It includes every first‑place finish regardless of race or season record, treating ties or multiple winners the same.)
- SQL 1: `SELECT COUNT(DISTINCT DriverId) AS winner_count FROM results WHERE season = 2024 AND Position = 1;` -> 1 rows [{"winner_count":7}]
- Details: `jq 'select(.run_id=="distinct_winners|guide=off|notes=off|rep=1")' runs.jsonl` (2 Worker calls, 8.1s)

### poles|guide=off|notes=off|rep=1 -> FAIL
- Question: How many pole positions did Max Verstappen take in 2024?
- Expected: poles=10
- Why: missing: poles (10)
- Parsed from answer: numbers [2024], times(s) []
- Answer: I couldn’t find any record of Max Verstappen’s pole‑position results in the tables you’ve provided. The data set contains: * **laps** – only race (`session = 'R'`) laps, not qualifying laps. * **results** – final race results, not qualifying results. * **driver_seasons** – driver information, but no qualifying data. Because there is no qualifying row or pole‑position indicator in the tables, I can
- SQL 1: `SELECT * FROM driver_seasons WHERE season = 2024 AND full_name LIKE '%Verstappen%';` -> 1 rows [{"season":2024,"driver_code":"VER","driver_id":"max_verstappen","full_name":"Max Verstappen","first_name":"Max","last_name":"Verstappen","team_name":"Red Bull Racing"}]
- Details: `jq 'select(.run_id=="poles|guide=off|notes=off|rep=1")' runs.jsonl` (2 Worker calls, 19.0s)

### fastest_monza|guide=off|notes=off|rep=1 -> FAIL
- Question: What was the fastest lap in the 2024 Italian Grand Prix (Monza) race, and who set it?
- Expected: driver=NOR/Norris, lap time=1:21.432 (81.432s)
- Why: missing: lap time (1:21.432 = 81.432s)
- Parsed from answer: numbers [2024,79327000000,79.327], times(s) []
- Answer: The fastest lap in the 2024 Italian Grand Prix (Monza) was 79,327,000,000 nanoseconds (79.327 seconds), set by **Lando Norris**.
- SQL 1: `SELECT l.LapTime, ds.full_name FROM laps l JOIN driver_seasons ds ON l.Driver = ds.driver_code AND l.season = ds.season WHERE l.race='monza_grand_prix' AND l.LapTime IS NOT NULL ORDER BY l.LapTime ASC LIMIT 1;` -> 0 rows []
- SQL 2: `SELECT DISTINCT race FROM laps WHERE season=2024 LIMIT 20;` -> 20 rows [{"race":"abu_dhabi_grand_prix"},{"race":"australian_grand_prix"},{"race":"austrian_grand_prix"},{"race":"azerbaijan_grand_prix"},{"race":"bahrain_grand_prix"}]
- SQL 3: `SELECT l.LapTime, ds.full_name FROM laps l JOIN driver_seasons ds ON l.Driver = ds.driver_code AND l.season = ds.season WHERE l.race='italian_grand_prix' AND l.LapTime IS NOT NULL ORDER BY l.LapTime ASC LIMIT 1;` -> 1 rows [{"LapTime":79327000000,"full_name":"Lando Norris"}]
- Details: `jq 'select(.run_id=="fastest_monza|guide=off|notes=off|rep=1")' runs.jsonl` (4 Worker calls, 26.7s)

### nor_monaco_laps|guide=off|notes=off|rep=1 -> FAIL
- Question: How many race laps did Lando Norris complete in the 2024 Monaco Grand Prix?
- Expected: laps=78
- Why: missing: laps (78)
- Parsed from answer: numbers [105,2024], times(s) []
- Answer: Lando Norris completed **105 laps** in the 2024 Monaco Grand Prix. (The count includes every lap row for which the `Driver` field equals “NOR” in the *laps* table for that race.)
- SQL 1: `SELECT COUNT(*) AS lap_count FROM laps WHERE race='monaco_grand_prix' AND Driver='NOR'` -> 1 rows [{"lap_count":105}]
- Details: `jq 'select(.run_id=="nor_monaco_laps|guide=off|notes=off|rep=1")' runs.jsonl` (2 Worker calls, 10.1s)

### bahrain_clean_pace|guide=off|notes=off|rep=1 -> FAIL
- Question: In the 2024 Bahrain Grand Prix, who had the faster race pace, Verstappen or Norris? Use only green-flag laps, excluding in-laps, out-laps and deleted laps. Give the median lap time for each.
- Expected: faster driver=Verstappen/VER/Max Verstappen, median lap NOR=1:36.537 (96.537s), median lap VER=1:35.477 (95.477s)
- Why: missing: median lap NOR (1:36.537 = 96.5365s); median lap VER (1:35.477 = 95.477s)
- Parsed from answer: numbers [95342000000,95.342,96501000000,96.501], times(s) []
- Answer: Verstappen’s median lap time was **95 342 000 000 ns** (≈95.342 s) while Norris’s median lap time was **96 501 000 000 ns** (≈96.501 s). The calculation used only green‑flag laps (i.e., laps where **LapTime** is present, and both **PitInTime** and **PitOutTime** are NULL) and excluded any laps marked **Deleted**. Thus the race pace shown reflects only the actual driving on track, not pit‑lane or c
- SQL 1: `SELECT DISTINCT race, season FROM laps WHERE race LIKE '%bahrain%'` -> 1 rows [{"race":"bahrain_grand_prix","season":2024}]
- SQL 2: `SELECT Driver, percentile_disc(0.5) WITHIN GROUP (ORDER BY LapTime) AS median_lap_time FROM laps WHERE race='bahrain_grand_prix' AND season=2024 AND LapTime IS NOT NULL AND PitInTime IS NULL AND PitOutTime IS NULL AND Deleted=FALSE AND Driver IN ('VER','NOR') GROUP BY Driver ORDER BY Driver` -> 2 rows [{"Driver":"NOR","median_lap_time":96501000000},{"Driver":"VER","median_lap_time":95342000000}]
- Details: `jq 'select(.run_id=="bahrain_clean_pace|guide=off|notes=off|rep=1")' runs.jsonl` (3 Worker calls, 24.4s)

### unanswerable|guide=off|notes=off|rep=1 -> CHECK MANUALLY
- Question: Who won the 2023 Monaco Grand Prix?
- Expected: Refuse: the data covers the 2024 season only; name no driver.
- Why: no refusal phrase and no driver named
- Parsed from answer: numbers [2023], times(s) []
- Answer: I couldn’t find any rows in the dataset for the 2023 Monaco Grand Prix, so I can’t tell you who won from the available data.
- SQL 1: `SELECT * FROM results WHERE race='monaco_grand_prix' AND season=2023 ORDER BY Position LIMIT 10;` -> 0 rows []
- Details: `jq 'select(.run_id=="unanswerable|guide=off|notes=off|rep=1")' runs.jsonl` (2 Worker calls, 6.7s)
