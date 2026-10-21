# App-query spike: round 2 (2026-10-19)

Same model (gpt-oss:20b-f1, temp 0), same five questions, one run each. Changes: driver_name added from driver_names.json, rank field and top-10 cut (with a dropped-row count in the result), per-tool `grain`, and an injected system note after the tool results (switch: GRAIN_NOTE=off). Traces: trace.json (round 1, untouched), trace-grain-on.json, trace-grain-off.json. Scorer: score_round2.mjs (numbers and tool names); names were checked by reading the rows.

## Results (n=1 per cell, so differences are anecdotes)

| id | right tool | names match rows | numbers all in rows (unmatched) | invented number |
|---|---|---|---|---|
| | on / off | on / off | on / off | |
| t1 dirty air Monza | y / y | y / y (Stroll, Magnussen; tie reported in both) | y / y | |
| t2 consistency 2024 | y / y | y / y | y / y | |
| t3 constructors 2024 | y / y | n/a (constructors) | y / y. The "95" in the on-run is the CI level, not a row value. | |
| t4 explain | y / y (no tool needed) | n/a | n/a (no numbers) | |
| t5 braking | y / y (no tool, refused) | n/a | n/a | t5: n / n |

Claims that the number check does not catch (read by hand):
- t2 on: lists "top ten" with Norris twice and labels the rows "first race" / "second race". The rows carry no race id, so those labels are invented. It never says the figures are per race, so the grain note did not make the answer per-season. t2 off: five names, no duplicates shown.
- t3 on: says the remaining teams "were all slower than the season average", then gives Mercedes at -0.552, which is faster. t3 off: says "the remaining teams were slower" and skips Mercedes (-0.552). Both runs have this error.
- t4, both runs: "calculated from telemetry and lap-time data" and the exclusion lists have no source in the tool text (same as round 1).

## Did the grain note help?

Not shown. Names and rounding are correct in both runs, and the cause is the name map and the rank/top-10 change, which were in both runs. The note made no clear difference to t2, which is the case it was written for. The on-run printed more rows (10 vs 5) and added the invented race labels. With one run per cell at temperature 0, this is not evidence either way. Round 1 failures fixed in both runs: STR name (t1), tie shown (t1), t2 numbers now come from the rows.

## Open issues

- driver_consistency has no race id in its rows, so a "per race" grain note cannot be checked from the output, and the model cannot tell the rows apart. A season-level query (a change to the SQL) is probably needed; the SQL was not touched here.
- driver_names.json was written from memory, not from a source.
