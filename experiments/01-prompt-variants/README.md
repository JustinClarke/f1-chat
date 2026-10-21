# Experiment: prompt variants for the F1 chat app

Date: 2026-10-15. App commit: none (the repository /Users/justin/github/off-the-pace-chat has no commits yet; files are identified by SHA-256 in PROTOCOL.md). Status: complete, 80 of 80 runs finished (one process crash partway, resumed; see ISSUES.md).

Research question: does the amount and kind of data description in the system prompt change the correctness or latency of gpt-oss-20b answers on 2024 F1 data?

Setup in one paragraph: the app asks a model to write DuckDB SQL through one tool (run_sql) and answer from the rows. Four prompt variants differ only in the data-guide text (V0 none, V1 shorthand, V2 medium, V3 the full current guide). 4 questions x 4 variants x 5 repeats = 80 runs, order shuffled in blocks with seed 20261015. Model @cf/openai/gpt-oss-20b on Workers AI via the local Worker, temperature 0, reasoning effort "medium" requested (no observable effect, see DECISIONS.md), max_tokens 4096, row limit 50. Scoring is the repository's strict scorer (experiments/_shared/score.mjs).

Headline (details and caveats in results/summary.md): passes out of 20 were V0 12, V1 15, V2 15, V3 17. Differences are small for 5 repeats and mixed by question, so most pre-registered hypotheses were not supported. See results/summary.md and ISSUES.md before drawing conclusions.

Files
- PROTOCOL.md: written before any run. Hypotheses, variants, fixed settings, seed, design.
- DECISIONS.md: choices the protocol did not fix (row limit and rule text, temperature, reasoning, tokens).
- ISSUES.md: what went wrong, non-passing run causes, what could not be verified.
- HOW_TO_RERUN.md: exact commands.
- variants/: v0.txt to v3.txt, rule.txt (added to RULES in all variants), make_v3.mjs, HASHES.txt (SHA-256).
- questions/questions.json (+ questions.json.sha256): the 4 questions, ground-truth SQL and output, green-flag definition.
- results/summary.md: counts, medians. results/runs.jsonl: one line per run (all 80). results/pilot.jsonl: the pilot run (not part of the grid). results/grid.log: console log, including the crash trace. results/questions.sha256: checksum of experiments/_shared/questions.json. These are copies of the files in experiments/01-prompt-variants/results/ (not hard links).
- Code that produced this (in the repository, not copied here): experiments/01-prompt-variants/run_experiment.mjs, experiments/_shared/ground_truth.py, experiments/_shared/score.mjs, experiments/01-prompt-variants/variants/, and a small edit to worker/index.ts.

Rule added to every variant: - The rows returned by run_sql (at most 50 rows, plus row_count, the number of rows the query produced) are sent back to you as the tool result. Read them and use them directly in your answer, quoting values exactly. If row_count is above 50 only the first 50 rows are shown, so aggregate or filter in SQL instead.
