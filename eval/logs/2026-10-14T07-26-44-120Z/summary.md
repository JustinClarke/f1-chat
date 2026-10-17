# Eval run 2026-10-14T07-26-44-120Z

Model: `@cf/openai/gpt-oss-20b` (from wrangler.toml (the Worker's default)). Repeats: 1. Full detail per run: `runs.jsonl` (one line per run; `run_id` is the key).

Scorer: all expected values (from ground_truth.py) must appear in the answer; numbers are exact (commas, spaces, 1:21.432 times and ns handled); names whole-word; unanswerable needs a refusal and no driver name. See eval/score.mjs.

## Pass counts (pass / runs)

| question | guide on | guide off |
|---|---|---|
| wins_team | 0/1 | 0/1 |

## Every run

| question | config | #1 |
|---|---|---|
| wins_team | guide on | ERROR |
| wins_team | guide off | ERROR |

## Non-passing runs (2)

### wins_team|guide=on|notes=off|rep=1 -> ERROR
- Question: Which team won the most races in 2024, and how many?
- Expected: team=Red Bull Racing/Red Bull, wins=9
- Why: infrastructure error: Error: AiError: 4006: you have used up your daily free allocation of 10,000 neurons, please upgrade to Cloudflare's Workers Paid plan if you would like to continue usage.
- Parsed from answer: numbers [4006,10000], times(s) []
- Answer: Gave up: Error: AiError: 4006: you have used up your daily free allocation of 10,000 neurons, please upgrade to Cloudflare's Workers Paid plan if you would like to continue usage.
- The model ran no SQL.
- Details: `jq 'select(.run_id=="wins_team|guide=on|notes=off|rep=1")' runs.jsonl` (1 Worker calls, 0.7s)

### wins_team|guide=off|notes=off|rep=1 -> ERROR
- Question: Which team won the most races in 2024, and how many?
- Expected: team=Red Bull Racing/Red Bull, wins=9
- Why: infrastructure error: Error: AiError: 4006: you have used up your daily free allocation of 10,000 neurons, please upgrade to Cloudflare's Workers Paid plan if you would like to continue usage.
- Parsed from answer: numbers [4006,10000], times(s) []
- Answer: Gave up: Error: AiError: 4006: you have used up your daily free allocation of 10,000 neurons, please upgrade to Cloudflare's Workers Paid plan if you would like to continue usage.
- The model ran no SQL.
- Details: `jq 'select(.run_id=="wins_team|guide=off|notes=off|rep=1")' runs.jsonl` (1 Worker calls, 0.2s)
