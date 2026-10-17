# 06. The driver table is a dbt model in the data repo

Date: 2026-10-17. Status: current.

**Decision.** `dim_driver_seasons` is a dbt model in `/Users/justin/github/off-the-pace/transform/models/reference`. The app reads only its exported Parquet, `bronze/reference/drivers/driver_seasons.parquet`.

**Why.** The data repo already builds the reference dimensions, and the model has tests (unique on season and code, not-null on the key columns). The app stays a consumer.

**How to rebuild.** `cd transform && ../.venv/bin/dbt run --select dim_driver_seasons --profiles-dir profiles`, then a DuckDB COPY of `main.dim_driver_seasons` from `data/dev.duckdb` to the Parquet path above.
