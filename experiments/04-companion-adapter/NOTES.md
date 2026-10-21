# Uncovered question set v2: proof of non-coverage

Why v2: `u_braking_point` in uncovered_questions.json is probably answerable. `int_corner_metrics` has
`braking_point_m` keyed by driver_id, race_id, race_year, corner_name, lap_number. So it is not used as an uncovered question.

Method (2026-10-19): open the adapter, run `DESCRIBE SELECT * FROM <t>` for all 39 manifest tables (715 columns), and match each
column name against a concept regex. Then, for every VARCHAR column that is not an id, count the rows whose lowercased
value matches a value regex. The manifest (`_manifest.json`, 68 KB) was also searched for the concept words.

| question id | column-name regex | name hits | value regex (VARCHAR cols) | value hits | manifest hits |
|---|---|---|---|---|---|
| u2_team_radio | `radio\|transcript\|message\|comms\|quote\|said\|audio` | 0 | `radio\|transcript\|message` | 0 | radio 0, transcript 0, message 0 |
| u2_salary | `salar\|wage\|pay\|contract\|earn\|income\|usd\|eur\|money\|bonus\|fee\|cost_usd` | 0 | `salar\|wage\|contract\|paid\|million` | 0 | salar 0, wage 0, contract 0, earn 0, pay 0 |
| u2_tyre_pressure | `pressure\|psi\|kpa\|\bbar\b\|_bar\|inflat` | 0 | `pressure\|psi` | 0 | pressure 0, psi 0 |

Near misses checked and rejected as candidates:
- Fuel load: `fuel_mass_kg` exists in fct_lap_residuals and fct_cliff_prediction_features, so it is covered.
- Weather: `track_temp_c`, `humidity_pct`, `rainfall_flag` exist in int_track_evolution, so "weather" is partly covered and was avoided.
- Tyre temperature: no per-lap tyre temperature column. But `compound_optimal_temp_low/high` and `temp_headroom_c` exist and could confuse a grader, so it was not used.
- Top speed: no speed-trap column (only `v_min_kph` and `max_rpm`). Not reused, to keep v2 independent of v1.

forbidden_names: kept. The scorer (experiments/_shared/score.mjs, kind=refusal) gives "check manually" for a refusal that names a driver, not "fail".
So a clean refusal is never marked as failing. Whether "check manually" should count as a pass is still open for the user.
