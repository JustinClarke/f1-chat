# Findings

## Causes found and fixes

- **Season join bug (8x totals).** The guide told the model to join `driver_seasons` for names. That table covers 2018 to 2025, so without `season = 2024` every row repeated 8 times (points came out as 3192, wins as 72 instead of 9). Fix: use `results.FullName` directly; join `driver_seasons` only for laps codes, always with `season = 2024`.
- **Lap-count filter leak.** A "standing exception" (LapTime not null, not deleted) was applied to lap counts, giving 77 Monaco laps and top-compound counts like 13,669. Fix: lap counts are `count(*)` with no LapTime or Deleted filter; the time filter is a separate rule for timing questions.
- **Team points WHERE-clause bug.** For wins and points together the model wrote one GROUP BY with `Position = 1` in WHERE, which also cut the points sum to winning rows (228 instead of 537). Fix: FILTER or one CTE per measure, with a worked example, plus "list each figure and its rows before the first query". Passed 9/9 across the final probes.
- **"Seven" scorer issue.** The model wrote the winner count in words; the scorer needs digits. Fix: guide says numbers in digits. Scorer unchanged.
- **Bahrain rounding scorer issue.** The model gives 96.537 s, matching the expected 1:36.537, but |96.537 - 96.5365| is 0.000500000000002 in floating point, just over the 0.0005 tolerance. A "round to 4 decimals" line got 2/3 but only serves the scorer, so it was left out. Bahrain fails in all candidates for this reason.
- **Q9 garbled ns time.** The answer quoted a garbled figure (55 247 420 000 000 ns). The guide gave raw nanoseconds but did not say to convert in SQL; the rewrite tells the model to divide by 1e9 inside the query, never by hand (see `candidates/prompt_proposal.md`; moderate confidence, not re-tested).
- **Q12 fastest qualifier vs pole sitter.** The model used the pole sitter (results Position = 1 in session Q) or Q3 times instead of the fastest qualifying lap from `laps`. Fix: added a fastest-qualifying-lap line (prompt v4, in 01-prompt-variants) and a rule in the guide.
- **Q13 no-record rule.** For a driver not in the 2024 data (Michael Schumacher), say there is no 2024 data and give no points figure or driver. The rewrite states this as a general rule (no 2024 row in driver_seasons means no figures); the unanswerable line also says to name no driver or result from memory.
- **Q6 pit-stop pairing check.** Pairing each pit-in lap with the next lap's pit-out time was checked in the data: 824 of 849 pairs verified.
- **Ollama 4096 vs 20480 context.** Ollama defaulted to a 4096-token context, truncating the prompt. Fixed with `experiments/_shared/ollama/Modelfile` (num_ctx 20480, num_predict 8192).
- **/v1 endpoint limit.** The OpenAI-compatible `/v1` endpoint cannot set num_ctx per request, which is why the value is baked into the Modelfile.

## Still open

- Guide-off regressions: Monaco laps, top compound, wins by driver (guide-off passes 5 of 13 in the latest run).
- The unanswerable question, guide off, names a driver.
- Q10 count: 138 (QUESTION_TYPES.md) or 144 (recount from laps), unsettled (decision D1 in trials-log.json).
- Q7 chart not checked in the browser.
- Scorer rounding for Bahrain (scorer not changed).
- Poles question hits the step cap (8 calls) with guide off.
- Guide-off behaviour and questions outside `experiments/_shared/questions.json` were not re-probed by the fix agent; results are single runs.
