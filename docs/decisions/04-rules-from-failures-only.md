# 04. Rules come from observed failures

Date: 2026-10-17. Status: current.

**Decision.** Each prompt rule maps to a failure seen in a trial. No general F1 background, no worked examples.

**Why.** The user asked for no bloat, and no worked examples so the model does not overthink. Background F1 facts would not have fixed any observed failure: the errors were in query logic and in using memory for names.

**Current rules and their failures.** Filters (added filters, Monaco 76); counting (same); ambiguity (no stated reading); ties (LIMIT 1); names (names from memory).
