# Session handoff, 2026-10-19

A plain account of this session for someone who was not in the chat. The status file is [../../docs/STATUS.json](../../docs/STATUS.json); this note is its long form.

Related folders:
- [../04-companion-adapter/](../04-companion-adapter/): adapter, harness, views, [DATA_MAP.md](../04-companion-adapter/DATA_MAP.md), [ERD_FULL.md](../04-companion-adapter/ERD_FULL.md)
- [../05-app-queries/](../05-app-queries/): the app-query tool spike, [FINDINGS.md](../05-app-queries/FINDINGS.md), [FINDINGS-round2.md](../05-app-queries/FINDINGS-round2.md)
- Earlier work: [../01-prompt-variants/](../01-prompt-variants/), [../02-ollama-manual-trials/](../02-ollama-manual-trials/), [../03-prompt-rewrite/](../03-prompt-rewrite/)
- Shared scorer and app eval: [../_shared/](../_shared/)
- Repo layout decisions from this session: [LAYOUT.md](LAYOUT.md)

## Goal

A companion for the off-the-pace React app that can:
1. drive the app (open and redirect to pages),
2. explain what the user is looking at, from the Mintlify docs and the page methodology,
3. answer data questions and show the data it used.

## Decisions taken

- **The app stays read-only.** No edits in off-the-pace.
- **The companion reads the app's exports**, not its own copy of the data.
- **The app's own SQL is the tools.** The companion calls the app's queries (`app/src/features/*/queries.ts`) as tools, instead of the model writing SQL.
- **Names are kept in a companion-side map** (`05-app-queries/driver_names.json`), not added to the app.
- **The schema prompt is skipped in the tool spike.** The model sees only the tool definitions.

## Data findings (DATA_MAP.md, ERD_FULL.md)

- 39 tables in the manifest, plus 3 views added by the adapter (`v_corners`, `v_stints`, `v_driver_season_skill`).
- 11 table folders in the bucket are not in the manifest (left over from no-delete publishing). The Query Lab only registers manifest names, so the model cannot reach them.
- Largest table: `fct_telemetry_deltas`, 28.6 M rows (28,628,356); next `int_corner_metrics`, 3.0 M.
- dbt side, from the chat: 94 dbt models, 39 exported, 59 not exported; 4 exported tables have no dbt model file.

## Join checks

- Key uniqueness (rows equal distinct keys) checked on the dimension and main fact tables: `dim_drivers.driver_id`, `dim_constructors.constructor_id`, `race_to_track.race_id`, `dim_circuits.circuit_key`, `dim_events.event_id`, `fct_stint_features.stint_id`, `fct_lap_residuals.lap_id`, `fct_driver_skill_features.driver_race_id`, and the two `int_constructor_structural_pace*` tables. `int_corner_metrics` is unique on (`driver_id`, `race_id`, `lap_number`, `corner_name`) over 3,036,871 rows.
- Verified edges include: `fct_stint_features.race_id` to `race_to_track` (9,374 of 9,374), `fct_stint_features.driver_id` to `dim_drivers` (9,374 of 9,374), `race_to_track.track_id = dim_circuits.circuit_key` (173), `fct_driver_skill_features.circuit_key` to `dim_circuits` (3,312 of 3,312). The full edge list is in ERD_FULL.md, "Verified key links".
- Trap: `dim_circuits.circuit_id` matches nothing in `race_to_track`. Join on `circuit_key`.

## dbt audit (from the chat)

- No contract enforcement on the models.
- No model versions.
- The export list is hard-coded.
- `race_to_track` has no uniqueness test, although its key is unique in the data.

## Navigation and shared-model findings (from the chat)

- The route list (`app/src/nav/routes.ts`) and the router are separate, so a route in the list is not proof that the page is routed.
- 15 pages read URL filters, so the navigate tool can open some pages already filtered (this answers open question 1 in part; the list of pages is not in this repo).
- The methodology text is in both JSX and mdx, so the explain feature has two sources that can drift.

## Spike results (05-app-queries)

- The tool approach works for choosing the right tool: 3 of 3 data questions picked the right tool, and the braking question was refused with no number.
- The answers still invent names and numbers when the row list is long (round 1: Stroll called "Lewis Hamilton"; consistency numbers not from the rows). Round 2 (name map, rank, top 10) fixed those, but t2 added invented "first race / second race" labels and t3 called Mercedes slower than average when it was faster.
- The consistency query is per driver per race, not per season, so "most consistent in 2024" needs a grouping the query does not do.
- The grain note did not help at n=1.

## The five questions (exact text)

1. "Who lost the most time to dirty air at Monza in 2024?"
2. "Which drivers were the most consistent in 2024?"
3. "How did the constructors compare on pace across 2024?"
4. "What does the dirty air cost measure, and what does it leave out?"
5. "What was Verstappen's braking point into Turn 1 at Monza in 2024?"

## Open decisions

- The braking definition (open question 7 in STATUS.json): one lap, a mean, or something else.
- Whether the consistency query gets a season-level version (open question 13).
- Whether the scorer should accept rounded numbers (open question 14).

## Not verified

- The driver names in `05-app-queries/driver_names.json` are from memory, not from a source.
- One run per question (n=1) in both spike rounds, so differences between runs are anecdotes.
- The 11 unlisted bucket folders were not opened.
- The dbt audit numbers (94 / 39 / 59 / 4), the dbt audit points and the navigation findings come from the chat. They are not recorded in a file in this repo, and this note did not re-check them against off-the-pace.
