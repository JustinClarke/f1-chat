# 05. Driver names come from a table, not from the model

Date: 2026-10-17. Status: current.

**Decision.** The model gets driver and team names from `driver_seasons`, joined on season and driver code. It must not name a driver from a code using its own knowledge.

**Why.** With a name rule alone (20k window), 3 of 5 runs had wrong names, including HUL named as Lando Norris, and one run gave no answer. With the all-seasons table, 5 of 5 were correct.

**Key.** Season and driver code, with the stable FastF1 DriverId carried along. Codes are reused and names vary by season, so the code alone is not a safe key.
