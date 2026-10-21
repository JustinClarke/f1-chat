# Decisions not fixed by the protocol (2026-10-15)

Row limit: 50. Reason: the app already returns at most 50 rows and the run_sql tool description already says "up to 50 rows", so the rule matches existing behaviour and no shared app code changed. The questions needed at most about 24 rows. One wrinkle: the result JSON also carries row_count, which can reach 200 (validateSql adds LIMIT 200) while only 50 rows are sent; the rule says so.

Exact rule text the model receives, added after the existing "Use only the data guide and query results" line in RULES, identical in all four variants (experiments/01-prompt-variants/variants/rule.txt, SHA-256 in variants/HASHES.txt):

- The rows returned by run_sql (at most 50 rows, plus row_count, the number of rows the query produced) are sent back to you as the tool result. Read them and use them directly in your answer, quoting values exactly. If row_count is above 50 only the first 50 rows are shown, so aggregate or filter in SQL instead.

How it is injected: experiments/01-prompt-variants/run_experiment.mjs bundles the app with esbuild and, at bundle time, adds this line after the anchor line in web/src/chat.ts and swaps the data guide text. web/src/chat.ts and web/src/dataGuide.ts are not edited. The runner checks that the rule appears exactly once in each system prompt, that the system message is the same in every call of a run, and that v3.txt equals DATA_GUIDE in dataGuide.ts.

Variant files hold only the guide text. The shared rule is a separate file. V0 is an empty file. The existing rule "Use only the data guide and query results" stays in V0 even though V0 has no guide; this was kept so rules are identical across arms.

Temperature: 0, sent in every request. The Worker originally ignored any extra fields (it sent only messages, tools and max_tokens 2048), so worker/index.ts was edited minimally to forward temperature, max_tokens and reasoning when present. The Workers AI request was accepted (HTTP 200). Whether temperature 0 was honoured could not be proven from the response; I did not run a repeat-determinism test.

Reasoning effort: requested as reasoning: {effort: "medium"}. Two probe calls with effort low and high returned byte-identical token counts, so the setting had no observable effect through this path. Treat reasoning effort as the model service default, not controlled. The response gives no reasoning token count (usage has no completion_tokens_details), so "reasoning tokens" in the summary is n/a. The reasoning text is logged per call (reasoning_content). A different parameter name (for example reasoning_effort) was not tried.

max_tokens: 4096 instead of the Worker default 2048, so reasoning plus a tool call cannot be cut off. This is a deliberate difference from the shipped app.

Block randomisation: each repeat is a block of the 16 variant-question cells, shuffled (mulberry32, seed 20261015). This keeps variants interleaved and keeps a partial run balanced.

Fresh state per run: a fresh copy of the app module (empty history, schema recomputed) and a new DuckDB-WASM instance with new views. This leaks memory (ISSUES.md), so the runner supports MAX_RUNS batches and resumes by skipping run ids already in runs.jsonl.

Pilot: V3 on bahrain_clean_pace, once, chosen because V3 has the longest prompt and the question has the most steps.

Questions: bahrain_clean_pace was added to experiments/_shared/ground_truth.py. Regenerating questions.json left the 12 existing questions identical. The scorer was not changed. For bahrain_clean_pace the expected values are: name Verstappen (weak check, since both names appear in any answer), and the two medians in seconds (95.477 and 96.5365, tolerance 0.5 ms). The Norris median ends in .5 ms, so an answer rounded to 3 decimals (96.536 or 96.537) sits at the tolerance edge. The runner records an informational 1 ms check ("within_1ms_info"); it never changed a verdict.

Cost logging: Workers AI returns usage.neurons per call; the runner sums it per run.
