# Question types for the local model

Questions run by hand against gpt-oss:20b (17 Oct). Each entry gives the question type, what makes it hard, the ground truth, and the result. Ground truth was checked with DuckDB against the 2024 Parquet files.

Race rows in `results` have `session_type` NULL; qualifying rows have `'Q'`. In the trial views, `session` is derived from the file path.

## 1. Filter, median, compare (multi-step)
- **Question:** In the 2024 Bahrain Grand Prix, who had the faster race pace, Verstappen or Norris? Use only green-flag laps, excluding in-laps, out-laps and deleted laps. Give the median lap time for each.
- **Hard because:** several exclusions, a per-driver median, then a comparison.
- **Ground truth:** Verstappen faster. VER median 95.477 s, NOR median 96.5365 s (96.537 s rounded).
- **Result (1 run):** Correct. Model used `TrackStatus = '1'`, null `PitInTime`/`PitOutTime`, `Deleted` not true, and `percentile_cont(0.5)`.

## 2. Two conditions and a count with ties
- **Question:** Across the 2024 Grand Prix races, which drivers finished on the podium (top 3) after starting outside the top 10 on the grid? Give each driver with how many times they did it.
- **Hard because:** two conditions across the same row, a count, and a tie that must all be returned.
- **Ground truth:** three drivers, one each:
  - Max Verstappen: São Paulo (`2024_21`), grid 17, finished 1st
  - Pierre Gasly: São Paulo (`2024_21`), grid 13, finished 3rd
  - Charles Leclerc: Abu Dhabi (`2024_24`), grid 19, finished 3rd
- **Result (1 run):** Correct, all three tied drivers returned. Model used `r.session = 'R'` (valid in the trial views). Took three tool steps; the last two were checks that were not needed.

## 3. Join across sessions, then aggregate
- **Question:** Across the 2024 season, which driver had the largest gap between their best qualifying lap and their median race lap at the same Grand Prix? Use green-flag race laps only (excluding in-laps, out-laps and deleted laps) for the race median, and ignore deleted qualifying laps. Give the driver, the Grand Prix, and the gap in seconds.
- **Hard because:** two sessions joined per driver and race, a per-group median, then a maximum over the joined rows.
- **Ground truth:** Logan Sargeant (SAR), Canadian Grand Prix, gap 16.767 s (best qualifying 72.736 s, race median 89.503 s). Gap is partly fuel and tyre load in the race, so the number is large for most of the top rows.
- **Result, run 1 (cap 8):** Right data by about step 6, then repeated near-identical queries until the cap. No final answer. Only the tail of the output was seen, so the first correct step is not confirmed.
- **Result, run 2 (cap 16):** Correct in 3 steps: "Logan Sargeant – Canadian Grand Prix – 16.767 seconds."
- **Read:** the same question gave different outcomes on different runs. One run is not enough to say the model is reliable here. Also note the trial cap (16) is higher than the app cap (8, `web/src/chat.ts`), so the app would hit the run-1 failure.

## 4. Per-row condition, grouped count across races
- **Question:** Across all 2024 Grand Prix races, how many laps did each driver lead? Count a lap as led when the driver's Position is 1 on that lap. Give the driver with the most laps led and their count.
- **Hard because:** the answer is a count of individual lap rows, not a stored stat. The model has to notice that `laps.Position` is the running order per lap, and filter to race laps.
- **Ground truth:** Max Verstappen, 559 laps led. Others: Norris 271, Leclerc 172, Russell 137, Sainz 134, Piastri 123, Hamilton 31, Ocon 14, Pérez 1. The reading is my definition (Position = 1 on that lap), and 28 of 26,606 race laps have a null Position.
- **Result (1 run, cap 16):** Correct. One SQL step (`session = 'R' AND Position = 1`, grouped by driver, joined to `driver_seasons`), then the answer: Verstappen 559.

## 5. Out of scope (trap)
- **Question:** Who won the 2023 Monaco Grand Prix, and by how many seconds?
- **Hard because:** the model may know the answer from training data. The rules forbid outside knowledge, and the data covers 2024 only.
- **Expected:** refuse, name no driver, and say the data covers 2024 only.
- **Result (1 run, cap 16):** Correct. "I'm sorry, but the data set only contains information for the 2024 season, so it does not include the 2023 Monaco Grand Prix." No SQL run, no driver named.

## 6. Complex calculation (self-join, filter, median per group)
- **Question:** In the 2024 Grand Prix race laps, pair each pit-in lap with the next lap's pit-out time to get each stop's pit-lane time. Ignore stops under 10 seconds or over 60 seconds. For each team, give the median pit-lane time and the number of stops. Which team had the fastest median?
- **Hard because:** the model has to self-join laps on driver, race and lap number + 1, filter on the computed duration, then take a median per team. The medians are close together (22.887 s to 24.256 s), so a small method error would change the ranking.
- **Ground truth:** McLaren fastest at 22.887 s median (77 stops). Full order: Mercedes 22.908 (78), Red Bull 22.928 (80), RB 22.940 (72), Ferrari 23.091 (75), Alpine 23.205 (71), Aston Martin 23.265 (81), Williams 23.545 (72), Haas 24.010 (85), Kick Sauber 24.256 (78).
- **Result (1 run, cap 16):** Correct. All ten teams and counts matched. Model used one SQL step with the same self-join, filter and median. The question gave the method, so this tests execution, not choosing a definition.

## 7. Chart over many items (bar, 24 drivers)
- **Question:** Chart each driver's total Grand Prix race points in 2024, highest first.
- **Result (1 run):** Correct totals. Verstappen 399 matches the eval ground truth. Bar chart with 24 rows, all drivers listed.

## 8. Ambiguous ("most consistent driver")
- **Question:** Who was the most consistent driver in the 2024 races?
- **Result (1 run):** Named Valtteri Bottas, standard deviation of finishing position 2.22 over 24 races. The number matches the data. The answer did not say it measured spread of finishing position (which is not the same as consistent performance), and did not mention that a low spread in midfield would rank high on this measure. Partial pass: right number, weak framing of the reading.
- **Rerun with the "mention your reasoning" rule added (3 runs, local gpt-oss:20b, 17 Oct):** all 3 name Valtteri Bottas, SD 2.22, average 15.83, 24 races, which matches the data. All 3 now name the measure (standard deviation of finishing position). Run 3 says so explicitly ("as a measure of consistency"); runs 1 and 2 name it in the first sentence. None of the 3 says the measure rewards midfield finishers, which is the limit I want stated. So the reasoning rule helps with the measure, but not with the caveat. Still a partial pass.
- **Rerun with the explicit limitation rule (3 runs, local gpt-oss:20b, 17 Oct):** all 3 give Bottas, SD 2.22, average 15.83, 24 races (correct). Limitations named: run 1 says Oliver Bearman's SD of 1.41 comes from only 2 races, so it isn't robust (a small-sample limit, not the midfield one). Run 2 says the measure ignores points and lap times. Run 3 names no limitation. None mentions midfield finishers. Run 3 also says the query "included only drivers who participated in all 24 races"; it did not filter that way, so the method description is false. Still a partial pass.
- **Decision (17 Oct):** the explanation rules ("mention your reasoning", then "name a limitation") were removed from the app and the harness. They did not reliably produce the midfield caveat, and the explicit version risked giving the model the answer. Q8 stays a partial pass, with the caveat unresolved.

## 9. False premise (trap)
- **Question:** Why did Max Verstappen retire from the 2024 Bahrain Grand Prix?
- **Result (1 run, no points rules in prompt):** Correctly said he did not retire (Status = Finished). Wrong on the detail: said he finished second with "26 points (the 2nd-place score)". The data has Position 1 and 26 points (win plus fastest-lap point). Partial pass: right premise check, wrong result.
- **Rerun (3 runs, points rules added to prompt, 17 Oct):** 3 of 3 correct: 1st, 26 points (25 + fastest-lap bonus), Finished, no retirement. The answer quotes race time 5 504.742 s, the same number as the units example in the data guide. Checked: the query returned Time = 5504742000000 for this row, so the model read it from the data.

## 10. Comparison across fields, with a definition to get right
- **Question:** Did any driver finish a 2024 race with fewer laps than the winner of that race? If so, list the driver, the race, and how many laps fewer.
- **Result (1 run):** Wrong in the details, and it did not state its reading. It answered "Yes" and gave a 21-race table of "drivers finishing short" with a largest gap per race. The São Paulo row says 1 driver, 68 laps. Checked against the data (joined `laps` to `results` on `race_id`): the winner, Verstappen, completed 69 laps. No classified finisher completed fewer. The three drivers short were retirements or a disqualification, with gaps of 30 to 39 laps. Nothing in the data gives 68.
- **Ground truth:** 191 driver-race rows have fewer laps than the winner. 138 are classified finishers who were lapped (largest gap 7 laps, race 2024_11). 53 are retirements or disqualifications (largest gap 66 laps, Pérez, race 2024_8, retired after 12 laps; winner completed 78).
- **Expected answer:** "Yes." State the reading (classified finishers only, or all drivers including retirements), then give the list for that reading.
- **Rerun after lap-count and finisher rules were added (3 runs, 17 Oct):**
  - All 3 say which reading they used (classified finishers) and say São Paulo has none short, which is correct. Norris at 7 laps in Austria is the largest gap, which matches.
  - Run 1: a 50-row table and "There are 138 such instances in total". The 138 matches the ground truth.
  - Runs 2 and 3: 200 table lines but only 69 unique rows. The tables repeat and stop mid-row. The answer goes into a loop and runs out of output space. Not a correct answer, even though the first rows are right.
  - So: the lap-count rules fixed the counting and the reading, but the model still fails to produce a complete list.
- **Root cause (confirmed by investigation, 17 Oct):** the model was shown only the first 50 of 138 rows from `run_sql`. It still wrote "a complete list", and past row 50 it invented rows, then looped while writing. The counting itself was right. The 68 in the first run was an invented row, since no source in the data gives it.
- **Output cap:** raised to 8,192 in the worker (default was 2,048) and in the harness. The loop stopped (runs finish with `done_reason=stop`), but the list was still 50 rows and still said "complete". The cap was not the main blocker.
- **`show_table` tool (built in the app, 17 Oct):** the model did not call it in any Ollama run. In the first run the tool result was an error (the model put the rows in the tool-call arguments instead of a query). With usage instructions added to the tool description, the model made three `run_sql` calls and typed the table itself. Long descriptions did not change its behaviour.
- **Row cap 200 for `run_sql` (harness only, 1 run):** all 138 rows of the answer were correct, nothing invented or missing, 2 steps. The model still typed the table itself (about 2,750 output tokens for the table). Its opening sentence was vaguer but no longer false, and it stated the reading (classified finishers).
- **Web app, Workers AI (gpt-oss-20b), 17 Oct, 1 run:** all 138 rows correct, no invented or missing rows. Opening line states the reading (classified finishers). São Paulo correctly absent. Two rows have "Val‑teri Bottas" (a non-breaking hyphen in the name), which I counted as correct. The app returns 200 rows to the model (`ROW_CAP`), and the table was typed by the model, not shown by a tool.
- **Web app, table drawn from the query (17 Oct, 1 run, Workers AI):** pass on the main points. The typed list was removed from the answer and a grid was drawn under the text, with the query's columns (`driver_name`, `race`, `laps_fewer`). The grid shows the same rows as the earlier typed answer, with Norris at 7 laps in Austria. Not yet confirmed: the full row count in the browser (the grid scrolls) and whether the typed list in the model's text was fully stripped. One run only.
- **Local gpt-oss:20b, row cap 200, 3 runs (17 Oct):** all 3 correct, 138 of 138 rows each, no wrong or missing rows. Each run also ran a query returning 138 rows, so the app's table-from-query step would find a matching result. The harness does not run the splitter or draw the grid, so this checks the model's answer and the row match, not the rendering. Scoring note: an earlier scorer gave 0 for two runs because of U+202F no-break spaces in names; normalising them fixed it, and the content was right.
- **Still open:** the model prefers to write long tables itself; `show_table` is not used. Options: enforce the tool in code, or switch Q10 to a per-race count, which suits a chart.

## 11. Ambiguous ("best qualifier")
- **Question:** Who was the best qualifier in the 2024 season?
- **Hard because:** "best" has no definition. The answer should name the reading used.
- **Ground truth (pole-count reading):** Max Verstappen, 10 poles. Others: Norris 8, Russell 3, Leclerc 2, Sainz 1.
- **Result (3 runs, cap 16, 17 Oct):** 3 of 3 say Verstappen with 10 poles, all in one SQL step. The answer names the measure (pole positions), so the reading is visible, but it does not say that "best" was chosen as a reading. Pass on the number and the name. The framing is weaker than the question asks for.

## 12. Join across sessions, then count
- **Question:** In how many 2024 Grand Prix races did the driver who set the fastest qualifying lap go on to win the race? Give the count.
- **Hard because:** the fastest qualifying lap has to come from `laps` (session Q, `LapTime`, not deleted). The race winner has to come from `results`. The two are then joined per race.
- **Ground truth:** 11 of 24 races (Verstappen 5, Norris 3, Sainz 1, Russell 1, Leclerc 1). Per-race list from the DuckDB check: fastest-lap setter, then winner.
- **Result (3 runs, cap 16, 17 Oct):** all 3 wrong. 12, 12, 13.
  - Runs 1 and 2 used `results.Position = 1` in the qualifying session, which is the pole sitter, not the fastest lap. Run 2 ran three steps and never queried `laps`.
  - Run 3 used the minimum `Q3` time per driver from `results`. That is a different measure and the model did not query `laps` at all.
  - The model never joined `laps` to `results`. This is the join the question was built to test, so it is a clear fail for this model.
- **Rerun with a fastest-qualifying-lap line added to the guide (v4, 3 runs, 17 Oct):** all 3 correct, 11. Each run queried `laps` with session 'Q', `LapTime` not null, not deleted, grouped by race, then compared to the race winner. The fix is one line in "HOW TO ANSWER". v3 is unchanged; the v4 copy is in `experiments/2026-10-15-prompt-variants/variants/v4.txt`. Only Q12 has been rerun. Other questions have not been checked against v4, so the change could affect them.

## 13. Trap (driver not in the 2024 data)
- **Question:** How many points did Michael Schumacher score in the 2024 season?
- **Hard because:** the name is famous, so the model may answer from memory. The data has Mick Schumacher for 2021 and 2022 only, and no Michael Schumacher.
- **Expected:** say there is no 2024 data for him. Name no points figure and no driver.
- **Result (3 runs, cap 16, 17 Oct):** 3 of 3 correct. "The data does not include Michael Schumacher in the 2024 season, so no points can be reported." One step each, no SQL error.

## 14. Percentage of rows with a filter
- **Question:** What percentage of 2024 race laps had a TrackStatus of exactly '1'? Count every race lap row.
- **Hard because:** the answer is a ratio of two counts over the same race-lap rows. The model must not drop rows with null times.
- **Ground truth:** 24,604 of 26,606 race laps, 92.48%.
- **Result (3 runs, cap 16, 17 Oct):** 3 of 3 correct. Two steps each (a count, then the ratio). All three give 24,604 of 26,606 and 92.48%.

## Cloudflare Workers AI run (gpt-oss-20b, v4 prompt, 1 run each, 17 Oct)
Run through the repo's Worker (`worker/index.ts`, `wrangler dev`, Workers AI binding) with temperature 0, medium reasoning and 4096 max tokens, as in `eval/run_experiment.mjs`. The tool loop is the same as the local harness, with the tool messages in OpenAI form. The local Ollama results above used v3, except for Q12 (v4).
- **Q11 (best qualifier):** pass. Verstappen, 10 poles. Same answer as the local runs.
- **Q12 (fastest qualifying lap, v4):** pass. 11 races. Two SQL steps, using `laps` for session Q.
- **Q13 (Schumacher trap):** pass. Says the data covers 2024 only and he is not in it. No points figure.
- **Q14 (TrackStatus percentage):** counts right (24,604 of 26,606) but the percentage is 92.47%. The exact value is 92.4754%, which rounds to 92.48%. The model truncated. The local runs gave 92.48%. One run only.

## Cloudflare v4 rerun, Q1 to Q10 (gpt-oss-20b, v4 prompt, 1 run each, 17 Oct)
Same Worker and settings as above. Log: `logs/run_cf_v4_q1_q10.log`.
- **Q1 (Verstappen vs Norris pace):** pass. Verstappen faster; medians 95.48 s and 96.54 s (truth 95.477 and 96.537).
- **Q2 (podium from outside top 10):** pass. Leclerc, Verstappen, Gasly, one each.
- **Q3 (largest qualifying-to-race gap):** pass. Sargeant, Canadian GP, 16.767 s.
- **Q4 (laps led):** pass. Verstappen 559, full list matches the ground truth.
- **Q5 (2023 Monaco, out of scope):** pass. Refuses, names no driver, says 2024 only.
- **Q6 (pit-lane medians by team):** pass. All ten teams and stop counts match; McLaren fastest at 22.887 s.
- **Q7 (points chart):** pass on the top five (Verstappen 399, Norris 344, Leclerc 327, Piastri 265, Sainz 262), checked against DuckDB. The other 19 totals were not compared row by row.
- **Q8 (most consistent):** same as v3. Bottas, SD 2.22. The reading is named as standard deviation of finishing position.
- **Q9 (Verstappen retirement, false premise):** pass. Says he finished with 26 points and was not retired. It does not state his position (1st).
- **Q10 (fewer laps than the winner):** partial. Answers "Yes" and gives a table, but the table stops at 50 rows (the `run_trials.py` cap) while the answer says "every such driver". All 50 rows match the data (no invented rows). The 138-row total in the notes did not reproduce: a recount from `laps` gives 144, so the notes need checking before this is scored as a full pass or fail.

## Not yet run
- Nothing in the planned list is left. The two items that were here (ambiguous, join across sessions) are now questions 11 and 12.
