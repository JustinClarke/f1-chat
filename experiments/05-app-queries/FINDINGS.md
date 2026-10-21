# App-query spike: first run (2026-10-19)

Model gpt-oss:20b-f1, temperature 0, one run per question. Tools: list_races, dirty_air_cost, driver_consistency, constructor_pace. The app's own SQL, run on the adapter's base tables. Raw output in trace.json.

| id | tool calls | result |
|---|---|---|
| t1 dirty air, Monza 2024 | list_races, dirty_air_cost | Right tool and id. Number right (7.28 s). **Wrong name:** called STR "Lewis Hamilton". STR is Stroll, not Hamilton. Missed the tie with MAG (both 7.282). |
| t2 consistency 2024 | driver_consistency | **Numbers not from the tool.** Said Hamilton 0.242 s is lowest. The rows show BOT at 0.173 s as lowest. **Grain problem:** the query returns one row per driver per race (200 rows), not per season, so "most consistent in 2024" needs a grouping the query does not do. |
| t3 constructors 2024 | constructor_pace | Right tool. McLaren first at -0.80 s, matching the row. Other numbers plausible; not checked against the rows one by one. |
| t4 explain dirty air | none | Reasonable explanation. Added "calculated from telemetry" and "driver skill" as exclusions without a source. |
| t5 braking, out of scope | none | Correct: no tool, no invented number. |

## What this says

1. The tool-choice part works: 3 of 3 data questions picked the right tool, and the out-of-scope question was refused.
2. Answers still invent things when a row list is long: names (t1) and numbers (t2). Passing raw rows is not enough.
3. The driver-consistency query grain does not match the question. The app page probably shows driver-race points, so the companion has to say so.
4. There is no driver name in the data. dim_drivers has only the code and number, so the model fills names from memory.
5. Ties are not shown (t1).

## Before finalising

- Return ranked rows with a `rank` field, the top 10 only, and a `grain` note for each tool (per driver-race or per season).
- Add a driver name map from the app (it may live in the app's features or docs, to be found).
- Scorer: check every number in the answer against the rows the tool returned, and check the tool name and ids against the call.
