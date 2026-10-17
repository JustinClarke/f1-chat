# Handoff

Updated 2026-10-18. Replace this file at the end of each session. Prompt-work detail is in `experiments/2026-10-18-prompt-rewrite/` (README, FINDINGS, TRIALS).

## What it is
A browser chat that answers questions about 2024 F1 laps and results. The model writes DuckDB SQL through `run_sql`. DuckDB-WASM runs the SQL in the browser on Parquet served by `server/serve-data.mjs` (port 8000). The model answers from the rows, and can call `make_chart` (bar or line).

## How the app gets its model
- Default is the local model: `gpt-oss:20b-f1` on Ollama (port 11434), built from `eval/ollama/Modelfile` (20k context, 8k output).
- `VITE_PROVIDER=cloudflare npm run dev` sends chats to the Worker (`worker/`), which calls Workers AI. The free daily quota (10,000 neurons) ran out on 17 Oct, so the Worker returns error 4006 until it resets.
- The RULES block is gone from `web/src/chat.ts`. All behaviour rules live in `DATA_GUIDE` in `web/src/dataGuide.ts`. With the guide off, the model gets only the opening line, the tools and the schema.

## Current state
- App prompt: the fix-agent guide in `web/src/dataGuide.ts`. Its eval run (19:47, `eval/logs/2026-10-17T19-47-56-938Z/`) passes 12 of 13 with the guide on. Guide off, 5 of 13.
- Only Bahrain pace fails with the guide on. The model's answer is right (96.537 s), but the scorer expects 96.5365 to the 4th decimal. Scorer issue, not model.
- Guide off regressions: Monaco laps, top compound and wins by driver all fail.
- Commit `41666a8` (23:24, 17 Oct) holds the earlier prompt work. The fix-agent guide, the trial-log entries and the archive folder are not committed yet.

## Known problems, in priority order
1. **Chart can't show two drivers.** `make_chart` takes one x and one y and has no series option. Asking for Verstappen vs Norris lap times draws one line that zigzags, with no legend. Pit laps (about 115 to 118 s) are not excluded.
2. **Braking and other non-data questions** should get "the data doesn't cover it", and the app should not chart anything. Not yet tested in the browser.
3. **Unanswerable questions** sometimes name a driver while refusing (guide off).
4. **Unsettled Q10 count**: 138 (classified finishers lapped, per the notes) vs 144 (a recount). The data has exactly 138 rows with status 'Lapped'.
5. **Q7 chart** (points by driver) is checked only by its text, not the drawn bars.
6. **Scorer**: Bahrain rounding; "Seven" written as a word is now accepted.

## Next steps (agreed direction, not built)
- A **series option on `make_chart`** (a column to split by, with a legend), so multi-line charts work in general.
- A **custom lap-comparison tool**, e.g. `compare_lap_times(race, driver_a, driver_b)`, that runs fixed SQL, excludes pit laps and returns both series. Use it for driver comparisons; `run_sql` stays the fallback.
- A **declarative chart spec** (series, colours, axis labels, reference lines) rendered by Recharts. Do not let the model write Recharts or JSX code.
- Re-run the 14-question eval after any prompt change, guide on and off, and check the chart questions by hand in the browser.

## How to run
From this repo, one terminal each:
1. `npm run data` (port 8000)
2. `npm run dev` (port 5173). Open http://localhost:5173.
3. Ollama running with `gpt-oss:20b-f1` (`ollama create gpt-oss:20b-f1 -f eval/ollama/Modelfile` once).
4. Optional, for the Cloudflare path: `npm run worker` (port 8787), with `VITE_PROVIDER=cloudflare`.

Eval (local model): `LLM_URL=http://localhost:11434/v1 LLM_MODEL=gpt-oss:20b-f1 REPEATS=1 GUIDE=on,off npm run eval`. Logs go to `eval/logs/`.

Checks: `npm run typecheck`, `npm run build`, `node --test eval/score.test.mjs`.

## Experiments
- `experiments/2026-10-15-prompt-variants/`: earlier Workers AI prompt grid (frozen).
- `experiments/2026-10-17-ollama-manual-trials/`: hand-run questions and trial log (`status/trials-log.json`).
- `experiments/2026-10-18-prompt-rewrite/`: this session's prompt rewrite, with archived prompts and tools.

## Watch out for
- Ollama's `/v1` endpoint cannot set context size per request. That's why `eval/ollama/Modelfile` bakes in `num_ctx 20480`. Without it, prompts were silently cut to 4096 tokens.
- The `driver_seasons` table covers 2018 to 2025. Always join it with `season = 2024`, or totals multiply by 8.
- Ollama's gpt-oss sometimes calls tools that don't exist (e.g. `container.exec`). The app should return an error to the model rather than crash. Not fixed yet.
