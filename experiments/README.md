# Experiments index

Each experiment folder has the same core files: PROTOCOL.md (what and why, written before the run), RESULTS.md (counts and examples), and any scripts used. Older folders may have extra files.

| Folder | Date | What | Status |
|---|---|---|---|
| [2026-10-15-prompt-variants](2026-10-15-prompt-variants/) | 15 Oct | Workers AI, 80 runs: four data-guide variants on four questions. Passes: 12, 15, 15, 17 of 20. | Complete. Frozen. Small differences, too few repeats to call. |
| [2026-10-17-ollama-manual-trials](2026-10-17-ollama-manual-trials/) | 17 Oct | Local gpt-oss:20b, hand-driven, one question at a time. Tested context size, tie rule, counting rule, name rule, the driver-season table, row and output caps, and table drawing. | Complete for the trials listed. Not repeated at scale. |

To add an experiment: make a dated folder, write PROTOCOL.md before running, record results in RESULTS.md, and add a row here and an entry in ../docs/LOG.md.
