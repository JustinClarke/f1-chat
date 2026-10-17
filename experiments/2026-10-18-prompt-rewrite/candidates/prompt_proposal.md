# Proposal: leaner system prompt

## Summary (read first)

- Current size: opening 85 chars; DATA_GUIDE 8,699 (about 2,200 tokens); generated schema + samples about 5,400 (about 1,800 tokens); RULES about 1,550 (about 400 tokens). Total about 15,700 chars.
- About 60% of the guide restates the schema: every column of `laps` and `results` is described again, including TeamColor, `index`, sector session times, speeds, tyre fields and FastF1Generated, which no test question uses. The model already sees the names and types in TABLE SCHEMA.
- Three real contradictions between RULES and the guide, and each one matches a failure:
  1. RULES "use the broadest reading" vs guide "Name the reading you used". The first picks silently.
  2. RULES "Do not add exclusions (untimed laps, deleted laps...)" vs guide "Exclude NULL LapTime" and "Deleted laps are usually excluded".
  3. Guide "Use it [driver_seasons] for all driver and team names" vs `results` also carrying FullName and TeamName. Two name sources, no stated preference for results-only questions.
- Two sentences actively push the wrong way (Q11, Q9); two gaps leave the model unsteered (Q6, Q3). Q8 looks like variance plus a missing "pick one measure" rule.
- Proposed prompt: guide about 3,300 chars (-62%), rules about 1,250 (-20%). Saves about 1,700 tokens, leaving more of the 20k window for tool results and fewer places to second-guess.
- Nothing here names a driver, race or answer.

## Findings per failing question

- **Q11 (best qualifier = pole count).** The guide says: "Its driver is the fastest qualifier. This is a lap time, not the pole position". That defines "qualifier" as the lap-time holder, so "best qualifier" gets read that way. The broadest-reading rule then confirms it. Fix: drop the sentence, state that qualifying standing is `results.Position` in session Q, and tell the model to pick the most natural reading and name it.
- **Q9 (garbled time 55 247 420 000 000 ns).** The guide gives raw ns and says "divide by 1e9", but nothing tells the model to do it in SQL. The figure looks like a mental conversion or a typo of a ns value. Also, `results.Time` means total time for the winner and a gap for others, which is easy to misquote. Fix: rule "convert and format units inside the SQL query, quote the converted column".
- **Q6 (pit-lane medians, 1 stop).** Guide: "PitOutTime / PitInTime: ... NULL if the lap had no pit out / in". It never says that the in-time sits on one lap row and the out-time on the next. A model that filters rows having both finds almost none, which explains "1 stop". Fix: one sentence on pairing the in-lap with the following lap. Not a patch for one question, it is how the column works. Also the RULES "do not add exclusions" rule has nothing to say about median-of-what.
- **Q3 (wrong name for code SAR).** Nothing in the prompt says how to compare qualifying and race positions, and "never name a driver from a code using your own knowledge" is satisfied by any join. Likely causes: a join on code without `season = 2024` or without picking one name per code, or reading the name off a different row. The two name sources (point 3 above) make this worse. Fix: one rule, "get names by joining driver_seasons on code and season = 2024; if one code has several names, say so". I cannot confirm the cause without the SQL log.
- **Q8 (most consistent).** No sentence steers. The "add one sentence on what it leaves out" rule is fine. Missing: when a term has several measures, pick one, say which, and keep the SQL consistent with it. Probably mostly variance, since an earlier run was correct.
- **Q10 (fewer laps than winner).** Guide says to name the reading and not mix; RULES say "broadest reading". The broadest reading (all 191 rows) is right, but the 138/53 split is the useful extra. New rule: answer with the broad reading and, when a cheap split exists, give the split in one sentence.
- **Q7 (chart).** No evidence of a prompt problem; the chart rule is fine. Needs a run.

## Redundancy and noise removed

- "Source: FastF1 ... stored as Parquet" and "Verified against..." (no use to the model).
- 20 or so column lines that restate the schema, or describe columns no question reaches.
- The points ladder (25, 18, 15 ...). Points are in the table; the one sentence worth keeping is "Points already include the fastest-lap bonus and are not a position".
- HOW TO ANSWER: seven of its twelve bullets repeat the table descriptions (race wins, lap counts, "Races are identified by race"). Kept as short general recipes: counting, laps completed, classified finisher, fastest lap.
- RULES: "Always call run_sql... quoting numbers" and "Use only the data guide" overlap; the two driver-not-found rules overlap with the guide's last bullet. Merged.

## Replacement DATA_GUIDE

```ts
export const DATA_GUIDE = `
ABOUT THE DATA
- Formula 1 2024 Grand Prix weekends only (24 races). No sprint, practice, or other seasons.
- Tables: laps (one row per driver per lap), results (one row per driver per session), driver_seasons (names).
- session is 'R' (race) or 'Q' (qualifying). race is a lowercase event name like 'monaco_grand_prix'; match loosely with ILIKE '%monaco%'. Count distinct race to count races.
- Names: join driver_seasons ON driver_code = laps.Driver (or results.Abbreviation) AND season = 2024, and use its full_name and team_name. If a code gives more than one name, say so.

UNITS
- Every time column (LapTime, Sector*Time, Time, Q1, Q2, Q3, PitInTime, PitOutTime, LapStartTime) is an integer in NANOSECONDS. Divide by 1e9 in the SQL query to get seconds. Do the conversion in SQL, never by hand.
- Speeds are km/h. NULL means no value recorded.

laps
- Driver: 3-letter code. LapTime: ns, NULL when the lap has no valid timing. LapNumber starts at 1.
- Time: session time at the end of the lap. Stint increases after each pit stop.
- Pit stops: PitInTime is set on the lap the car enters the pits, PitOutTime on the NEXT lap row (the out-lap). A stop's pit-lane time is that next row's PitOutTime minus the earlier row's PitInTime, so pair the two rows of the same driver, race and session.
- TrackStatus: codes during the lap, concatenated: '1' green, '2' yellow, '4' safety car, '5' red flag, '6' virtual safety car, '7' VSC ending.
- Position: running race position at the end of the lap.
- Deleted: TRUE if the stewards deleted the lap.

results
- Abbreviation (matches laps.Driver), FullName, TeamName.
- Position: finishing order as a number (race result or qualifying order). Position = 1 is the winner or the pole sitter. GridPosition: starting slot, race only.
- ClassifiedPosition: text; a letter ('R', 'D', 'E', 'W', 'F', 'N') for non-classified drivers.
- Status: 'Finished', '+1 Lap', 'Lapped', 'Retired', ... Classified finishers have Status 'Finished', 'Lapped' or starting with '+'. Everything else is not classified.
- Q1, Q2, Q3: qualifying segment best times (ns), NULL if the driver did not reach the segment.
- Time (race only): total race time for the winner, gap to the winner for other finishers. NULL for non-finishers and lapped cars.
- Points: the points for that session. They already include the fastest-lap bonus. Points are not positions.
- Laps is NULL for race rows. Use max(LapNumber) from laps for laps completed.

HOW TO ANSWER
- Wins and poles: count results rows with Position = 1 in session 'R' or 'Q'. Race points: sum Points where session = 'R'.
- A lap count counts laps rows. Laps completed in a race: max(LapNumber) per driver for that race.
- For fastest or pace measures use laps with LapTime IS NOT NULL and Deleted IS NOT TRUE. For counts of laps driven, use every row.
- Qualifying results (pole, grid, Q segments) come from results with session = 'Q'. Qualifying lap times come from laps with session = 'Q'. These are different things.
- If the question needs another season, a sprint or practice session, or data not in these tables, say the data does not cover it. If a named driver or team has no row in driver_seasons for 2024, say there is no 2024 data for them and give no figures.
`;
```

## Replacement RULES block (inside the template literal in ask())

```
RULES
- Call run_sql for every number; never guess. Use only the data guide and query results, not outside knowledge of F1. Answer briefly in plain text and quote the numbers from the query.
- Do conversions and formatting (seconds, gaps, counts) in the SQL query and quote the converted column.
- Apply the filters the question names. Add an exclusion only when the guide says the measure needs it (for example fastest laps need LapTime IS NOT NULL and not Deleted).
- If a word could mean more than one measure (best, consistent, fastest, fewer), pick the most direct reading of the words, state it in one sentence, and use that same measure in the query and the answer. If a simple second reading changes the answer, add its result in one extra sentence.
- For the top item (most, fewest, fastest), return every item tied at the top. Compare against the maximum; do not use LIMIT 1.
- Name drivers and teams only from driver_seasons (join on code and season = 2024). Never name a driver from a code using your own knowledge.
- If a driver, team, season or session is not in the data, say so and give no figures.
- If asked for a chart, or the answer compares many items, run the query first, then call make_chart with column names from that query.
- If a result says rows were cut, do not present a table as complete. Aggregate in SQL and try again.
```

## What I expect to change

- Q11: the "fastest qualifier = lap time" definition is gone, and the guide separates qualifying standing from qualifying lap times. Good chance of the pole-count reading, which is also named in the answer.
- Q9: fewer garbled ns figures because conversion happens in SQL. Moderate confidence.
- Q6: should find the stop pairs; the median can still go wrong if the model includes non-stop laps or mis-joins (for example it may still include in-laps with safety-car stops or red-flag laps).
- Q10: the broad count plus the split sentence is plausible.
- Q3, Q8: small expected effect. Q3 depends on the actual SQL; Q8 on whether the model picks position spread or lap-time spread (both are defensible; the rule makes it say which).
- Passing questions (Q1, Q2, Q4, Q5, Q12, Q13, Q14): the removed text does not touch them, but Q14 (TrackStatus percentage) and Q4 (laps led) rely on the Position, TrackStatus and Deleted lines I kept in shortened form. Q13 and Q5 rely on the last rule; wording changed slightly.

## Not verified

- No run was made. All causes above come from reading the prompt, not from SQL logs. For Q3 and Q8 I have no evidence of the model's chosen SQL; read `eval/logs/` for them before trusting my cause.
- The Q6 pairing sentence assumes PitOutTime is on the lap after PitInTime (as FastF1 normally records). Check one sample driver in the data.
- The Q10 split clause costs a few tokens and may encourage extra queries, which could add steps for a model that already over-checks. If so, drop that clause.
- Removed column lines (tyres, speeds, sectors, DeletedReason, IsAccurate) may matter for questions outside the 14. The schema still lists the names and types, but the meaning of Stint, TyreLife, or SpeedST is no longer explained. Add back one line only if such questions appear.
- Run-to-run variance is large (Q3, Q8, Q11 passed earlier), so a single run of 14 will not show a real gain. Run each question 3 to 5 times before and after.
