# Experiments index

Folders are numbered so they stay in order. Each experiment folder carries its own eval files: PROTOCOL.md (what and why, written before the run), RESULTS.md or FINDINGS.md (counts and examples), and any scripts and question sets used. Older folders may have extra files.

Code that two or more experiments use lives in [_shared/](_shared/): the scorer (`score.mjs`) and its tests (`score.test.mjs`), the app eval runner behind `npm run eval` (`run_eval.mjs`, logs in `_shared/logs/`), its questions (`questions.json`, frozen by the hash in `01-prompt-variants/results/questions.sha256`) and `ground_truth.py`, and the Ollama Modelfile. Retired material is in [../_archive/](../_archive/).

| Folder | Date | What | Status |
|---|---|---|---|
| [01-prompt-variants](01-prompt-variants/) | 15 Oct | Workers AI, 80 runs: four data-guide variants on four questions. Passes: 12, 15, 15, 17 of 20. Runner: run_experiment.mjs. | Complete. Frozen. Small differences, too few repeats to call. Kept here (not archived) because 02's run_trials.py reads its variants/v3.txt. |
| [02-ollama-manual-trials](02-ollama-manual-trials/) | 17 Oct | Local gpt-oss:20b, hand-driven, one question at a time. Tested context size, tie rule, counting rule, name rule, the driver-season table, row and output caps, and table drawing. | Complete for the trials listed. Not repeated at scale. |
| [03-prompt-rewrite](03-prompt-rewrite/) | 17-18 Oct | Rewrite of the app prompt (fix-agent guide), with candidates, archived prompts and probe tools. Scored with _shared/run_eval.mjs. | Complete. Guide on 12/13, off 5/13 (19:47 run, 17 Oct). |
| [04-companion-adapter](04-companion-adapter/) | 19 Oct | Companion harness (run.mjs) and read-only adapter (adapter.mjs) on the gold Parquet, three views, companion_questions.json, DATA_MAP.md and ERD_FULL.md. | In progress. Plain raw 24/24, views 21/24, braking 0/3. |
| [05-app-queries](05-app-queries/) | 20 Oct | Spike: the app's own SQL as tools (tools.mjs, run_tools.mjs), two rounds on five questions, n=1. | Spike done. See FINDINGS.md and FINDINGS-round2.md. |
| [06-session-handoff-2026-10-19](06-session-handoff-2026-10-19/) | 20 Oct | Session handoff (SESSION.md) and the repo layout decisions (LAYOUT.md). | Notes only. |

To add an experiment: make the next numbered folder, write PROTOCOL.md before running, record results in RESULTS.md, add a row here, and add a session_log entry in ../docs/STATUS.json.
