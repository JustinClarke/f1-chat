# Issues (2026-10-15, app commit: none, repository has no commits)

1. Process crash after 40 runs. The first invocation of the full grid died with "JavaScript heap out of memory" (see results/grid.log). Cause: each run creates a new DuckDB-WASM instance and they are never freed. Not a quota or Worker problem. Fix: MAX_RUNS env var added to the runner, then the grid was resumed in batches of 14 (runs already in runs.jsonl are skipped). The first 40 runs were produced by the runner version before MAX_RUNS was added; the only difference is the batch switch. Positions 1 to 80 are all present once.
2. The runner was edited after PROTOCOL.md was written: neuron logging (before the pilot reran) and MAX_RUNS. Neither changes prompts, settings or scoring. The pilot ran before the neuron field existed, so pilot.jsonl lacks the per-run neuron sum (per-call usage.neurons is there).
3. Quota: no quota error. Grid used about 8,007 neurons (sum of usage.neurons) plus about 160 for the pilot and a few for probes, under the 10,000 daily allowance. Errors: none infrastructure-related; all 80 runs have a verdict from the scorer (59 pass, 20 fail, 1 check manually).
4. Reasoning effort and temperature cannot be shown to be honoured (DECISIONS.md). Reasoning token counts are not provided.
5. No commit hash exists. The Worker edit (worker/index.ts) is uncommitted, as are all eval files.
6. Causes of non-passing runs (full list in results/summary.md):
   - wins_team, V0 (2 of 5 fail) and V1 (4 of 5 fail): answered "19 victories" for Red Bull; the SQL omitted session = 'R' so qualifying pole rows were counted too. V2 and V3 were 5/5.
   - top_compound, V2 0/5: the model answered HARD with 13,612 laps instead of 13,767. It copied "Deleted is not TRUE" from the V2 fastest-lap recipe into a plain count. This is a wording effect of my V2 file, not noise. V0 failed once (13,770) and V3 once (13,612).
   - bahrain_clean_pace: V0 failed 4 of 5 (medians off by 0.1 to 1 s or wrong filters). V3 failed 2 of 5 only because the answer was rounded to two decimals (95.48, 96.54), which the 0.5 ms strict scorer rejects; the values are close to correct. V1 failed once with nonsense values (1,000,000,000 ns).
   - unanswerable, V0 rep 4: "check manually" (said "could not find ... zero rows" with no refusal phrase). Counted as not pass.
7. Name check weakness: bahrain_clean_pace passes need both medians; the "faster driver" name check always matches since both drivers are named. Medians could be assigned to the wrong driver and still pass. I did not audit all 20 answers for swapped labels.
8. The model's generated SQL was not compared with ground-truth SQL; only the final answer is scored.
9. Not verified: determinism of temperature 0; whether the Workers AI neurons figure matches billing; V1 and V2 text accuracy was checked by me against dataGuide.ts by reading, not by tooling.
10. Servers: data server and Worker were started by the experiment and stopped afterwards.
