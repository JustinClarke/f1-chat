# Companion adapter baseline

Model: gpt-oss:20b-f1. Repeats: 3. Questions: 8 (contested items skipped). SQL cap: 3.
Passes: 18 of 24.

| id | use case | verdict | sql | errors | capped |
|---|---|---|---|---|---|
| c3_quadrant | 3 | pass | 0 | 0 | no |
| c3_quadrant | 3 | pass | 0 | 0 | no |
| c3_quadrant | 3 | pass | 0 | 0 | no |
| c3_std_dev | 3 | pass | 0 | 0 | no |
| c3_std_dev | 3 | pass | 0 | 0 | no |
| c3_std_dev | 3 | pass | 0 | 0 | no |
| c3_crosshairs | 3 | pass | 0 | 0 | no |
| c3_crosshairs | 3 | pass | 0 | 0 | no |
| c3_crosshairs | 3 | pass | 0 | 0 | no |
| c1_soft_stints | 1 | fail | 1 | 0 | no |
| c1_soft_stints | 1 | fail | 1 | 0 | no |
| c1_soft_stints | 1 | fail | 1 | 0 | no |
| c1_most_stints_driver | 1 | pass | 1 | 0 | no |
| c1_most_stints_driver | 1 | pass | 1 | 0 | no |
| c1_most_stints_driver | 1 | pass | 1 | 0 | no |
| c1_races_in_stints | 1 | pass | 1 | 0 | no |
| c1_races_in_stints | 1 | pass | 1 | 0 | no |
| c1_races_in_stints | 1 | pass | 1 | 0 | no |
| c1_lap_rows_2024 | 1 | fail | 0 | 0 | no |
| c1_lap_rows_2024 | 1 | fail | 0 | 0 | no |
| c1_lap_rows_2024 | 1 | fail | 0 | 0 | no |
| c1_constructor_resid | 1 | pass | 1 | 0 | no |
| c1_constructor_resid | 1 | pass | 1 | 0 | no |
| c1_constructor_resid | 1 | pass | 1 | 0 | no |
