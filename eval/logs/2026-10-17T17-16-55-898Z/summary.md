# Eval run 2026-10-17T17-16-55-898Z

Model: `ollama:gpt-oss:20b` (from wrangler.toml (the Worker's default)). Repeats: 1. Full detail per run: `runs.jsonl` (one line per run; `run_id` is the key).

Scorer: all expected values (from ground_truth.py) must appear in the answer; numbers are exact (commas, spaces, 1:21.432 times and ns handled); names whole-word; unanswerable needs a refusal and no driver name. See eval/score.mjs.

## Pass counts (pass / runs)

| question | guide on |
|---|---|
| wins_driver | 0/1 |

## Every run

| question | config | #1 |
|---|---|---|
| wins_driver | guide on | ERROR |

## Non-passing runs (1)

### wins_driver|guide=on|notes=off|rep=1 -> ERROR
- Question: Who won the most races in 2024, and how many?
- Expected: driver=Max Verstappen/Verstappen, wins=9
- Why: infrastructure error: Error: [object Object]
- Parsed from answer: numbers [], times(s) []
- Answer: Gave up: Error: [object Object]
- The model ran no SQL.
- Details: `jq 'select(.run_id=="wins_driver|guide=on|notes=off|rep=1")' runs.jsonl` (1 Worker calls, 6.4s)
