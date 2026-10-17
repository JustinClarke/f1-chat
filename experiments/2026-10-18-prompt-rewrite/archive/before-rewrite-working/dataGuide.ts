// Hand-written description of the data, sent to the model with every question.
// Verified against the raw FastF1 Parquet (2024 Bahrain files). Keep it in sync with the views in db.ts.
export const DATA_GUIDE = `
ABOUT THE DATA
- Formula 1 2024 season, Grand Prix weekends only: 24 races. Each weekend has a qualifying session (session = 'Q') and a race (session = 'R').
- The data has NO sprint sessions, no practice sessions, and laps/results cover only 2024.
- Three tables: laps (one row per driver per lap), results (one row per driver per session), and driver_seasons (names, see below).
- driver_seasons: one row per season and driver code, covering 2018 to 2025. Join on driver_code = laps.Driver (or results.Abbreviation) AND season = 2024. Columns: driver_id (stable FastF1 id), full_name, first_name, last_name, team_name (the team the driver raced for most often that season). Use it for all driver and team names.
- Source: FastF1 (official timing data), stored as Parquet and exposed as DuckDB views.

DERIVED COLUMNS (both tables)
- race: the event name in lowercase with underscores, e.g. 'bahrain_grand_prix', 'monaco_grand_prix'. Use ILIKE '%monaco%' to match loosely.
- session: 'R' for race, 'Q' for qualifying.

UNITS
- Every time column (LapTime, Sector*Time, Sector*SessionTime, Time, LapStartTime, PitInTime, PitOutTime, Q1, Q2, Q3) is an integer in NANOSECONDS. Divide by 1e9 for seconds. Example: 5504742000000 = 5504.742 s = 1:31:44.742.
- Speeds (SpeedI1, SpeedI2, SpeedFL, SpeedST) are km/h.
- Times that are NULL mean no value was recorded. Times in qualifying results can be NULL when a driver did not set a time in that segment.

TABLE: laps  (one row per driver per lap; both races and qualifying)
- Time: session time at the END of the lap, in ns from the start of the session.
- Driver: 3-letter driver code, e.g. 'VER', 'NOR', 'LEC'. Use this to identify drivers in laps.
- DriverNumber: car number as text, e.g. '1', '4', '16'.
- LapTime: duration of the lap in ns. NULL for the first lap of a stint and for laps with no valid timing. Exclude NULL LapTime when finding fastest laps.
- LapNumber: lap number within the session, starting at 1.
- Stint: tyre stint number for the driver (1 = first stint, incremented after each pit stop).
- PitOutTime / PitInTime: session time (ns) when the car left / entered the pit lane. NULL if the lap had no pit out / in.
- Sector1Time, Sector2Time, Sector3Time: duration of each sector in ns.
- Sector1SessionTime, Sector2SessionTime, Sector3SessionTime: session time (ns) at the end of each sector.
- SpeedI1, SpeedI2: speed at the two intermediate speed traps (km/h).
- SpeedFL: speed at the finish line (km/h). SpeedST: maximum speed on the longest straight (km/h).
- IsPersonalBest: TRUE if this was the driver's fastest lap in the session so far.
- Compound: tyre compound used: 'SOFT', 'MEDIUM', 'HARD', 'INTERMEDIATE', 'WET', or 'UNKNOWN'.
- TyreLife: number of laps the tyre has been used, including laps on it before this session.
- FreshTyre: TRUE if the tyre was new when fitted, FALSE if it was used before.
- Team: constructor / team name, e.g. 'Red Bull Racing', 'McLaren'.
- LapStartTime: session time (ns) at the START of the lap.
- LapStartDate: wall-clock timestamp at the start of the lap.
- TrackStatus: track status codes during the lap, concatenated. '1' = green (track clear), '2' = yellow flag, '4' = safety car, '5' = red flag, '6' = virtual safety car, '7' = VSC ending. Multiple codes in one lap appear together, e.g. '12' = green then yellow.
- Position: running race position at the end of this lap (in qualifying this is less meaningful).
- Deleted: TRUE if the lap was deleted by the stewards (e.g. track limits). Deleted laps are usually excluded from "fastest lap" questions.
- DeletedReason: the reason text when Deleted is TRUE.
- FastF1Generated: TRUE if FastF1 generated the lap from other data rather than a direct timing record.
- IsAccurate: TRUE if the lap's start and end times line up with the timing data. FALSE laps have approximate times.
- race_id: internal season and round identifier. Do not use for filtering; use race instead.
- season: always 2024.

TABLE: results  (one row per driver per session; both qualifying and race)
- index: row index from the original FastF1 file. Ignore it.
- DriverNumber: car number as text.
- BroadcastName: the driver's name as shown on TV.
- Abbreviation: 3-letter driver code, e.g. 'VER'. Matches laps.Driver.
- DriverId: internal driver identifier. Prefer Abbreviation or FullName.
- TeamName: constructor name, e.g. 'Red Bull Racing'.
- TeamColor: hex colour for the team. Not useful for questions.
- TeamId: internal team identifier.
- FirstName, LastName, FullName: driver's name. FullName is e.g. 'Max Verstappen'.
- CountryCode: driver's nationality code, e.g. 'NED'.
- Position: finishing position in this session, as a number (race finish order, or qualifying order). Position = 1 is the winner (race) or pole sitter (qualifying).
- ClassifiedPosition: finishing position as text ('1', '2', ...), or a status letter for non-classified finishers ('R' retired, 'D' disqualified, 'E' excluded, 'W' withdrawn, 'F' failed to qualify, 'N' not classified).
- GridPosition: starting grid position for the race (1 = pole). NULL in qualifying.
- Q1, Q2, Q3: qualifying segment best lap times in ns. Q1 is for all drivers; Q2 for the top 15 after Q1; Q3 for the top 10. NULL when the driver did not reach that segment.
- Time: RACE only. For the winner, the total race time in ns. For every other finisher, the gap to the winner in ns. NULL for drivers who did not finish or who were lapped out of time. Qualifying rows usually have NULL here.
- Status: race finish status text, e.g. 'Finished', 'Lapped' (finished, but lapped), '+1 Lap', 'Retired', 'Collision'.
- Points: championship points scored in this session. In a race, this is the Grand Prix points: 25 for 1st, 18 for 2nd, 15 for 3rd, 12 for 4th, 10 for 5th, 8 for 6th, 6 for 7th, 4 for 8th, 2 for 9th, 1 for 10th, and 0 for 11th and below. A driver who finishes in the top 10 also gets 1 extra point for the fastest race lap, so the winner can have 26 and a 2nd-place finisher can have 19. The Points column already includes that bonus. Points are not the finishing position: a 2nd-place finish is 18 points, not 2. In qualifying, Points is 0 or NULL.
- Laps: number of laps completed. Present only in qualifying files.
- race_id, season: as in laps.

HOW TO ANSWER COMMON QUESTIONS
- Race wins: count rows in results where session = 'R' AND Position = 1, grouped by FullName (driver) or TeamName (constructor). One race has exactly one winner, so this counts races, not laps.
- Pole positions: count rows in results where session = 'Q' AND Position = 1.
- Championship points: sum Points in results where session = 'R' (Grand Prix race points only; there are no sprint sessions in the data).
- Fastest race lap at a circuit: min(LapTime) over laps where session = 'R' AND race matches AND LapTime IS NOT NULL AND Deleted is not TRUE. Join to results on Driver = Abbreviation for the name if needed.
- Fastest qualifying lap in a race: min(LapTime) over laps where session = 'Q' AND LapTime IS NOT NULL AND Deleted is not TRUE, for that race. Its driver is the fastest qualifier. This is a lap time, not the pole position (Position = 1 in qualifying). Compare that driver with the race winner (results where session = 'R' AND Position = 1) for the same race.
- Lap counts per driver: count rows in laps. A row is one lap, so count of rows is laps completed, not races.
- Races are identified by race. Count distinct race to count races.
- Laps completed by a driver in a race: max(LapNumber) from laps, filtered to session = 'R' and that race, grouped by Driver. Do not use results.Laps: it is NULL for race rows. Join laps to results on race_id when you need finishing data.
- Classified finisher: results.Status is 'Finished' or starts with '+' or is 'Lapped' (they finished, possibly laps down). Anything else ('Retired', 'Disqualified', 'Did not start') is not classified.
- "Finished with fewer laps than the winner" has two readings: classified finishers only (lapped cars), or every driver including retirements. Name the reading you used in your answer and give the list for it. Do not mix the two in one table.
- If a question needs a season other than 2024, a session other than race or qualifying, or data that is not in these two tables, say the data does not cover it. Do not answer from your own knowledge.
- A driver or team the question names that is not in driver_seasons for 2024 has no 2024 data. Say so, and give no points, wins or other figures for them.
`;
