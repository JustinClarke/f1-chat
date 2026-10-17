# 02. Manual trials before automated runs

Date: 2026-10-17. Status: current.

**Decision.** Test one question at a time by hand, and write rules only after a specific failure is seen. Automated repeat runs come after the rules are settled.

**Why.** The user asked to see each step of the prompt → SQL → rows → answer cycle. Hand-driven steps showed the actual failures (wrong column, hidden ties, invented filters) that an automated grid would only count.

**Trade-off.** Few runs per condition, so the rates are rough. Repeats are still needed before any claim about a failure rate.
