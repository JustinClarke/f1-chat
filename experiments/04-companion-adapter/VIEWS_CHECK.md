# Views check (2026-10-19)

Views are defined in adapter.mjs and created on open when VIEWS=on. Checked with in-memory DuckDB over the gold Parquet.

| view | rows | source rows | source |
|---|---|---|---|
| v_corners | 3,036,871 | 3,036,871 | int_corner_metrics |
| v_stints | 9,374 | 9,374 | fct_stint_features |
| v_driver_season_skill | 3,312 | 3,312 | fct_driver_skill_features |

No difference in any count, so no fan-out. Causes: race_to_track has 173 rows and 173 distinct race_id; dim_drivers has 43 rows and 43 distinct driver_id. Further: no duplicate (driver_id, race_id, corner_name, lap_number) in source or view; fct_stint_features.stint_id and fct_driver_skill_features.driver_race_id are unique.

Join failures (rows with no dimension match; expected 0):
- int_corner_metrics.race_id vs race_to_track: 0
- fct_stint_features.race_id vs race_to_track: 0
- fct_stint_features.driver_id vs dim_drivers: 0
- fct_driver_skill_features.race_id vs race_to_track: 0
- int_corner_metrics.track_id <> race_to_track.track_id: 0
- v_driver_season_skill rows where track_id <> circuit_key: 0
- NULL driver_number/track_id in v_stints, NULL race_name/track in v_corners: 0

Other observations
- race_name: no source table has a race name. race_to_track has only race_id and track_id, and dim_events has no rows for 2024_16. race_name is derived from track_id (italian_grand_prix -> "Italian Grand Prix"). dim_circuits.circuit_name ("Autodromo Nazionale Monza") is a circuit name and was not joined.
- v_corners.corner_name: Turn_1 -> "Turn 1". Raw values otherwise kept (NULL throttle_point_m is common).
- v_stints.compound: stored uppercase; 9 values including NULL (SOFT, MEDIUM, HARD, INTERMEDIATE, WET, SUPERSOFT, ULTRASOFT, HYPERSOFT).
- DATA_MAP.md problem: its mermaid says int_corner_metrics has `track_id`, correct, but the join table calls the 173 match for race_to_track.track_id = dim_circuits.circuit_key "173"; that is 173 race rows over only 36 distinct track_ids (44 circuits). Not an error, but it is a row count of races, not circuits. DATA_MAP.md also does not mention that no race name column exists.

Verstappen, Monza 2024, Turn 1 (race_id 2024_16): the data is per lap (53 rows, braking_point_m 630.51 to 788.30). Mean:
`SELECT round(avg(braking_point_m),2) FROM v_corners WHERE driver_id='VER' AND race_id='2024_16' AND corner_name='Turn 1'` = 748.14
