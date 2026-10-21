# Repo layout decisions, 2026-10-19

Rule used: a file is archived only if a grep shows nothing live imports, reads or runs it. Moves were done with `git mv` (tracked) or `mv` (untracked). Nothing was deleted. Only the empty folders `eval/experiments/` and `eval/` were removed with `rmdir`, after their contents were moved. The pre-move manifests are in the session scratchpad (pre-git-status.txt, pre-files.txt).

Note: the brief said experiments 01 to 03 were under `eval/experiments/`. They were in fact in top-level `experiments/` with date names. Only 04 and 05 were under `eval/experiments/`.

## Experiments

| Old path | New path | Reason |
|---|---|---|
| experiments/2026-10-15-prompt-variants/ | experiments/01-prompt-variants/ | Numbered. Kept live, not archived, although STATUS.json calls it frozen, because 02's `run_trials.py` reads its `variants/v3.txt` by default. |
| experiments/2026-10-17-ollama-manual-trials/ | experiments/02-ollama-manual-trials/ | Numbered |
| experiments/2026-10-18-prompt-rewrite/ | experiments/03-prompt-rewrite/ | Numbered |
| eval/experiments/2026-10-19-companion-adapter/ | experiments/04-companion-adapter/ | Numbered (untracked, `mv`) |
| eval/experiments/2026-10-19-app-queries/ | experiments/05-app-queries/ | Numbered (untracked, `mv`) |
| (new) | experiments/06-session-handoff-2026-10-19/ | SESSION.md and this file |

## Eval files

| Old path | New path | Reason |
|---|---|---|
| eval/score.mjs | experiments/_shared/score.mjs | Imported by 01 run_experiment.mjs, 03 tools (probe, sql, app_ask, app_types), 04 run.mjs and run_eval.mjs |
| eval/score.test.mjs | experiments/_shared/score.test.mjs | Tests the shared scorer; reads `./questions.json` |
| eval/questions.json | experiments/_shared/questions.json | Read by run_eval.mjs, 01 run_experiment.mjs (hash-checked), 03 tools/probe.mjs and app_ask.mjs, and score.test.mjs. One copy, not one per experiment, because 01's runner checks its SHA-256 and a copy could drift |
| eval/ground_truth.py | experiments/_shared/ground_truth.py | Writes questions.json next to itself |
| eval/run_eval.mjs | experiments/_shared/run_eval.mjs | `npm run eval`; its logs are cited by 02 and 03 |
| eval/logs/2026-10-17*, 2026-10-18* | experiments/_shared/logs/ | Output of run_eval.mjs; cited by 02 trials-log.json, 03 README and STATUS.json |
| eval/ollama/Modelfile | experiments/_shared/ollama/Modelfile | Used by the app's quick start (README) and by 02 and 03. No better home without a new top-level folder |
| eval/run_experiment.mjs | experiments/01-prompt-variants/run_experiment.mjs | 01's runner. Now reads 01's results/ and variants/, and _shared questions and scorer |
| eval/companion_questions.json | experiments/04-companion-adapter/companion_questions.json | Only 04 run.mjs reads it |

## Archive

| Old path | New path | Reason |
|---|---|---|
| eval/experiment/ | _archive/eval-legacy/experiment/ | Byte-identical copy of 01's results/ plus PROTOCOL.md (identical to 01's). Only the runner used it, and the runner now points at 01/results |
| eval/variants/ | _archive/eval-legacy/variants/ | Identical subset of 01's variants/ (01 also has v4.txt and HASHES.txt) |
| eval/results-2026-10-14T*.json (2) | _archive/eval-legacy/ | Pre-runner output; cited only by archived docs |
| eval/logs/2026-10-14T* (2) | _archive/eval-legacy/logs/ | 14 Oct logs; cited only by archived docs |
| eval/.DS_Store | _archive/eval-legacy/.DS_Store | Ignored Finder file; moved, not deleted |
| docs/archive/ | _archive/docs/ | As asked; includes the staged HANDOFF and LOG renames |

No experiment went to `_archive/experiments/` (see 01 above).

## Kept in place

package.json, package-lock.json, tsconfig.json, wrangler.toml, web/, server/, worker/, docs/ (README, STATUS.json, known-issues.md, decisions/), node_modules, .venv, .wrangler.

## References not changed on purpose

Historical records keep their old paths: everything under `_archive/`, `experiments/_shared/logs/*/summary.md`, 01's `results/` and `questions/`, 04's run summaries, runs and traces, and the archived code in `03-prompt-rewrite/archive/` and `02-ollama-manual-trials/archive/`. Read old `eval/...` paths in them with the tables above.
