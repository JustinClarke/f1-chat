# Protocol: local model manual trials (17 Oct 2026)

**Question.** Can gpt-oss:20b on a local Mac (Ollama) answer the app's questions correctly when prompted with the data guide, schema and rules, and which rule or setting changes that?

**Method.** One question at a time, run by hand through `run_trials.py`. Each change to the prompt or settings is followed by repeat runs of the question it targets, plus a control question that should not change. Each run is the full loop: the model writes SQL, DuckDB runs it, rows go back, the model answers.

**Fixed settings.** Model gpt-oss:20b (Ollama 0.40.5). Temperature 0. num_predict 4096. num_ctx 16384 or 20480 (noted per run). Data: the 2024 Parquet in the data repo.

**Pass rule.** Answer matches the reference, with the names and counts right. A wrong name counts as a fail even if the numbers are right. An empty reply or a step limit is a fail.

**Changes tested, in order.**
1. Context window: default vs 16k vs 20k. Measured on the pit-stop question.
2. Tie rule: "return every item tied at the top; no LIMIT 1".
3. Counting rule: laps count every row; untimed and deleted laps still count. Measured on Monaco laps (expected 78).
4. Name rule, then the driver-season table (dbt model, all seasons), with the rule pointing at the table.

**Not done.** No automated repeats at scale. No browser run. No second question set to check over-filtering.

**Reference answers.** Monaco, Norris laps: 78. Bahrain pit stops: tie at 3, Gasly (GAS), Hulkenberg (HUL), Sargeant (SAR).
