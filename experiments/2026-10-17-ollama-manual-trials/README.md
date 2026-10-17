# Ollama manual trials (2026-10-17)

Chat work moved here from the scratchpad.

- harness/ : trial scripts (trial.mjs, trial2.mjs with the ROW_CAP env var and show_table stub), score.mjs, q10check.mjs, truth.json
- ground-truth/ : gt.cjs to gt12.cjs, scripts that compute the true answers
- logs/ : output of each trial run (run_*.log)
- visuals/ : row_cap_visual.html and consistency_chart.html

## Before running the harnesses

The trial scripts import the node duckdb package from an absolute scratchpad path:
/private/tmp/claude-501/-Users-justin-github--misc--chat-off-the-pace-chat/1ef65478-7cd0-4696-90a1-ad4d4aabced1/scratchpad/node_modules/duckdb

That path no longer exists for a fresh checkout. Either fix the import paths or install duckdb under the project, then run.

The harness files are unedited copies.

Note: the scripts in harness/ import the duckdb package from an absolute scratchpad path (old scratchpad folder 1ef65478-7cd0-4696-90a1-ad4d4aabced1). This must be fixed before running on another machine.
