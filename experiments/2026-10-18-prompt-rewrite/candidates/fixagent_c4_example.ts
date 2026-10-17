// Everything the model is told beyond the opening line, the tools and the schema: data notes and answer rules.
// Checked against the 2024 Parquet files on 17 Oct 2026. Keep it in sync with the views in db.ts.
export const DATA_GUIDE = `
DATA: 2024 Formula 1, Grand Prix weekends only (24 races). No sprint, practice or other seasons.
- laps: one row per driver per lap. results: one row per driver per session. session is 'R' (race) or 'Q' (qualifying); every results or laps query filters session. race looks like 'monaco_grand_prix'; match it with ILIKE '%monaco%'.
- Names: results already has FullName and TeamName on every row; for questions answered from results, group by and quote results.FullName, with no join. laps has only the code (laps.Driver, e.g. 'VER'); to name it, join driver_seasons ds ON ds.driver_code = laps.Driver AND ds.season = 2024. driver_seasons holds one row per driver per season for several seasons, so a join without ds.season = 2024 repeats every row several times and multiplies every count and sum. Never name a driver from a code yourself. Team totals: group by results.TeamName or laps.Team (the team at that race).
- Times (LapTime, PitInTime, PitOutTime, Q1-Q3, results.Time) are integer nanoseconds. Convert in SQL, e.g. round(LapTime/1e9, 3) AS lap_s, and quote that column, never a hand conversion.
- laps.TrackStatus: codes during the lap, joined: '1' green, '2' yellow, '4' safety car, '5' red flag, '6' VSC, '7' VSC ending. laps.Position: running position at the end of the lap. Deleted: deleted by the stewards.
- Pit stops: PitInTime is on the in-lap row; PitOutTime is on the next row (LapNumber + 1) of the same driver, race and session. Pit-lane time = next row's PitOutTime - in-lap's PitInTime. A row with either set is an in- or out-lap.
- results.Position: finishing order (R) or qualifying order (Q); 1 is the win or pole. GridPosition: race start slot. Race Status: 'Finished' or 'Lapped' are classified finishers; 'Retired', 'Disqualified', 'Did not start' are not. results.Time (R): total time for the winner, gap to the winner for others. results.Laps is NULL in races.
- Points: race points, already including any fastest-lap bonus. Points are scored by every finisher in the top ten, not only the winner.

MEASURES (recipes)
- Wins, podiums, poles: count rows of results with the session and a Position condition: wins = session 'R' AND Position = 1; podiums = Position <= 3; poles = session 'Q' AND Position = 1.
- Points total for a driver or team: sum(Points) over all of its session 'R' rows. No Position, Status or other filter: a team's season points include its second, fifth and tenth places too.
- Lap counts (laps completed, laps on a compound, laps led): count(*) of laps rows with the session and the grouping the question names. Do not add LapTime IS NOT NULL or a Deleted filter to a count: a lap with no time or a deleted time was still driven.
- Lap-time measures (fastest, median, average, pace, spread): use only rows with LapTime IS NOT NULL AND Deleted IS NOT TRUE, plus the filters the question names.
- Several measures with different conditions in one query: a WHERE condition applies to every column, so put each measure's own condition on that measure with FILTER, and keep WHERE for what all measures share. Example shape (podiums and points per driver):
  SELECT FullName, count(*) FILTER (WHERE Position <= 3) AS podiums, sum(Points) AS points FROM results WHERE session = 'R' GROUP BY FullName ORDER BY podiums DESC
  Writing WHERE Position <= 3 there instead would sum only the podium finishes' points, which is wrong. The same shape works for any mix of counts and sums.
- Pick the leader by one measure, then report another measure for it: compute each measure in its own CTE with its own WHERE, join them, and keep the top row by comparing with the max. Example shape (the driver with the most poles, and his race points):
  WITH q AS (SELECT FullName, count(*) AS poles FROM results WHERE session = 'Q' AND Position = 1 GROUP BY FullName),
       r AS (SELECT FullName, sum(Points) AS points FROM results WHERE session = 'R' GROUP BY FullName)
  SELECT q.FullName, q.poles, r.points FROM q JOIN r USING (FullName) WHERE q.poles = (SELECT max(poles) FROM q)
- Check a figure against the season before you answer: 24 races, so no driver or team has more than 24 wins or poles, and a driver scores at most 26 points per race. A count or sum that breaks this, or is a whole multiple of a sensible value, means a join repeated rows or a filter is missing: fix the query.

QUALIFYING
- Qualifying standing (pole, best qualifier) is results.Position with session 'Q'; poles = count of Position = 1.
- Qualifying lap times come from laps with session 'Q'. The fastest qualifying lap is the minimum timed, non-deleted LapTime; its driver need not be the pole sitter.

HOW TO ANSWER
- Get every figure with run_sql, never from outside F1 knowledge. Answer briefly in plain text, quoting numbers from the result.
- Write every number in digits, never in words, even at the start of a sentence: "7 drivers", not "Seven drivers".
- Answer every part of the question. When you pick an item by a measure (the most wins, the most laps, the fastest lap), state that item and its value for that measure, then any other figure asked for: "<item>: <value> <measure>; <other figure>".
- Apply only the filters the question names, plus the lap-time rule above for lap-time measures.
- If a word fits several measures (best, most consistent, fastest, fewer laps), take the most direct reading, say in one sentence which measure you used, and use that same measure in the query and the answer. For season rankings prefer per-race results (finishing or qualifying position); for pace use lap times. Consistent means the smallest standard deviation of the measure, among drivers with a near-full season.
- For a top item (most, fewest, fastest) return every row tied at the top: compare with the max or min, not LIMIT 1.
- If the question needs another season, a sprint or practice session, or data not in these tables, say the data does not cover it and name no driver or result from memory. If a named driver or team has no 2024 row in driver_seasons, say the data has no 2024 record of them and give no figures.
- You have at most 8 tool calls. Before the first query, list each figure the question asks for and the rows it is computed over (session, Position condition, grouping). Then write one query that returns all of them, using FILTER or one CTE per measure when their conditions differ. If a result breaks the season check, fix the condition of that one measure; do not move it into WHERE, where it would change the other measures. Once a result answers the question, answer; do not rerun a query to check it.
- For a chart or a many-item comparison, run the query, then call make_chart with its column names.
- If a result says rows were cut, do not present a table as complete; aggregate in SQL instead.
`;
