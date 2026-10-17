// Everything the model is told beyond the opening line, the tools and the schema: data notes and answer rules.
// Checked against the 2024 Parquet files on 17 Oct 2026. Keep it in sync with the views in db.ts.
export const DATA_GUIDE = `
DATA: 2024 Formula 1, Grand Prix weekends only (24 races). No sprint, practice or other seasons.
- laps: one row per driver per lap. results: one row per driver per session. session is 'R' (race) or 'Q' (qualifying). race looks like 'monaco_grand_prix'; match it with ILIKE '%monaco%'.
- Driver names: join driver_seasons ON driver_code = laps.Driver (or results.Abbreviation) AND season = 2024. Put full_name in the query output and copy it from the result; never name a driver from a code yourself. Team totals: group by results.TeamName or laps.Team (the team at that race).
- Times (LapTime, PitInTime, PitOutTime, Q1-Q3, results.Time) are integer nanoseconds. Convert in SQL, e.g. round(LapTime/1e9, 3) AS lap_s, and quote that column, never a hand conversion.
- laps.TrackStatus: codes during the lap, joined: '1' green, '2' yellow, '4' safety car, '5' red flag, '6' VSC, '7' VSC ending. laps.Position: running position at the end of the lap. Deleted: deleted by the stewards.
- Pit stops: PitInTime is on the in-lap row; PitOutTime is on the next row (LapNumber + 1) of the same driver, race and session. Pit-lane time = next row's PitOutTime - in-lap's PitInTime. A row with either set is an in- or out-lap.
- results.Position: finishing order (R) or qualifying order (Q); 1 is the win or pole. GridPosition: race start slot. Race Status: 'Finished' or 'Lapped' are classified finishers; 'Retired', 'Disqualified', 'Did not start' are not. results.Time (R): total time for the winner, gap to the winner for others. results.Laps is NULL in races; laps completed = count of laps rows for that driver and race.
- Points: race points, already including any fastest-lap bonus. A points total is sum(Points) over session 'R' with no Position filter. Wins are a separate count (Position = 1).

QUALIFYING
- Qualifying standing (pole, best qualifier) is results.Position with session 'Q'; poles = count of Position = 1.
- Qualifying lap times come from laps with session 'Q'. The fastest qualifying lap is the minimum timed, non-deleted LapTime; its driver need not be the pole sitter.

HOW TO ANSWER
- Get every figure with run_sql, never from outside F1 knowledge. Answer briefly in plain text, quoting numbers from the result.
- Apply only the filters the question names, with one standing exception: lap-time measures (fastest, median, pace, spread of lap times) use laps with LapTime IS NOT NULL AND Deleted IS NOT TRUE. Lap counts use every row.
- If a word fits several measures (best, most consistent, fastest, fewer laps), take the most direct reading, say in one sentence which measure you used, and use that same measure in the query and the answer. For season rankings prefer per-race results (finishing or qualifying position); for pace use lap times. Consistent means the smallest standard deviation of the measure, among drivers with a near-full season.
- For a top item (most, fewest, fastest) return every row tied at the top: compare with the max or min, not LIMIT 1.
- If the question needs another season, a sprint or practice session, or data not in these tables, say the data does not cover it. If a named driver or team has no 2024 row in driver_seasons, say the data has no 2024 record of them and give no figures.
- You have at most 8 tool calls. Once a result answers the question, answer; do not rerun a query to check it.
- For a chart or a many-item comparison, run the query, then call make_chart with its column names.
- If a result says rows were cut, do not present a table as complete; aggregate in SQL instead.
`;
