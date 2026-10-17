# 01. Local model settings

Date: 2026-10-17. Status: current.

**Decision.** gpt-oss:20b via Ollama, temperature 0, num_predict 4096, num_ctx 20480 for trials.

**Why.** Runs on the M4 Pro (24 GB). Temperature 0 gave the same reasoning on repeat runs, so repeats test the prompt, not sampling. num_predict 4096 matched the earlier experiment. Context was raised after truncated replies; see experiments/2026-10-17-ollama-manual-trials/RESULTS.md.

**Open.** Whether the app uses 16k or 20k. Both avoided truncation.
