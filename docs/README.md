# Docs index

Start here. Read STATUS.json. Under 5 minutes.

| File | Holds | Update when |
|---|---|---|
| [STATUS.json](STATUS.json) | The single status file: goal, phase status, decisions, open questions, next step, prototype state and known problems, dated session log, and the end-of-session checklist | End of every session. This is the only file you must edit |
| [decisions/](decisions/) | One file per lasting decision: what, why, date. Immutable records | When a lasting choice is made. Supersede rather than edit history |
| [known-issues.md](known-issues.md) | Detail on data and model problems, with status (the summary list is in STATUS.json under prototype.known_problems) | Only when a problem needs more than a line |
| [../_archive/docs/](../_archive/docs/) | Retired handoffs, logs and build log (15 and 18 Oct) | Never. Read only if you need the older detail |
| [../experiments/](../experiments/) | One numbered folder per experiment (PROTOCOL, RESULTS, its own eval files); shared scorer in experiments/_shared/ | Per experiment. Index in experiments/README.md |

Rules:
- Mark anything not checked as "unverified".
- Run commands live in the README at the repo root, nowhere else.
- The prompt text lives in code (`web/src/chat.ts`, `web/src/dataGuide.ts`), not in docs.
- Data repo: `/Users/justin/github/off-the-pace` (dbt models, bronze Parquet). Changes there are tracked in that repo, not here.
