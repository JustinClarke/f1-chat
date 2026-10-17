# Handoff

Updated 2026-10-17. Replace this file at the end of each session; log the session in LOG.md.

## What it is
A browser chat that answers questions about 2024 F1 laps and results. A model writes DuckDB SQL through one tool, `run_sql`. DuckDB-WASM runs it in the browser on Parquet served by `server/serve-data.mjs` (port 8000). The model answers from the rows. Two model paths: Workers AI (via `worker/`) and a local model (gpt-oss:20b on Ollama, used only by the trial harness so far).

## Current state
- Working changes are uncommitted. This repo has no commits yet.
- Tables: `laps`, `results`, and `driver_seasons` (173 rows, 2018 to 2025, one per season and driver code; built in the data repo, exported to `off-the-pace/data/bronze/reference/drivers/driver_seasons.parquet`).
- `run_sql` returns up to 200 rows to the model (`ROW_CAP` in `web/src/chat.ts`). Model output cap is 8192 tokens (worker).
- Long lists: the app draws the table from the query result, not from the model's text. The typed list is stripped from the answer and a grid is shown under it.
- Table from query: `web/src/chat.ts` has `splitLongTable(text)`, which removes markdown tables of more than 15 data rows from the final answer. `ask()` keeps every `run_sql` result for the question and passes the matching one to `onTable`; `web/src/main.ts` draws it as an HTML grid under the answer text. Tested once in the browser on Q10 (grid drawn, typed list removed) and 3 times in the harness (all correct). Known gap: tab-separated lists (the model sometimes writes these) are not detected by the splitter, so they show as typed text.
- Charts: `web/src/chart.tsx` (React island, `mountChart`) uses Recharts; the model calls the `make_chart` tool. Bar and line only. Tested once in the browser (bar chart of wins per team).
- Rules in `web/src/chat.ts` (RULES block): call `run_sql`, no outside knowledge, only the filters named, count every lap row, state the reading when wording is ambiguous, add one sentence on what a chosen measure leaves out (added 17 Oct, untested), return all ties, names only from `driver_seasons`, chart rule, partial-table rule. The harness `trial2.mjs` RULES block matches the app on these.
- `npm run typecheck` and `npm run build` pass. Browser testing of questions 1-9 has not been done.
- Trial results: `experiments/2026-10-17-ollama-manual-trials/RESULTS.md`.

## How to run
From this repo, one terminal each:
1. `npm run data` (port 8000; set `DATA_ROOT=` to change the data folder)
2. `npm run worker` (port 8787, Workers AI; needs `npx wrangler whoami` login; free quota 10,000 neurons per day)
3. `npm run dev`, then open http://localhost:5173
4. `npm run typecheck`, `npm run build`

Trial harness: `experiments/2026-10-17-ollama-manual-trials/harness/trial2.mjs` (needs Ollama on :11434 with gpt-oss:20b) and `run_trials.py` (also needs duckdb in Python).

## Experiments layout
- `experiments/2026-10-15-prompt-variants/`: Workers AI grid, frozen.
- `experiments/2026-10-17-ollama-manual-trials/`: PROTOCOL.md, RESULTS.md, QUESTION_TYPES.md (per-type notes), `harness/` (trial scripts, scorer, truth.json), `ground-truth/` (gt*.cjs), `logs/`, `visuals/`.
- Index: experiments/README.md.

## Still open
- Q8 (consistency): the model names the measure but does not state the midfield caveat. The explanation rules were removed on 17 Oct; the new "what it leaves out" rule is untested on Q8.
- `web/src/explore.ts` still caps `run_sql` at 50 rows (the app's chat.ts uses 200).
- Browser testing of questions 1-9, including lap-level questions; check the rules do not over-filter.
- QUESTION_TYPES.md "Still open": the model prefers to write long tables itself and does not use `show_table`. Options: enforce the tool in code, or switch Q10 to a per-race count. Also listed under "Not yet run": ambiguous-definition question, qualifying vs race joins.
- Decide whether the local model path goes into the app (see decisions/); context window 16k vs 20k (unverified beyond RESULTS.md).
- Make the first commit once changes are reviewed.

## Questions tested
Every question run by hand, with expected answer and result: experiments/2026-10-17-ollama-manual-trials/RESULTS.md, section 5. The rules text itself is in web/src/chat.ts, not copied into docs.

## Open problems
See [known-issues.md](known-issues.md).
