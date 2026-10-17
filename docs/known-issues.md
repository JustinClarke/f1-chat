# Known issues

Status: open, fixed, or unverified. Keep each entry to a few lines.

## Model
- **Names from memory.** The model sometimes names drivers from its own knowledge instead of the table, even with the name rule. Pit-stop question: with the name rule but no table, 3 of 5 runs had wrong names and 1 gave no answer (20k window). With the all-seasons table, 5 of 5 correct in the 17 Oct trials. Status: open (more runs needed).
- **Over-filtering.** Before the counting rule, the model added LapTime and Deleted filters to lap counts (Monaco: 76, expected 78). After the rule, 3 of 3 correct. Status: fixed for this question; open for others.
- **Ties.** Top-1 queries used LIMIT 1 and hid ties. Tie rule added. Status: mostly fixed (the pit-stop question).
- **Empty replies.** Two causes were found. (a) The reply was cut off by the context window at the default size; 16k fixed it. (b) The model asked for another query and the harness did not run it. Status: both fixed in the harness; (b) also needs checking in the app's loop.
- **HTTP 500 from Ollama.** Seen once, during a 5-run set. No error text in the server log. Did not recur. Status: unverified cause.

## Data
- **Track status codes.** The bronze laps schema (in the data repo) had them wrong. Verified against the bronze track_status table: 3 is never used, 4 = safety car, 5 = red flag, 6 = VSC deployed, 7 = VSC ending. The app's data guide was already right. Status: schema fixed in the data repo (uncommitted there).
- **PitInLap / PitOutLap.** The bronze schema lists them; the 2024 Parquet does not have them. Use PitInTime / PitOutTime. Status: open. The app's data guide does not mention the two columns; the schema summary is generated from the views, so it will not show them either.
- **Driver names in results.** One name per code in 2024. Across 2018 to 2025 some codes map to two driver IDs or two name variants (ALB, ANT, GIO, MSC, BOR). The driver-season table keys on season and code to avoid this. Status: handled.

## Harness vs app
- The trial harness uses the frozen experiment guide (v3.txt), not the app's data guide. Results from the harness do not transfer one-to-one to the app. Status: open.
- The app has its own SQL retry cap (MAX_SQL_RETRIES = 2); the harness has none. Status: open.
