# Design: one-place prompt

## Shape

All instructions now sit in `DATA_GUIDE`, about 3,550 characters. The old prompt had 8,700 in the guide plus 1,550 in RULES. The guide has three parts: DATA (only what the schema cannot say), QUALIFYING (where two sources look alike) and HOW TO ANSWER. With the guide off, the model gets the opening line, the tools and the schema. `export const DATA_GUIDE =` is unchanged, because `experiments/_shared/run_eval.mjs` rewrites that exact string to toggle the guide.

## Kept

- Query for every figure, use no outside knowledge, answer briefly and quote the result.
- Ties: compare with max or min, no LIMIT 1.
- Out of scope or no record: one line, which keeps the Q13 fix in general terms (no 2024 row in driver_seasons means no figures) and covers Q5.
- Fastest qualifying lap (the Q12 fix): taken from laps with session 'Q', timed and not deleted, and its driver need not be the pole sitter. It no longer calls that driver "the fastest qualifier".
- Chart and rows-cut lines, for app behaviour.
- TrackStatus codes, laps.Position, Deleted, Status values, results.Time, the Points bonus: tests use them; the schema hides them.

## Cut

- The column-by-column restatement of the schema, about 60% of the old guide.
- The points ladder. Only "includes the bonus" matters.
- "Add one sentence on what the measure leaves out." In the Q8 trials it did not produce the caveat, and the model made false claims about its method.
- "Broadest reading" (see below).

## Contradictions

1. **Broadest reading vs naming the reading.** Now one rule: take the most direct reading, say which measure you used, and use that measure in both the SQL and the answer. The Status line defines classified finishers ('Finished', 'Lapped'), so for "finish with fewer laps" the direct reading is clear and gets stated.
2. **No exclusions vs excluding deleted laps.** Apply only the filters the question names, with one exception written into the rule itself: lap-time measures use LapTime not null and not Deleted. Lap counts use every row.
3. **Two sources of names.**
   - Driver names come only from driver_seasons, joined on code and season = 2024. full_name goes in the query output and is copied from the result, which targets the Q3 wrong-name failure.
   - Team totals group by results.TeamName or laps.Team. driver_seasons.team_name is a driver's main team for the season, so it would put a team-switcher's points under the wrong team.

## Measures

- **Pit stops (Q6).** Verified on the 2024 race laps:
  - 849 rows have PitInTime. For 824 of them, the next row (LapNumber + 1, same driver, race and session) has PitOutTime, with Stint one higher each time.
  - The other 25 are retirements or final laps. Only 38 rows have both values.
  - The recipe with the question's 10 to 60 s filter reproduces the reference medians for the top three teams.

  So the guide states this as fact.
- **Best, most consistent, fastest (Q8, Q11).** Take the direct reading and name it. Season rankings use per-race positions; pace uses lap times. "Consistent" means the smallest standard deviation among drivers with a near-full season. Without that season limit, a driver with two races wins on spread.
- **Best qualifier (Q11).** results.Position with session 'Q'; poles = count of Position 1. Qualifying lap times are a separate line.
- **Units (Q9).** Convert in SQL (`round(x/1e9, 3) AS ..._s`) and quote that column. results.Time is the total time for the winner and the gap for everyone else.
- **Race points.** sum(Points) over 'R' with no Position filter. Wins are a separate count.
- **Laps completed (Q10).** Count the laps rows. This matches max(LapNumber) for every driver and race (0 mismatches). results.Laps is NULL for races.

## Step-count sentence

Added: "You have at most 8 tool calls. Once a result answers the question, answer; do not rerun a query to check it."

- **Why:** in Q3 run 1 the model had the right data by about step 6, then repeated near-identical queries until it hit the cap, with no answer. In Q2 it used two steps on checks it did not need. The model cannot see the cap, so stating it costs about 100 characters.
- **Risk:** the model may stop a query early. If that shows up, drop the second clause.

## Not verified

- No eval has been run with this guide. The causes I give for Q3 and Q8 come from the trial notes, not from SQL logs.
- Q10 count: the notes give 138, and a later recount gave 144. results has exactly 138 'Lapped' rows, which supports 138 under the classified reading, but I did not settle the recount.
- Monza checked: there are 13 deleted race laps, and excluding them does not change the fastest lap.
