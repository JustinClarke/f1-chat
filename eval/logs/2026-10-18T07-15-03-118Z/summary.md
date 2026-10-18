# Eval run 2026-10-18T07-15-03-118Z

Model: `ollama:gpt-oss:20b-f1` (from wrangler.toml (the Worker's default)). Repeats: 1. Full detail per run: `runs.jsonl` (one line per run; `run_id` is the key).

Scorer: all expected values (from ground_truth.py) must appear in the answer; numbers are exact (commas, spaces, 1:21.432 times and ns handled); names whole-word; unanswerable needs a refusal and no driver name. See eval/score.mjs.

## Pass counts (pass / runs)

| question | guide on |
|---|---|
| wins_driver | 1/1 |
| wins_team | 1/1 |
| team_wins_and_points | 1/1 |
| distinct_winners | 1/1 |
| races_count | 1/1 |
| poles | 1/1 |
| points_driver | 1/1 |
| points_team | 1/1 |
| fastest_monza | 1/1 |
| nor_monaco_laps | 1/1 |
| top_compound | 1/1 |
| bahrain_clean_pace | 0/1 |
| unanswerable | 1/1 |

## Every run

| question | config | #1 |
|---|---|---|
| wins_driver | guide on | PASS |
| wins_team | guide on | PASS |
| team_wins_and_points | guide on | PASS |
| distinct_winners | guide on | PASS |
| races_count | guide on | PASS |
| poles | guide on | PASS |
| points_driver | guide on | PASS |
| points_team | guide on | PASS |
| fastest_monza | guide on | PASS |
| nor_monaco_laps | guide on | PASS |
| top_compound | guide on | PASS |
| bahrain_clean_pace | guide on | FAIL |
| unanswerable | guide on | PASS |

## Non-passing runs (1)

### bahrain_clean_pace|guide=on|notes=off|rep=1 -> FAIL
- Question: In the 2024 Bahrain Grand Prix, who had the faster race pace, Verstappen or Norris? Use only green-flag laps, excluding in-laps, out-laps and deleted laps. Give the median lap time for each.
- Expected: faster driver=Verstappen/VER/Max Verstappen, median lap NOR=1:36.537 (96.537s), median lap VER=1:35.477 (95.477s)
- Why: missing: median lap NOR (1:36.537 = 96.5365s)
- Parsed from answer: numbers [95.477,96.537], times(s) []
- Answer: VER: 95.477 s median lap time NOR: 96.537 s median lap time
- SQL 1: `WITH green_laps AS ( SELECT Driver, LapTime FROM laps WHERE session='R' AND race ILIKE '%bahrain%' AND TrackStatus='1' AND PitInTime IS NULL AND PitOutTime IS NULL AND Deleted=FALSE ) SELECT Driver, round(percentile_cont(0.5) within group (order by LapTime)/1e9, 3) AS median_lap_s FROM green_laps WHERE Driver IN ('VER','NOR') GROUP BY Driver ORDER BY Driver;` -> 2 rows [{"Driver":"NOR","median_lap_s":96.537},{"Driver":"VER","median_lap_s":95.477}]
- Details: `jq 'select(.run_id=="bahrain_clean_pace|guide=on|notes=off|rep=1")' runs.jsonl` (2 Worker calls, 9.6s)
