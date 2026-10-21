# Eval runs this session

Also recorded as items in `../02-ollama-manual-trials/status/trials-log.json` (ids `eval-...`).

| Run folder (experiments/_shared/logs/) | Model | Prompt | Context | Guide on | Guide off |
|---|---|---|---|---|---|
| 2026-10-17T16-02-39-673Z | Cloudflare @cf/openai/gpt-oss-20b | old | n/a | 11/13 | 6/13 |
| 2026-10-17T17-19-31-632Z | local gpt-oss:20b-f1 | old | 20480 | 11/13 | 4/13 |
| 2026-10-17T18-59-46-794Z | local | rewritten | 20480 | 10/13 | 6/13 |
| 2026-10-17T19-47-56-938Z | local | fix-agent (current in app) | 20480 | 12/13 | 5/13 |

One run per question. Guide-on failures: Cloudflare run team_wins_and_points (error) and distinct_winners; 17-19 team_wins_and_points and distinct_winners; 18-59 team_wins_and_points, top_compound, bahrain; 19-47 bahrain only.
