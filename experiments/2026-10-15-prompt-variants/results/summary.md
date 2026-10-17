# Summary (2026-10-15)

Runs logged: 80 of 80 planned. Seed 20261015. Source: runs.jsonl.

Each cell is passes/runs under the strict scorer (eval/score.mjs). Verdicts other than pass: fail, check manually (CHK), error (infrastructure).

| question | v0 | v1 | v2 | v3 |
|---|---|---|---|---|
| wins_team | 3/5 | 1/5 | 5/5 | 5/5 |
| top_compound | 4/5 | 5/5 | 0/5 | 4/5 |
| bahrain_clean_pace | 1/5 | 4/5 | 5/5 | 3/5 |
| unanswerable | 4/5 (1 CHK) | 5/5 | 5/5 | 5/5 |
| **all** | **12/20** | **15/20** | **15/20** | **17/20** |

## Latency and tokens per variant (medians over runs)

| variant | runs | total latency s | model calls | prompt tokens | completion tokens | reasoning tokens | total tokens | neurons | neurons (sum) |
|---|---|---|---|---|---|---|---|---|---|
| v0 | 20 | 3.93 | 2 | 3652 | 252 | n/a | 4070.5 | 77.85 | 2172 |
| v1 | 20 | 2.63 | 2 | 4242 | 206.5 | n/a | 4435.5 | 82.45 | 1541 |
| v2 | 20 | 2.55 | 2 | 5317 | 181.5 | n/a | 5510 | 101.8 | 1870 |
| v3 | 20 | 3.34 | 2 | 7023 | 176 | n/a | 7205 | 132.65 | 2424 |

## Median latency (s) per variant x question

| question | v0 | v1 | v2 | v3 |
|---|---|---|---|---|
| wins_team | 2.52 | 2.48 | 2.25 | 2.2 |
| top_compound | 2.42 | 2.51 | 2.57 | 2.73 |
| bahrain_clean_pace | 9.67 | 4.86 | 6.48 | 6.74 |
| unanswerable | 5.09 | 1.81 | 1.87 | 1.6 |

## Non-passing runs (21)

- v2|top_compound|rep1 (position 1): fail. missing: laps on that compound (13767). Answer: The most used tyre compound for race laps in 2024 was **HARD**, with **13,612 laps** recorded.
- v0|bahrain_clean_pace|rep1 (position 9): fail. missing: median lap NOR (1:36.537 = 96.5365s); median lap VER (1:35.477 = 95.477s). Answer: Verstappen had the faster race pace. - **Verstappen**: median lap time = 95 590 500 000 µs - **Norris**: median lap time = 96 565 500 000 µs
- v0|bahrain_clean_pace|rep2 (position 20): fail. missing: median lap NOR (1:36.537 = 96.5365s); median lap VER (1:35.477 = 95.477s). Answer: Verstappen had the faster race pace. - **Verstappen**: median lap time = 95,342,000,000 ns (≈ 95.342 s) - **Norris**: median lap time = 96,504,500,000 ns (≈ 96.505 s)
- v2|top_compound|rep2 (position 23): fail. missing: laps on that compound (13767). Answer: The most race laps in 2024 were run on the **HARD** tyre compound, with **13,612 laps** recorded.
- v1|wins_team|rep2 (position 30): fail. missing: wins (9). Answer: Red Bull Racing won the most races in 2024, with **19 victories**.
- v1|wins_team|rep3 (position 33): fail. missing: wins (9). Answer: Red Bull Racing won the most races in 2024, with **19 victories**.
- v2|top_compound|rep3 (position 37): fail. missing: laps on that compound (13767). Answer: The most used tyre compound for race laps in 2024 was **HARD**, with **13,612 laps** recorded.
- v0|bahrain_clean_pace|rep3 (position 48): fail. missing: median lap NOR (1:36.537 = 96.5365s); median lap VER (1:35.477 = 95.477s). Answer: Verstappen had the faster race pace. | Driver | Median lap time (nanoseconds) | Median lap time (seconds) | |--------|------------------------------|---------------------------| | Verstappen | 97,122,
- v1|bahrain_clean_pace|rep4 (position 49): fail. missing: median lap NOR (1:36.537 = 96.5365s); median lap VER (1:35.477 = 95.477s). Answer: **Median lap times (nanoseconds) for green‑flag laps in the 2024 Bahrain Grand Prix** | Driver | Median LapTime | |--------|----------------| | VER | 1 000 000 000 | | NOR | 1 050 000 000 | Verstappen
- v1|wins_team|rep4 (position 53): fail. missing: wins (9). Answer: Red Bull Racing won the most races in 2024, with **19 victories**.
- v0|bahrain_clean_pace|rep4 (position 55): fail. missing: median lap NOR (1:36.537 = 96.5365s); median lap VER (1:35.477 = 95.477s). Answer: Verstappen had the faster race pace. Median lap times (green‑flag laps only, no in‑laps, out‑laps, or deleted laps): - **Verstappen**: 95,342,000,000 ns (≈ 95.342 s) - **Norris**: 96,504,500,000 ns (≈
- v2|top_compound|rep4 (position 56): fail. missing: laps on that compound (13767). Answer: The most used tyre compound for race laps in 2024 was **HARD**, with **13,612 laps** recorded.
- v0|wins_team|rep4 (position 60): fail. missing: wins (9). Answer: Red Bull Racing won the most races in 2024, with **19 victories**.
- v0|unanswerable|rep4 (position 61): check manually. no refusal phrase and no driver named. Answer: I couldn’t find any 2023 Monaco Grand Prix results in the database. The query returned zero rows.
- v3|bahrain_clean_pace|rep4 (position 64): fail. missing: median lap NOR (1:36.537 = 96.5365s); median lap VER (1:35.477 = 95.477s). Answer: Verstappen had the faster race pace. - **Verstappen**: median lap time ≈ 95.48 s - **Norris**: median lap time ≈ 96.54 s (Values are calculated from green‑flag laps only, excluding pit‑in/out laps and
- v0|top_compound|rep5 (position 66): fail. missing: laps on that compound (13767). Answer: The most used tyre compound for race laps in 2024 was **HARD**, with **13,770** laps.
- v3|bahrain_clean_pace|rep5 (position 67): fail. missing: median lap NOR (1:36.537 = 96.5365s); median lap VER (1:35.477 = 95.477s). Answer: Verstappen had the faster race pace. - **Max Verstappen** – median lap time: **95.48 s** - **Lando Norris** – median lap time: **96.54 s** (Values are the median of all green‑flag laps, excluding in‑l
- v3|top_compound|rep5 (position 68): fail. missing: laps on that compound (13767). Answer: The most race laps in 2024 were run on the **HARD** tyre compound, with **13,612 laps** recorded.
- v0|wins_team|rep5 (position 70): fail. missing: wins (9). Answer: Red Bull Racing won the most races in 2024, with **19 victories**.
- v2|top_compound|rep5 (position 76): fail. missing: laps on that compound (13767). Answer: The most used tyre compound for race laps in 2024 was **HARD**, with **13,612 laps** recorded.
- v1|wins_team|rep5 (position 79): fail. missing: wins (9). Answer: Red Bull Racing won the most races in 2024, with **19 victories**.
