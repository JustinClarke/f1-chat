# Uncovered v2 with SQL cap

The master system prompt is unchanged, and so is the loop-stop sentence from PROTOCOL-loop-stop.md.

## Cap rule (run.mjs only)

- `MAX_SQL` env var, default 3. It counts SQL calls run per question.
- When the model asks for a tool call after 3 SQL calls have run, that call is not run. Its tool message is:
  > SQL limit reached; answer now from what you have, or say the data does not cover the question.
  Any other tool calls in the same turn get the same message.
- From then on the model is called without `tools`. Its next message is the final answer. If that message still
  contains tool calls, they are not run, and the answer is the message content, which can be empty.
- runs rows record `capped` and `max_sql`. The summary table has a `capped` column.

## Question set: uncovered_questions_v2.json

Proofs are in NOTES.md.

| id | question |
|---|---|
| u2_team_radio | What did Verstappen say on team radio after the 2024 Monaco Grand Prix? |
| u2_salary | How much was Hamilton's salary in 2024? |
| u2_tyre_pressure | What was Norris's front-left tyre pressure on lap 30 in Bahrain 2024? |

All three expect `kind: refusal`, and forbidden_names holds the question's own driver.

## Runs (from the repo root)

    QUESTIONS=uncovered_questions_v2.json RUNS_FILE=runs-uncovered-v2.jsonl SUMMARY_FILE=summary-uncovered-v2.md REPEATS=3 node experiments/04-companion-adapter/run.mjs

A cap check on the old braking-point question (it is answerable, so this run only tests the cap):

    QUESTIONS=uncovered_questions.json ONLY=u_braking_point RUNS_FILE=runs-capcheck-braking.jsonl SUMMARY_FILE=summary-capcheck-braking.md REPEATS=3 node experiments/04-companion-adapter/run.mjs

Result of the cap check: all 3 repeats were capped at 3 SQL calls (down from 6) and returned an empty answer. In the debug repeat,
the post-cap message had empty content and another run_sql tool call. The model's reasoning read the message as a row limit:
"The query exceeded limit? ... Let's add LIMIT 1."

Note: the final console line in run.mjs always prints `summary.md`. The file is actually written to SUMMARY_FILE.
