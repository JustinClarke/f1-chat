# How to rerun (written 2026-10-15)

Needs Node 20+, `npm i` done, the Parquet data at /Users/justin/github/off-the-pace/data (read only), and a Cloudflare login for Wrangler (run `npx wrangler whoami` to check; if not logged in, run `npx wrangler login` yourself). Do not run `wrangler deploy`. Workers AI usage counts against your daily free neuron allowance (the full grid used about 8,000 of 10,000).

All commands from /Users/justin/github/off-the-pace-chat.

1. Start the data server (terminal 1): `npm run data`   (port 8000)
2. Start the Worker (terminal 2): `npm run worker`   (port 8787; wait for "Ready on http://localhost:8787")
3. Regenerate v3.txt from the current guide (optional, the runner checks it): `node experiments/01-prompt-variants/variants/make_v3.mjs`
4. Pilot, one run (V3, bahrain_clean_pace), written to experiments/01-prompt-variants/results/pilot.jsonl: `PILOT=1 node experiments/01-prompt-variants/run_experiment.mjs`
   Other pilot: `PILOT=1 PILOT_V=v1 PILOT_Q=wins_team node experiments/01-prompt-variants/run_experiment.mjs`
5. Full grid, written to experiments/01-prompt-variants/results/runs.jsonl: run in batches because each process leaks memory:
   `for i in 1 2 3 4 5 6; do MAX_RUNS=14 node experiments/01-prompt-variants/run_experiment.mjs; done`
   The runner skips run ids already in runs.jsonl, so it resumes after a stop. To start over, move experiments/01-prompt-variants/results/runs.jsonl away first.
6. Rebuild the summary from the log: `SUMMARY_ONLY=1 node experiments/01-prompt-variants/run_experiment.mjs` (writes experiments/01-prompt-variants/results/summary.md).
7. Stop both servers (Ctrl-C in each terminal).

Where things live: seed 20261015, repeats, variant list, question list and frozen settings (temperature 0, reasoning effort medium, max_tokens 4096, row limit 50) are constants at the top of experiments/01-prompt-variants/run_experiment.mjs. The run order is generated from the seed, so it is identical on every run. The runner refuses to start if experiments/_shared/questions.json no longer matches experiments/01-prompt-variants/results/questions.sha256 (f46a4155...), or if v3.txt differs from web/src/dataGuide.ts. Ground truth is regenerated with `.venv/bin/python experiments/_shared/ground_truth.py` (this rewrites experiments/_shared/questions.json; the checksum must still match).
Model output at temperature 0 may still vary between days, so counts can differ slightly on a rerun.
