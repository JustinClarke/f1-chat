1. What this is

A manual trial harness (run_trials.py) that asks gpt-oss-20b questions about 2024 F1 data. The model writes DuckDB SQL through a run_sql tool, the query runs against the 2024 Parquet files, and the model answers. It runs either locally (Ollama) or on Cloudflare Workers AI through the repo's Worker. Questions and results are in QUESTION_TYPES.md (Q1 to Q14).

2. How to run it

Python with duckdb: /private/tmp/claude-501/-Users-justin-github--misc--chat-f1-chat/33e07af5-fe36-4b6a-a970-84018a9a48f4/scratchpad/duckvenv/bin/python (it lives in scratchpad and existed when this was written, but may be gone later; any Python with duckdb works).
Env vars, with defaults: PROVIDER (ollama or cloudflare, default ollama); MODEL (gpt-oss:20b on Ollama; on Cloudflare only a label, since the Worker picks its model from wrangler.toml AI_MODEL); CF_WORKER_URL (http://localhost:8787/chat); ROW_CAP (50); GUIDE_FILE (../01-prompt-variants/variants/v3.txt); QUESTION (Bahrain pit-stop question); RUNS (1); NUM_CTX (20480); MAX_OUT (8192, Ollama num_predict); CF_MAX_OUT (32768); OLLAMA_URL (http://localhost:11434/api/chat); DATA_ROOT (/Users/justin/github/off-the-pace/data).
For Cloudflare, start the Worker first: cd /Users/justin/github/_misc/_chat/f1-chat && npx --no-install wrangler dev --port 8787. Other wrangler dev processes from /Users/justin/github/_misc/_chat/off-the-pace-chat are not ours; leave them alone.

3. The pipeline

One loop for both providers (max 8 tool steps, temperature 0, same prompt, rules and tool). Only chat() differs. Ollama: native /api/chat, num_ctx 20480, num_predict 8192, no reasoning field. Cloudflare: messages are copied into OpenAI form (tool call ids, JSON-string arguments, tool_call_id and name), sent with max_tokens 32768 and reasoning {"effort": "medium"}. All confirmed in run_trials.py.

4. What is verified

The Bahrain pit-stop smoke test (reference: three-way tie at 3: Gasly, Hulkenberg, Sargeant) passes on both providers with current settings (logs/smoke3_ollama.log and logs/smoke3_cloudflare.log, each 2 steps). Cloudflare accepted max_tokens up to 65536 in a short probe only.

5. Results so far

Q11 to Q14: local v3 (Q12 on v4) and Cloudflare v4. Q1 to Q10: Cloudflare v4, one run each.
Cloudflare passes: Q1, Q2, Q3, Q4, Q5, Q6, Q7 (top five checked; other 19 totals not compared), Q8 (same as local: Bottas, but still a partial pass on framing), Q9 (does not state he finished 1st), Q11, Q12, Q13.
Q14: counts right (24,604 of 26,606) but the model gave 92.47%; the true value 92.4754% rounds to 92.48%. Local runs gave 92.48%.
Q10: partial. The table stops at 50 rows (the cap) while the answer says "every such driver". All 50 rows match the data.
Local: Q10 passed 3 of 3 with ROW_CAP=200; Q11, Q13, Q14 passed; Q12 failed on v3 (12, 12, 13) and passed 3 of 3 on v4.
Note: the Cloudflare section of QUESTION_TYPES.md says 4096 max tokens, which is out of date; the harness now sends 32768. PROTOCOL.md also lists num_predict 4096.

6. Open items, in priority order

(a) Q10 truth count: notes say 138 classified finishers; a recount from laps gives 144. Settle the definition before scoring.
(b) Q10 needs ROW_CAP=200 to show the full answer; the default 50 truncates it.
(c) The v4 prompt change (one line in v4.txt, a copy of v3) has been tested only on Q12 and on Q1 to Q10 on Cloudflare. It has not been rerun locally on the full set.
(d) Local runs have been one run per question for most questions; the Q8 framing (midfield caveat) is still unresolved.
(e) The app's pipeline (experiments/01-prompt-variants/run_experiment.mjs in the main repo) is separate from this harness and has not been compared.

7. Known differences to keep in mind

The row cap default is 50 (the app uses 200). The harness guide is v3 by default, which differs from the app's web/src/dataGuide.ts. Cloudflare uses reasoning medium; Ollama does not. SQL errors go back to the model with no retry cap. archive/run_trials_with_cloudflare.py is the older harness; harness/ scripts import duckdb from an old scratchpad path and will not run unchanged.
