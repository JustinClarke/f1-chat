# Log

Newest first. One short entry per session: what changed, what was learned, where the detail is.

## 2026-10-17
- Ran manual trials on gpt-oss:20b locally (Ollama, 16k then 20k context). Tie rule, counting rule, name rule and a driver-season table tested on the Bahrain pit-stop question and the Monaco laps question. Details: experiments/2026-10-17-ollama-manual-trials/RESULTS.md.
- Built `dim_driver_seasons` (dbt, data repo) and exported it for the app. Tests pass.
- Folded the rules, the table and its data-guide entry into the app. Typecheck passes. Not browser-tested.
- Restructured these docs. Old HANDOFF and BUILD_LOG moved to docs/archive/.
- Later 17 Oct: row cap 200 and output cap 8192; the table is now drawn from the query result. Explanation rules were tried and removed (Q8 caveat unresolved). Added one rule, "add one sentence on what the measure leaves out", to the app and harness; not tested. Fixed two rules sharing one line in chat.ts. Typecheck and build pass. No reruns.
- Table-from-query fix: `splitLongTable` in chat.ts strips tables over 15 data rows; the matching `run_sql` result is drawn as a grid. Browser-tested on Q10; 3 harness runs correct. Tab-separated lists not detected.
- Recharts integration: `web/src/chart.tsx`, `make_chart` tool, bar and line. Browser-tested once (wins per team).
- Local logs (Q10, Q8 limit runs, pasted app grid) and a splitter check script copied into the experiment folder.

## 2026-10-15
- Workers AI prompt-variant grid (80 runs). Results in experiments/2026-10-15-prompt-variants/. Old handoff and build log: docs/archive/.
