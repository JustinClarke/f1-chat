# Eval run 2026-10-17T16-53-18-971Z

Model: `@cf/openai/gpt-oss-20b` (from wrangler.toml (the Worker's default)). Repeats: 1. Full detail per run: `runs.jsonl` (one line per run; `run_id` is the key).

Scorer: all expected values (from ground_truth.py) must appear in the answer; numbers are exact (commas, spaces, 1:21.432 times and ns handled); names whole-word; unanswerable needs a refusal and no driver name. See eval/score.mjs.

## Pass counts (pass / runs)

| question | guide on | guide off |
|---|---|---|
| wins_driver | 0/1 | 0/1 |
| wins_team | 0/1 | 0/1 |
| team_wins_and_points | 0/1 | 0/1 |
| distinct_winners | 0/1 | 0/1 |
| races_count | 0/1 | 0/1 |
| poles | 0/1 | 0/1 |
| points_driver | 0/1 | 0/1 |
| points_team | 0/1 | 0/1 |
| fastest_monza | 0/1 | 0/1 |
| nor_monaco_laps | 0/1 | 0/1 |
| top_compound | 0/1 | 0/1 |
| bahrain_clean_pace | 0/1 | 0/1 |
| unanswerable | 0/1 | 0/1 |

## Every run

| question | config | #1 |
|---|---|---|
| wins_driver | guide on | ERROR |
| wins_driver | guide off | ERROR |
| wins_team | guide on | ERROR |
| wins_team | guide off | ERROR |
| team_wins_and_points | guide on | ERROR |
| team_wins_and_points | guide off | ERROR |
| distinct_winners | guide on | ERROR |
| distinct_winners | guide off | ERROR |
| races_count | guide on | ERROR |
| races_count | guide off | ERROR |
| poles | guide on | ERROR |
| poles | guide off | ERROR |
| points_driver | guide on | ERROR |
| points_driver | guide off | ERROR |
| points_team | guide on | ERROR |
| points_team | guide off | ERROR |
| fastest_monza | guide on | ERROR |
| fastest_monza | guide off | ERROR |
| nor_monaco_laps | guide on | ERROR |
| nor_monaco_laps | guide off | ERROR |
| top_compound | guide on | ERROR |
| top_compound | guide off | ERROR |
| bahrain_clean_pace | guide on | ERROR |
| bahrain_clean_pace | guide off | ERROR |
| unanswerable | guide on | ERROR |
| unanswerable | guide off | ERROR |

## Non-passing runs (26)

### wins_driver|guide=on|notes=off|rep=1 -> ERROR
- Question: Who won the most races in 2024, and how many?
- Expected: driver=Max Verstappen/Verstappen, wins=9
- Why: infrastructure error: Error: AiError: 4006: you have used up your daily free allocation of 10,000 neurons, please upgrade to Cloudflare's Workers Paid plan if you would like to continue usage.
- Parsed from answer: numbers [4006,10000], times(s) []
- Answer: Gave up: Error: AiError: 4006: you have used up your daily free allocation of 10,000 neurons, please upgrade to Cloudflare's Workers Paid plan if you would like to continue usage.
- The model ran no SQL.
- Details: `jq 'select(.run_id=="wins_driver|guide=on|notes=off|rep=1")' runs.jsonl` (1 Worker calls, 1.2s)

### wins_team|guide=on|notes=off|rep=1 -> ERROR
- Question: Which team won the most races in 2024, and how many?
- Expected: team=Red Bull Racing/Red Bull, wins=9
- Why: infrastructure error: Error: AiError: 4006: you have used up your daily free allocation of 10,000 neurons, please upgrade to Cloudflare's Workers Paid plan if you would like to continue usage.
- Parsed from answer: numbers [4006,10000], times(s) []
- Answer: Gave up: Error: AiError: 4006: you have used up your daily free allocation of 10,000 neurons, please upgrade to Cloudflare's Workers Paid plan if you would like to continue usage.
- The model ran no SQL.
- Details: `jq 'select(.run_id=="wins_team|guide=on|notes=off|rep=1")' runs.jsonl` (1 Worker calls, 0.2s)

### team_wins_and_points|guide=on|notes=off|rep=1 -> ERROR
- Question: Which team won the most races in 2024, and how many Grand Prix race points did that team score in total over the season?
- Expected: team=Red Bull Racing/Red Bull, wins=9, points=537
- Why: infrastructure error: Error: AiError: 4006: you have used up your daily free allocation of 10,000 neurons, please upgrade to Cloudflare's Workers Paid plan if you would like to continue usage.
- Parsed from answer: numbers [4006,10000], times(s) []
- Answer: Gave up: Error: AiError: 4006: you have used up your daily free allocation of 10,000 neurons, please upgrade to Cloudflare's Workers Paid plan if you would like to continue usage.
- The model ran no SQL.
- Details: `jq 'select(.run_id=="team_wins_and_points|guide=on|notes=off|rep=1")' runs.jsonl` (1 Worker calls, 0.2s)

### distinct_winners|guide=on|notes=off|rep=1 -> ERROR
- Question: How many different drivers won a race in 2024?
- Expected: distinct winners=7
- Why: infrastructure error: Error: AiError: 4006: you have used up your daily free allocation of 10,000 neurons, please upgrade to Cloudflare's Workers Paid plan if you would like to continue usage.
- Parsed from answer: numbers [4006,10000], times(s) []
- Answer: Gave up: Error: AiError: 4006: you have used up your daily free allocation of 10,000 neurons, please upgrade to Cloudflare's Workers Paid plan if you would like to continue usage.
- The model ran no SQL.
- Details: `jq 'select(.run_id=="distinct_winners|guide=on|notes=off|rep=1")' runs.jsonl` (1 Worker calls, 0.2s)

### races_count|guide=on|notes=off|rep=1 -> ERROR
- Question: How many races were there in the 2024 season?
- Expected: races=24
- Why: infrastructure error: Error: AiError: 4006: you have used up your daily free allocation of 10,000 neurons, please upgrade to Cloudflare's Workers Paid plan if you would like to continue usage.
- Parsed from answer: numbers [4006,10000], times(s) []
- Answer: Gave up: Error: AiError: 4006: you have used up your daily free allocation of 10,000 neurons, please upgrade to Cloudflare's Workers Paid plan if you would like to continue usage.
- The model ran no SQL.
- Details: `jq 'select(.run_id=="races_count|guide=on|notes=off|rep=1")' runs.jsonl` (1 Worker calls, 0.2s)

### poles|guide=on|notes=off|rep=1 -> ERROR
- Question: How many pole positions did Max Verstappen take in 2024?
- Expected: poles=10
- Why: infrastructure error: Error: AiError: 4006: you have used up your daily free allocation of 10,000 neurons, please upgrade to Cloudflare's Workers Paid plan if you would like to continue usage.
- Parsed from answer: numbers [4006,10000], times(s) []
- Answer: Gave up: Error: AiError: 4006: you have used up your daily free allocation of 10,000 neurons, please upgrade to Cloudflare's Workers Paid plan if you would like to continue usage.
- The model ran no SQL.
- Details: `jq 'select(.run_id=="poles|guide=on|notes=off|rep=1")' runs.jsonl` (1 Worker calls, 0.2s)

### points_driver|guide=on|notes=off|rep=1 -> ERROR
- Question: Which driver scored the most points across the 2024 Grand Prix races, and how many?
- Expected: driver=Max Verstappen/Verstappen, points=399
- Why: infrastructure error: Error: AiError: 4006: you have used up your daily free allocation of 10,000 neurons, please upgrade to Cloudflare's Workers Paid plan if you would like to continue usage.
- Parsed from answer: numbers [4006,10000], times(s) []
- Answer: Gave up: Error: AiError: 4006: you have used up your daily free allocation of 10,000 neurons, please upgrade to Cloudflare's Workers Paid plan if you would like to continue usage.
- The model ran no SQL.
- Details: `jq 'select(.run_id=="points_driver|guide=on|notes=off|rep=1")' runs.jsonl` (1 Worker calls, 0.2s)

### points_team|guide=on|notes=off|rep=1 -> ERROR
- Question: Which team scored the most points across the 2024 Grand Prix races, and how many?
- Expected: team=McLaren, points=609
- Why: infrastructure error: Error: AiError: 4006: you have used up your daily free allocation of 10,000 neurons, please upgrade to Cloudflare's Workers Paid plan if you would like to continue usage.
- Parsed from answer: numbers [4006,10000], times(s) []
- Answer: Gave up: Error: AiError: 4006: you have used up your daily free allocation of 10,000 neurons, please upgrade to Cloudflare's Workers Paid plan if you would like to continue usage.
- The model ran no SQL.
- Details: `jq 'select(.run_id=="points_team|guide=on|notes=off|rep=1")' runs.jsonl` (1 Worker calls, 0.2s)

### fastest_monza|guide=on|notes=off|rep=1 -> ERROR
- Question: What was the fastest lap in the 2024 Italian Grand Prix (Monza) race, and who set it?
- Expected: driver=NOR/Norris, lap time=1:21.432 (81.432s)
- Why: infrastructure error: Error: AiError: 4006: you have used up your daily free allocation of 10,000 neurons, please upgrade to Cloudflare's Workers Paid plan if you would like to continue usage.
- Parsed from answer: numbers [4006,10000], times(s) []
- Answer: Gave up: Error: AiError: 4006: you have used up your daily free allocation of 10,000 neurons, please upgrade to Cloudflare's Workers Paid plan if you would like to continue usage.
- The model ran no SQL.
- Details: `jq 'select(.run_id=="fastest_monza|guide=on|notes=off|rep=1")' runs.jsonl` (1 Worker calls, 0.2s)

### nor_monaco_laps|guide=on|notes=off|rep=1 -> ERROR
- Question: How many race laps did Lando Norris complete in the 2024 Monaco Grand Prix?
- Expected: laps=78
- Why: infrastructure error: Error: AiError: 4006: you have used up your daily free allocation of 10,000 neurons, please upgrade to Cloudflare's Workers Paid plan if you would like to continue usage.
- Parsed from answer: numbers [4006,10000], times(s) []
- Answer: Gave up: Error: AiError: 4006: you have used up your daily free allocation of 10,000 neurons, please upgrade to Cloudflare's Workers Paid plan if you would like to continue usage.
- The model ran no SQL.
- Details: `jq 'select(.run_id=="nor_monaco_laps|guide=on|notes=off|rep=1")' runs.jsonl` (1 Worker calls, 0.2s)

### top_compound|guide=on|notes=off|rep=1 -> ERROR
- Question: Which tyre compound was used for the most race laps in 2024?
- Expected: compound=HARD, laps on that compound=13767
- Why: infrastructure error: Error: AiError: 4006: you have used up your daily free allocation of 10,000 neurons, please upgrade to Cloudflare's Workers Paid plan if you would like to continue usage.
- Parsed from answer: numbers [4006,10000], times(s) []
- Answer: Gave up: Error: AiError: 4006: you have used up your daily free allocation of 10,000 neurons, please upgrade to Cloudflare's Workers Paid plan if you would like to continue usage.
- The model ran no SQL.
- Details: `jq 'select(.run_id=="top_compound|guide=on|notes=off|rep=1")' runs.jsonl` (1 Worker calls, 0.2s)

### bahrain_clean_pace|guide=on|notes=off|rep=1 -> ERROR
- Question: In the 2024 Bahrain Grand Prix, who had the faster race pace, Verstappen or Norris? Use only green-flag laps, excluding in-laps, out-laps and deleted laps. Give the median lap time for each.
- Expected: faster driver=Verstappen/VER/Max Verstappen, median lap NOR=1:36.537 (96.537s), median lap VER=1:35.477 (95.477s)
- Why: infrastructure error: Error: AiError: 4006: you have used up your daily free allocation of 10,000 neurons, please upgrade to Cloudflare's Workers Paid plan if you would like to continue usage.
- Parsed from answer: numbers [4006,10000], times(s) []
- Answer: Gave up: Error: AiError: 4006: you have used up your daily free allocation of 10,000 neurons, please upgrade to Cloudflare's Workers Paid plan if you would like to continue usage.
- The model ran no SQL.
- Details: `jq 'select(.run_id=="bahrain_clean_pace|guide=on|notes=off|rep=1")' runs.jsonl` (1 Worker calls, 0.2s)

### unanswerable|guide=on|notes=off|rep=1 -> ERROR
- Question: Who won the 2023 Monaco Grand Prix?
- Expected: Refuse: the data covers the 2024 season only; name no driver.
- Why: infrastructure error: Error: AiError: 4006: you have used up your daily free allocation of 10,000 neurons, please upgrade to Cloudflare's Workers Paid plan if you would like to continue usage.
- Parsed from answer: numbers [4006,10000], times(s) []
- Answer: Gave up: Error: AiError: 4006: you have used up your daily free allocation of 10,000 neurons, please upgrade to Cloudflare's Workers Paid plan if you would like to continue usage.
- The model ran no SQL.
- Details: `jq 'select(.run_id=="unanswerable|guide=on|notes=off|rep=1")' runs.jsonl` (1 Worker calls, 0.2s)

### wins_driver|guide=off|notes=off|rep=1 -> ERROR
- Question: Who won the most races in 2024, and how many?
- Expected: driver=Max Verstappen/Verstappen, wins=9
- Why: infrastructure error: Error: AiError: 4006: you have used up your daily free allocation of 10,000 neurons, please upgrade to Cloudflare's Workers Paid plan if you would like to continue usage.
- Parsed from answer: numbers [4006,10000], times(s) []
- Answer: Gave up: Error: AiError: 4006: you have used up your daily free allocation of 10,000 neurons, please upgrade to Cloudflare's Workers Paid plan if you would like to continue usage.
- The model ran no SQL.
- Details: `jq 'select(.run_id=="wins_driver|guide=off|notes=off|rep=1")' runs.jsonl` (1 Worker calls, 0.2s)

### wins_team|guide=off|notes=off|rep=1 -> ERROR
- Question: Which team won the most races in 2024, and how many?
- Expected: team=Red Bull Racing/Red Bull, wins=9
- Why: infrastructure error: Error: AiError: 4006: you have used up your daily free allocation of 10,000 neurons, please upgrade to Cloudflare's Workers Paid plan if you would like to continue usage.
- Parsed from answer: numbers [4006,10000], times(s) []
- Answer: Gave up: Error: AiError: 4006: you have used up your daily free allocation of 10,000 neurons, please upgrade to Cloudflare's Workers Paid plan if you would like to continue usage.
- The model ran no SQL.
- Details: `jq 'select(.run_id=="wins_team|guide=off|notes=off|rep=1")' runs.jsonl` (1 Worker calls, 0.2s)

### team_wins_and_points|guide=off|notes=off|rep=1 -> ERROR
- Question: Which team won the most races in 2024, and how many Grand Prix race points did that team score in total over the season?
- Expected: team=Red Bull Racing/Red Bull, wins=9, points=537
- Why: infrastructure error: Error: AiError: 4006: you have used up your daily free allocation of 10,000 neurons, please upgrade to Cloudflare's Workers Paid plan if you would like to continue usage.
- Parsed from answer: numbers [4006,10000], times(s) []
- Answer: Gave up: Error: AiError: 4006: you have used up your daily free allocation of 10,000 neurons, please upgrade to Cloudflare's Workers Paid plan if you would like to continue usage.
- The model ran no SQL.
- Details: `jq 'select(.run_id=="team_wins_and_points|guide=off|notes=off|rep=1")' runs.jsonl` (1 Worker calls, 0.2s)

### distinct_winners|guide=off|notes=off|rep=1 -> ERROR
- Question: How many different drivers won a race in 2024?
- Expected: distinct winners=7
- Why: infrastructure error: Error: AiError: 4006: you have used up your daily free allocation of 10,000 neurons, please upgrade to Cloudflare's Workers Paid plan if you would like to continue usage.
- Parsed from answer: numbers [4006,10000], times(s) []
- Answer: Gave up: Error: AiError: 4006: you have used up your daily free allocation of 10,000 neurons, please upgrade to Cloudflare's Workers Paid plan if you would like to continue usage.
- The model ran no SQL.
- Details: `jq 'select(.run_id=="distinct_winners|guide=off|notes=off|rep=1")' runs.jsonl` (1 Worker calls, 0.1s)

### races_count|guide=off|notes=off|rep=1 -> ERROR
- Question: How many races were there in the 2024 season?
- Expected: races=24
- Why: infrastructure error: Error: AiError: 4006: you have used up your daily free allocation of 10,000 neurons, please upgrade to Cloudflare's Workers Paid plan if you would like to continue usage.
- Parsed from answer: numbers [4006,10000], times(s) []
- Answer: Gave up: Error: AiError: 4006: you have used up your daily free allocation of 10,000 neurons, please upgrade to Cloudflare's Workers Paid plan if you would like to continue usage.
- The model ran no SQL.
- Details: `jq 'select(.run_id=="races_count|guide=off|notes=off|rep=1")' runs.jsonl` (1 Worker calls, 0.1s)

### poles|guide=off|notes=off|rep=1 -> ERROR
- Question: How many pole positions did Max Verstappen take in 2024?
- Expected: poles=10
- Why: infrastructure error: Error: AiError: 4006: you have used up your daily free allocation of 10,000 neurons, please upgrade to Cloudflare's Workers Paid plan if you would like to continue usage.
- Parsed from answer: numbers [4006,10000], times(s) []
- Answer: Gave up: Error: AiError: 4006: you have used up your daily free allocation of 10,000 neurons, please upgrade to Cloudflare's Workers Paid plan if you would like to continue usage.
- The model ran no SQL.
- Details: `jq 'select(.run_id=="poles|guide=off|notes=off|rep=1")' runs.jsonl` (1 Worker calls, 0.1s)

### points_driver|guide=off|notes=off|rep=1 -> ERROR
- Question: Which driver scored the most points across the 2024 Grand Prix races, and how many?
- Expected: driver=Max Verstappen/Verstappen, points=399
- Why: infrastructure error: Error: AiError: 4006: you have used up your daily free allocation of 10,000 neurons, please upgrade to Cloudflare's Workers Paid plan if you would like to continue usage.
- Parsed from answer: numbers [4006,10000], times(s) []
- Answer: Gave up: Error: AiError: 4006: you have used up your daily free allocation of 10,000 neurons, please upgrade to Cloudflare's Workers Paid plan if you would like to continue usage.
- The model ran no SQL.
- Details: `jq 'select(.run_id=="points_driver|guide=off|notes=off|rep=1")' runs.jsonl` (1 Worker calls, 0.2s)

### points_team|guide=off|notes=off|rep=1 -> ERROR
- Question: Which team scored the most points across the 2024 Grand Prix races, and how many?
- Expected: team=McLaren, points=609
- Why: infrastructure error: Error: AiError: 4006: you have used up your daily free allocation of 10,000 neurons, please upgrade to Cloudflare's Workers Paid plan if you would like to continue usage.
- Parsed from answer: numbers [4006,10000], times(s) []
- Answer: Gave up: Error: AiError: 4006: you have used up your daily free allocation of 10,000 neurons, please upgrade to Cloudflare's Workers Paid plan if you would like to continue usage.
- The model ran no SQL.
- Details: `jq 'select(.run_id=="points_team|guide=off|notes=off|rep=1")' runs.jsonl` (1 Worker calls, 0.2s)

### fastest_monza|guide=off|notes=off|rep=1 -> ERROR
- Question: What was the fastest lap in the 2024 Italian Grand Prix (Monza) race, and who set it?
- Expected: driver=NOR/Norris, lap time=1:21.432 (81.432s)
- Why: infrastructure error: Error: AiError: 4006: you have used up your daily free allocation of 10,000 neurons, please upgrade to Cloudflare's Workers Paid plan if you would like to continue usage.
- Parsed from answer: numbers [4006,10000], times(s) []
- Answer: Gave up: Error: AiError: 4006: you have used up your daily free allocation of 10,000 neurons, please upgrade to Cloudflare's Workers Paid plan if you would like to continue usage.
- The model ran no SQL.
- Details: `jq 'select(.run_id=="fastest_monza|guide=off|notes=off|rep=1")' runs.jsonl` (1 Worker calls, 0.2s)

### nor_monaco_laps|guide=off|notes=off|rep=1 -> ERROR
- Question: How many race laps did Lando Norris complete in the 2024 Monaco Grand Prix?
- Expected: laps=78
- Why: infrastructure error: Error: AiError: 4006: you have used up your daily free allocation of 10,000 neurons, please upgrade to Cloudflare's Workers Paid plan if you would like to continue usage.
- Parsed from answer: numbers [4006,10000], times(s) []
- Answer: Gave up: Error: AiError: 4006: you have used up your daily free allocation of 10,000 neurons, please upgrade to Cloudflare's Workers Paid plan if you would like to continue usage.
- The model ran no SQL.
- Details: `jq 'select(.run_id=="nor_monaco_laps|guide=off|notes=off|rep=1")' runs.jsonl` (1 Worker calls, 0.2s)

### top_compound|guide=off|notes=off|rep=1 -> ERROR
- Question: Which tyre compound was used for the most race laps in 2024?
- Expected: compound=HARD, laps on that compound=13767
- Why: infrastructure error: Error: AiError: 4006: you have used up your daily free allocation of 10,000 neurons, please upgrade to Cloudflare's Workers Paid plan if you would like to continue usage.
- Parsed from answer: numbers [4006,10000], times(s) []
- Answer: Gave up: Error: AiError: 4006: you have used up your daily free allocation of 10,000 neurons, please upgrade to Cloudflare's Workers Paid plan if you would like to continue usage.
- The model ran no SQL.
- Details: `jq 'select(.run_id=="top_compound|guide=off|notes=off|rep=1")' runs.jsonl` (1 Worker calls, 0.1s)

### bahrain_clean_pace|guide=off|notes=off|rep=1 -> ERROR
- Question: In the 2024 Bahrain Grand Prix, who had the faster race pace, Verstappen or Norris? Use only green-flag laps, excluding in-laps, out-laps and deleted laps. Give the median lap time for each.
- Expected: faster driver=Verstappen/VER/Max Verstappen, median lap NOR=1:36.537 (96.537s), median lap VER=1:35.477 (95.477s)
- Why: infrastructure error: Error: AiError: 4006: you have used up your daily free allocation of 10,000 neurons, please upgrade to Cloudflare's Workers Paid plan if you would like to continue usage.
- Parsed from answer: numbers [4006,10000], times(s) []
- Answer: Gave up: Error: AiError: 4006: you have used up your daily free allocation of 10,000 neurons, please upgrade to Cloudflare's Workers Paid plan if you would like to continue usage.
- The model ran no SQL.
- Details: `jq 'select(.run_id=="bahrain_clean_pace|guide=off|notes=off|rep=1")' runs.jsonl` (1 Worker calls, 0.1s)

### unanswerable|guide=off|notes=off|rep=1 -> ERROR
- Question: Who won the 2023 Monaco Grand Prix?
- Expected: Refuse: the data covers the 2024 season only; name no driver.
- Why: infrastructure error: Error: AiError: 4006: you have used up your daily free allocation of 10,000 neurons, please upgrade to Cloudflare's Workers Paid plan if you would like to continue usage.
- Parsed from answer: numbers [4006,10000], times(s) []
- Answer: Gave up: Error: AiError: 4006: you have used up your daily free allocation of 10,000 neurons, please upgrade to Cloudflare's Workers Paid plan if you would like to continue usage.
- The model ran no SQL.
- Details: `jq 'select(.run_id=="unanswerable|guide=off|notes=off|rep=1")' runs.jsonl` (1 Worker calls, 0.1s)
