# Loop-stop sentence

Added to the master system prompt in run.mjs (one sentence, no other rules):

> If a query returns no rows or fails, do not try variations of it; answer that the data does not cover the question.

Run from the repo root:

    QUESTIONS=uncovered_questions.json RUNS_FILE=runs-uncovered-loop.jsonl SUMMARY_FILE=summary-uncovered-loop.md REPEATS=3 node experiments/04-companion-adapter/run.mjs
    RUNS_FILE=runs-plain-final.jsonl SUMMARY_FILE=summary-plain-final.md REPEATS=3 node experiments/04-companion-adapter/run.mjs

Default plain schema (SCHEMA_VALUES unset).
