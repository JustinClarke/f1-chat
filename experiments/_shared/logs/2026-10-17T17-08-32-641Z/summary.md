# Eval run 2026-10-17T17-08-32-641Z

Model: `ollama:gpt-oss:20b` (from wrangler.toml (the Worker's default)). Repeats: 1. Full detail per run: `runs.jsonl` (one line per run; `run_id` is the key).

Scorer: all expected values (from ground_truth.py) must appear in the answer; numbers are exact (commas, spaces, 1:21.432 times and ns handled); names whole-word; unanswerable needs a refusal and no driver name. See eval/score.mjs.

## Pass counts (pass / runs)

| question | guide on |
|---|---|
| wins_driver | 0/1 |

## Every run

| question | config | #1 |
|---|---|---|
| wins_driver | guide on | FAIL |

## Non-passing runs (1)

### wins_driver|guide=on|notes=off|rep=1 -> FAIL
- Question: Who won the most races in 2024, and how many?
- Expected: driver=Max Verstappen/Verstappen, wins=9
- Why: missing: driver (Max Verstappen/Verstappen); wins (9)
- Parsed from answer: numbers [], times(s) []
- Answer: I’m ready to help—please let me know what you’d like to find out about the race or the drivers.
- SQL 1: `{"cmd":["bash","-lc","python - \u003c\u003c 'PY'\nimport duckdb, json, os, sys, textwrap, pathlib, subprocess, sys, shlex, io\nconn = duckdb.connect(database=':memory:', read_only=False)\n# Load tables? We don't have actual data tables, but assume they exist.\nPY"]}` -> ERROR Cannot read properties of undefined (reading 'trim')
- Details: `jq 'select(.run_id=="wins_driver|guide=on|notes=off|rep=1")' runs.jsonl` (2 Worker calls, 27.2s)
