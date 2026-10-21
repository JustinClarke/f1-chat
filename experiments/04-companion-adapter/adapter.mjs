// Read-only adapter: gold warehouse tables from the off-the-pace export, queried in Node DuckDB.
// Mirrors the Query Lab engine (off-the-pace app/src/data/duckdb/queryLab.ts): the same single-statement
// and forbidden-keyword guard, the same table resolution from the manifest, and the same row cap.
// Node stand-in for runLabQuery; the guard is a port, not an import, because queryLab.ts depends on the browser DuckDB client.
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import path from "node:path";

export const APP_PUBLIC = "/Users/justin/github/off-the-pace/app/public";
export const MAX_ROWS = 200;

// Same patterns as queryLab.ts.
const ALLOWED_LEADING = /^(SELECT|WITH|EXPLAIN|DESCRIBE|DESC|SUMMARIZE|SHOW|PRAGMA|PIVOT|TABLE|VALUES|FROM)\b/i;
const FORBIDDEN = /\b(CREATE|DROP|ALTER|INSERT|UPDATE|DELETE|TRUNCATE|ATTACH|DETACH|COPY|INSTALL|LOAD|CALL|SET|RESET|EXPORT|IMPORT)\b/i;

const stripComments = (sql) => sql.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/--[^\n]*/g, " ").trim();

export function assertReadOnly(sql) {
  const cleaned = stripComments(sql);
  if (!cleaned) throw new Error("Empty query.");
  const body = cleaned.replace(/;\s*$/, "");
  if (body.includes(";")) throw new Error("Only a single statement may be run at a time.");
  if (!ALLOWED_LEADING.test(body)) throw new Error("Only read-only queries are allowed (SELECT, WITH, EXPLAIN, DESCRIBE, SUMMARIZE, SHOW, PRAGMA table_info, PIVOT).");
  if (/^PRAGMA\b/i.test(body) && !/^PRAGMA\s+table_info\b/i.test(body)) throw new Error("Only `PRAGMA table_info(...)` is permitted.");
  if (FORBIDDEN.test(body)) throw new Error("This statement type is not allowed in the read-only Query Lab.");
}

export function resolveTablesInSql(sql, tableNames) {
  const tokens = new Set(stripComments(sql).toLowerCase().match(/[a-z_][a-z0-9_]*/g) ?? []);
  return tableNames.filter((n) => tokens.has(n.toLowerCase()));
}

// Boots Node DuckDB-WASM (blocking build, as run_eval.mjs does), registers the gold tables as views.
export async function openAdapter() {
  const require = createRequire(import.meta.url);
  const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), "../..");
  const dist = path.join(root, "node_modules/@duckdb/duckdb-wasm/dist");
  const duck = require(`${dist}/duckdb-node-blocking.cjs`);
  const db = await duck.createDuckDB(
    { mvp: { mainModule: `${dist}/duckdb-mvp.wasm`, mainWorker: "" }, eh: { mainModule: `${dist}/duckdb-eh.wasm`, mainWorker: "" } },
    new duck.ConsoleLogger(duck.LogLevel.WARNING),
    duck.NODE_RUNTIME,
  );
  await db.instantiate(() => {});
  const conn = db.connect();

  const manifest = JSON.parse(readFileSync(`${APP_PUBLIC}/data/_manifest.json`, "utf8"));
  const tables = manifest.tables;
  const names = tables.map((t) => t.name);
  const sourceOf = (t) => (t.partitioned ? `${APP_PUBLIC}${t.path}/**/*.parquet` : `${APP_PUBLIC}${t.path}`);
  const viewed = new Set();

  // Views are created on first use so only the tables a query names are read.
  function ensureViews(sql) {
    for (const name of resolveTablesInSql(sql, names)) {
      if (viewed.has(name)) continue;
      const t = tables.find((x) => x.name === name);
      conn.query(`CREATE OR REPLACE VIEW ${name} AS SELECT * FROM read_parquet('${sourceOf(t)}', hive_partitioning=true, union_by_name=true)`);
      viewed.add(name);
    }
  }

  // Schema for the system prompt: table name, source type, and columns. Short categorical
  // VARCHAR columns (at most MAX_ENUM distinct values) also list them.
  const MAX_ENUM = 12;
  function schemaText() {
    if (viewsOn) return viewsSchemaText();
    const lines = [];
    for (const t of tables) {
      const from = `read_parquet('${sourceOf(t)}', hive_partitioning=true, union_by_name=true)`;
      const cols = conn.query(`DESCRIBE SELECT * FROM ${from}`).toArray();
      const described = cols.map((c) => {
        if (process.env.SCHEMA_VALUES !== "on" || c.column_type !== "VARCHAR") return `${c.column_name} ${c.column_type}`;
        const vals = conn.query(`SELECT DISTINCT "${c.column_name}" AS v FROM ${from} WHERE "${c.column_name}" IS NOT NULL LIMIT ${MAX_ENUM + 1}`).toArray().map((r) => r.v);
        if (vals.length === 0 || vals.length > MAX_ENUM) return `${c.column_name} ${c.column_type}`;
        return `${c.column_name} ${c.column_type} (values: ${vals.sort().join(", ")})`;
      });
      lines.push(`${t.name}(${described.join(", ")})`);
    }
    return lines.join("\n");
  }

  // Wide pre-joined views (VIEWS=on). Created on open over the gold Parquet; not subject to the read-only guard (adapter-internal).
  const P = (name) => { const t = tables.find((x) => x.name === name); return `read_parquet('${sourceOf(t)}', hive_partitioning=true, union_by_name=true)`; };
  const VIEW_NAMES = ["v_corners", "v_stints", "v_driver_season_skill"];
  const VIEW_SQL = {
    v_corners: `CREATE OR REPLACE VIEW v_corners AS
      SELECT c.driver_id, c.race_year, c.race_id,
             array_to_string(list_transform(string_split(r.track_id, '_'), x -> upper(x[1]) || x[2:]), ' ') AS race_name,
             r.track_id AS track,
             replace(c.corner_name, '_', ' ') AS corner_name,
             c.braking_point_m, c.v_min_kph, c.throttle_point_m, c.lap_number
      FROM ${P("int_corner_metrics")} c JOIN ${P("race_to_track")} r ON r.race_id = c.race_id`,
    v_stints: `CREATE OR REPLACE VIEW v_stints AS
      SELECT s.driver_id, d.driver_number, s.constructor_id, s.race_id, s.race_year, r.track_id,
             s.compound, s.stint_length_laps
      FROM ${P("fct_stint_features")} s
      JOIN ${P("race_to_track")} r ON r.race_id = s.race_id
      JOIN ${P("dim_drivers")} d ON d.driver_id = s.driver_id`,
    v_driver_season_skill: `CREATE OR REPLACE VIEW v_driver_season_skill AS
      SELECT k.driver_race_id, k.driver_id, k.race_year, k.race_id, r.track_id, k.circuit_key, k.constructor_id,
             k.driver_residual_mean_s, k.driver_residual_stddev_s, k.clean_lap_count
      FROM ${P("fct_driver_skill_features")} k JOIN ${P("race_to_track")} r ON r.race_id = k.race_id`,
  };
  const viewsOn = process.env.VIEWS === "on";
  function createViews() { for (const n of VIEW_NAMES) conn.query(VIEW_SQL[n]); }
  if (viewsOn) createViews();

  // driver_id lists let the model use stored codes (VER) rather than guessing names (verstappen).
  const FULL_VALUE_COLS = new Set(["v_corners.track", "v_corners.corner_name", "v_corners.driver_id", "v_stints.compound", "v_stints.driver_id", "v_driver_season_skill.driver_id"]);
  function viewsSchemaText() {
    return VIEW_NAMES.map((n) => {
      const cols = conn.query(`DESCRIBE SELECT * FROM ${n}`).toArray();
      return `${n}(${cols.map((c) => {
        if (!FULL_VALUE_COLS.has(`${n}.${c.column_name}`)) return `${c.column_name} ${c.column_type}`;
        const vals = conn.query(`SELECT DISTINCT "${c.column_name}" AS v FROM ${n} WHERE "${c.column_name}" IS NOT NULL`).toArray().map((r) => r.v).sort();
        return `${c.column_name} ${c.column_type} (values: ${vals.join(", ")})`;
      }).join(", ")})`;
    }).join("\n");
  }

  function runSql(sql) {
    assertReadOnly(sql);
    ensureViews(sql);
    const started = performance.now();
    const result = conn.query(stripComments(sql).replace(/;\s*$/, ""));
    const all = result.toArray();
    const rows = all.slice(0, MAX_ROWS).map((r) => {
      const o = r.toJSON();
      for (const k in o) if (typeof o[k] === "bigint") o[k] = Number(o[k]);
      return o;
    });
    return {
      columns: result.schema.fields.map((f) => f.name),
      rows,
      rowCount: all.length,
      truncated: all.length > MAX_ROWS,
      elapsedMs: Math.round(performance.now() - started),
    };
  }

  return { runSql, schemaText, tableNames: names, createViews, viewNames: VIEW_NAMES };
}
