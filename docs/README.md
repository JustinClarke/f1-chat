# Docs index

Start here. Read HANDOFF.md, then the last entry in LOG.md. Under 5 minutes.

| File | Holds | Update when |
|---|---|---|
| [HANDOFF.md](HANDOFF.md) | Current state, how to run, next steps, open decisions | End of every session (replace, do not append) |
| [LOG.md](LOG.md) | One short entry per session, newest first | End of every session |
| [decisions/](decisions/) | One file per decision: what, why, date | When a choice is made. Supersede rather than edit history |
| [known-issues.md](known-issues.md) | Data and model problems we have seen, with status | When found or fixed |
| [../experiments/](../experiments/) | One folder per experiment (PROTOCOL, RESULTS) | Per experiment. Index in experiments/README.md |
| [archive/](archive/) | Old handoff and build log from 15 Oct | Never. Read only if you need the older detail |

Rules:
- Mark anything not checked as "unverified".
- Do not copy run commands between files. Keep them in the README at the repo root and HANDOFF.md, nowhere else.
- The prompt text lives in code (`web/src/chat.ts`, `web/src/dataGuide.ts`), not in docs.
- Data repo: `/Users/justin/github/off-the-pace` (dbt models, bronze Parquet). Changes there are tracked in that repo, not here.
