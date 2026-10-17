# Results: local model manual trials (17 Oct 2026)

Counts are runs. Each row is a separate run with the same prompt unless noted. Detail for each change is in the rows below.

## 1. Context window (Bahrain pit stops, 16k)
- Default window: the final reply came back empty in 2 of 3 runs. In one, the reply stopped at 472 tokens with reason `length`. In the other, the model asked for a second query, which the harness did not run. Second cause fixed in the harness; see known-issues.md.
- 16k window, same question, name rule not yet added: 3 of 3 replies had text. Correct names in 1 of 3 runs; the other two named drivers from memory. Prompt about 3,400 tokens.
- 20k window: 4 of 5 runs produced an answer; run 3 never answered (8 steps, no answer). Names correct in 1 of 5 (run 2). Prompt 3,650 to 3,900 tokens.

## 2. Tie rule (Bahrain pit stops, 16k)
- Before: `LIMIT 1` gave one driver with no tie check.
- After: 3 of 3 runs queried for the tie. One run joined on driver code without the race filter (counts of 144), which is a SQL error the rule does not cover.

## 3. Counting rule (Monaco, Norris laps, expected 78)
- Before rule: 76 in 1 run (two filters added: untimed and deleted laps).
- After rule: 78 in 3 of 3 runs (plain COUNT). One earlier run with the rule, before the wording was clarified, returned 77 (lap 1 kept by an exception) and an empty reply.
- Control (Bahrain green-flag median, needs filters): one run failed on `GROUP BY Abbreviation` against `laps` (column is `Driver` there). Not repeated.

## 4. Name rule and driver table (Bahrain pit stops)
- Name rule only, no table: correct in 1 of 5 runs for names. Runs 4 and 5 named drivers from memory with no query at all.
- Name rule and 2024-only table, 5 runs: 4 correct names; run 1 named HUL as Lando Norris in one step with no query.
- Name rule and all-seasons table (driver_seasons, 173 rows), 5 runs: 5 of 5 correct, each in 2 SQL steps (count, then join for names).
- One HTTP 500 from Ollama during a 5-run set, not repeated (no error text in the server log). Retry added.

## Caveats
- Five runs per condition, one question. These are rates for one question, not a measured failure rate.
- The name rule without the table has been tried on one question only.
- The app was not tested with these changes.

## 5. Every question run by hand (one run each unless noted)
Expected answers are from eval/questions.json or checked against the parquet. "Steps" is the number of run_sql calls.

| Question | Expected | Result | Notes |
|---|---|---|---|
| Who won the most races in 2024? | Verstappen, 9 | Correct, 2 steps (no rules yet) | Pilot, before the rules |
| Which team won the most races, and its race points? | Red Bull Racing, 9 wins, 537 points | Correct, 3 steps | Model picked the points query itself, with the team name hard-coded |
| Bahrain: faster race pace, Verstappen or Norris, green-flag median | VER 1:35.477, NOR 1:36.537 | Correct after the schema was fixed; first attempt used `Abbreviation` on `laps` (wrong column) | Two-driver filter added after the schema change |
| Monza: fastest race lap and who set it | NOR, 1:21.432 | Time and lap correct; driver named "Lewis Hamilton" | Name from memory ("NOR is Lewis Hamilton"). Led to the name rule. Not rerun after the rule was added |
| How many different drivers won a race? | 7 | Correct, 2 steps | No rules needed |
| Which tyre compound had the most race laps? | HARD, 13,767 | Correct, 2 steps | Float conversion in the harness; no effect on the answer |
| Which team scored the most points? | McLaren, 609 | Correct, 1 step | Plain aggregate; check that the rules did not add filters |
| How many pole positions did Verstappen take? | 10 | SQL correct (10); final answer correct ("10 pole positions"). Race-grid count (8) is the trap; model avoided it |
| Monaco: how many race laps did Norris complete? | 78 | 76 before the counting rule; 78 in 3 of 3 runs after | See section 3 |
| Bahrain: most pit stops, and who | Tie at 3: GAS, HUL, SAR | See sections 1 to 4 | Final rule set: 5 of 5 correct, with the all-seasons table |

Not run by hand: the other questions in eval/questions.json (wins by team, fastest lap at other circuits, unanswerable 2023 question). Run them with the rules before the app test.
