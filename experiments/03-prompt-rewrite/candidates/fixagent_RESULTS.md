# DATA_GUIDE probe results (gpt-oss:20b-f1 via Ollama, guide on, notes off)

Harness: `probe.mjs <candidate.ts> <ids|all> <repeats>` bundles the real web/src db.ts + chat.ts with esbuild, swaps dataGuide.ts for the candidate, and routes the app's Worker /chat calls to Ollama with the same body as run_eval.mjs (LLM_URL path). It scores answers with experiments/_shared/score.mjs. Logs: `logs/*.jsonl` (per run: SQL, answer, verdict) and `logs/*.out` (console).
The final candidate is `dataGuide.ts`, which is the same file as `candidates/c4_example.ts`.

## Candidates
- **c0_baseline**: the current web/src/dataGuide.ts.
- **c1_recipes**: rewrites the names rule (use results.FullName directly; join driver_seasons only for laps codes, always with ds.season = 2024, and say why). Adds a MEASURES section: wins/podiums/poles, points totals with no Position filter, lap counts as count(*) with no LapTime/Deleted filter, a separate lap-time filter rule, mixed measures via `FILTER`, and a plausibility check against 24 races and 26 points per race. Adds digits and a one-query planning line.
- **c2_answer**: c1 plus "numbers in digits, never words" (made stronger) and "answer every part; when you pick an item by a measure, state its value for that measure".
- **c3_round4**: c2 plus "round medians/averages to 4 decimals" (aimed at the scorer; optional).
- **c4_example** (final): c2 plus a worked CTE-per-measure example (most poles, then race points: a different session and measure from any test). The step-cap guidance now says: list each figure and its rows before the first query, use FILTER or CTEs when conditions differ, and never move one measure's condition into WHERE.

## Pass counts (pass/runs)

| question | c0 baseline | c1 | c2 | c2 2nd pass | c3 | c4 (final) | c4 extra |
|---|---|---|---|---|---|---|---|
| wins_driver | 2/3 | 3/3 | 3/3 | 3/3 | - | 3/3 | - |
| wins_team | 3/3 | 3/3 | 3/3 | - | - | 3/3 | - |
| team_wins_and_points | 2/3 | 0/3 | 3/3 | 2/3 | - | 3/3 | 6/6 |
| distinct_winners | 2/3 | 1/3 | 3/3 | 3/3 | - | 3/3 | - |
| races_count | 3/3 | 3/3 | 3/3 | - | - | 3/3 | - |
| poles | 3/3 | 3/3 | 3/3 | - | - | 3/3 | - |
| points_driver | 0/3 | 3/3 | 3/3 | 3/3 | 3/3 | 3/3 | - |
| points_team | 3/3 | 3/3 | 3/3 | - | - | 3/3 | - |
| fastest_monza | 3/3 | 3/3 | 3/3 | - | 3/3 | 3/3 | - |
| nor_monaco_laps | 1/3 | 3/3 | 3/3 | 3/3 | - | 3/3 | - |
| top_compound | 0/3 | 2/3 | 3/3 | 3/3 | - | 3/3 | - |
| bahrain_clean_pace | 0/3 | 0/3 | 0/3 | - | 2/3 | 0/3 | - |
| unanswerable | 3/3 | 3/3 | 3/3 | - | - | 3/3 | - |
| **total** | 25/39 | 30/39 | 36/39 | 17/18 | 8/9 | 36/39 (36/36 excl. Bahrain) | 6/6 |

Model calls: c0 94, c1 91, c2 80 (+42), c3 18, c4 81 (+15).

## Failure reasons
- **c0 points_driver (3192) and wins_driver (72)**: these joined driver_seasons on driver_code without `season = 2024`. driver_seasons covers 2018 to 2025, so every row counts 8 times. One points_driver run was an Ollama tool-call JSON parse error.
- **c0 top_compound (13,669 / 13,514) and nor_monaco_laps (77)**: the "standing exception" sentence (LapTime IS NOT NULL AND Deleted IS NOT TRUE) was applied to lap counts.
- **c0 team_wins_and_points (latest repo log, 228)**: the model wrote one `GROUP BY TeamName` with `count(*) AS wins, sum(Points)`. The count was 48 per team, so it moved `Position = 1` into WHERE, which also cut the points sum to the winning rows. In c0 here it gave the right 537 but left out the 9 wins.
- **c0/c1 distinct_winners**: "Seven" written in words. The scorer needs digits.
- **c1 team_wins_and_points / top_compound #2**: the SQL was right (c1 run 3 used FILTER), but the answer left out the win count or the lap count. Fixed in c2 by "state the picked item's value".
- **c2 2nd pass team_wins_and_points #2**: the naive single-WHERE shape again. The model moved back and forth between count(*) unfiltered and WHERE Position=1 until it hit the 8-call cap. Fixed in c4 (9/9 across both c4 runs).
- **bahrain_clean_pace (all candidates)**: this is a scorer artefact. The model gives 96.537 s (96.536 in older logs), which matches the expected display 1:36.537. But |96.537 - 96.5365| = 0.000500000000002 in floating point, which is just over the 0.0005 tolerance. Rounding the median to 4 decimals (c3) got 2/3, but that line only serves the scorer, so it is left out of the final. The scorer was not changed.

## Not verified
- Guide-off behaviour (the poles 8-step stop, words for numbers, unanswerable naming a driver) was not probed. Only guide-on was tested.
- The test set has only one unanswerable question. Unanswerable passed 3/3 in every candidate. The c4 refusal line now adds "name no driver or result from memory".
- Questions outside experiments/_shared/questions.json (pit stops, consistency, qualifying laps, charts) were not re-run. The edits leave those guide lines unchanged, apart from the names rule, which still joins driver_seasons for laps codes.
