# Prompt rewrite and data guide fixes (17-18 Oct 2026)

Index of one working session. Plain findings are in FINDINGS.md; per-run records are in TRIALS.md and in `../2026-10-17-ollama-manual-trials/status/trials-log.json`.

## What is in the app now

- `web/src/dataGuide.ts` is the **fix-agent candidate** (final c4_example). A copy is `candidates/fixagent_final_dataGuide.ts` (identical, checked with cmp). Scratchpad copy: `opus_fix/dataGuide.ts`.
- The previous version (the rewritten prompt, before the fix agent) is `archive/before-fix-agent-dataGuide.ts`. It is also `candidates/opus_prompt_dataGuide.ts`.
- The **RULES block was removed from `web/src/chat.ts`**. The old one is in `archive/before-rewrite-working/chat.ts`.
- git HEAD (4cbda01) still holds the original; see `archive/original-committed/`. Nothing from this session is committed.

## Order of work

1. 17 Oct, early: eval of the old prompt on Cloudflare (`gpt-oss-20b`), one run per question: `eval/logs/2026-10-17T16-02-39-673Z`.
2. 17 Oct: local Ollama model. First runs hit a 4096-token context; fixed with `eval/ollama/Modelfile` (num_ctx 20480). Run before the rewrite: `eval/logs/2026-10-17T17-19-31-632Z`. (Other folders in `eval/logs/` dated 17 Oct 16-37 to 17-35 are earlier or partial runs and are not summarised here.)
3. 17 Oct: prompt review (`candidates/prompt_proposal.md`), then the rewrite: leaner prompt, new data guide, RULES block removed (`candidates/opus_prompt_DESIGN.md`). Eval: `eval/logs/2026-10-17T18-59-46-794Z`.
4. 17 Oct: fix agent probed five guide variants with `tools/probe.mjs` (3 repeats, guide on only; results in `candidates/fixagent_RESULTS.md`), landing on c4_example. Eval: `eval/logs/2026-10-17T19-47-56-938Z`.

## Headline results (pass out of 13 questions, one run each)

| Step | Prompt | Model | Guide on | Guide off | Log folder |
|---|---|---|---|---|---|
| 1 | old | Cloudflare gpt-oss-20b | 11 | 6 | 2026-10-17T16-02-39-673Z |
| 2 | old, 20k context | local gpt-oss:20b-f1 | 11 | 4 | 2026-10-17T17-19-31-632Z |
| 3 | rewritten | local | 10 | 6 | 2026-10-17T18-59-46-794Z |
| 4 | fix-agent (current) | local | 12 | 5 | 2026-10-17T19-47-56-938Z |

Single runs are noisy (the fix agent's 3-repeat probe, guide on, went 25/39 baseline to 36/39 final, 36/36 excluding Bahrain). Guide-off numbers are for reference only; the app ships with the guide on. Bahrain fails in every step because of the scorer (see FINDINGS.md).

## Folders

- `archive/` prompt snapshots (kept as is).
- `candidates/` every prompt candidate plus design notes and the fix agent's RESULTS.
- `tools/` scripts copied from the session scratchpad. They hold paths to this machine and the scratchpad; update before reuse. Logic unchanged. `eval/ollama/Modelfile` is in the repo and not copied.
- `FINDINGS.md`, `TRIALS.md`.
