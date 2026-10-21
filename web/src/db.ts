import * as duckdb from "@duckdb/duckdb-wasm";
import mvpWasm from "@duckdb/duckdb-wasm/dist/duckdb-mvp.wasm?url";
import mvpWorker from "@duckdb/duckdb-wasm/dist/duckdb-browser-mvp.worker.js?url";
import ehWasm from "@duckdb/duckdb-wasm/dist/duckdb-eh.wasm?url";
import ehWorker from "@duckdb/duckdb-wasm/dist/duckdb-browser-eh.worker.js?url";

export const DATA_URL = import.meta.env.VITE_DATA_URL ?? "http://localhost:8000";
// Async (browser) and blocking (Node eval) connections both fit: callers just await query().
type Conn = { query(sql: string): any };
let conn: Conn;

export async function initDb(): Promise<void> {
  const bundle = await duckdb.selectBundle({
    mvp: { mainModule: mvpWasm, mainWorker: mvpWorker },
    eh: { mainModule: ehWasm, mainWorker: ehWorker },
  });
  const db = new duckdb.AsyncDuckDB(new duckdb.ConsoleLogger(duckdb.LogLevel.WARNING), new Worker(bundle.mainWorker!));
  await db.instantiate(bundle.mainModule);
  conn = await db.connect();

  // DuckDB-WASM can't glob over HTTP, so the data server lists the matching files.
  const manifest: Record<string, string[]> = await (await fetch(`${DATA_URL}/manifest.json`)).json();
  await loadViews(conn, manifest, (f) => db.registerFileURL(f, `${DATA_URL}/${f}`, duckdb.DuckDBDataProtocol.HTTP, false));
}

// Also used by experiments/_shared/run_eval.mjs, which supplies a Node DuckDB-WASM connection and registers files itself.
export async function loadViews(c: Conn, manifest: Record<string, string[]>, register: (file: string) => unknown): Promise<void> {
  conn = c;
  for (const [table, files] of Object.entries(manifest)) {
    for (const f of files) await register(f);
    const list = files.map((f) => `'${f}'`).join(",");
    // Reference tables already carry their own columns; no race/session derivation.
    if (table === "driver_seasons") {
      await conn.query(`CREATE VIEW ${table} AS SELECT * FROM read_parquet([${list}])`);
      continue;
    }
    // race/session exist only in the file path, so derive them. Race-day files have no session= folder.
    // Drop the mostly-null path-ish columns.
    await conn.query(`CREATE VIEW ${table} AS
      SELECT * EXCLUDE (filename, session_type${table === "laps" ? ", race_name" : ", HeadshotUrl"}),
        regexp_extract(filename, 'race=([^/]+)', 1) AS race,
        CASE WHEN filename LIKE '%/session=Q/%' THEN 'Q' ELSE 'R' END AS session
      FROM read_parquet([${list}], union_by_name = true, filename = true, hive_partitioning = false)`);
  }
}

const plain = (_: string, v: unknown) => (typeof v === "bigint" ? Number(v) : v);

export async function query(sql: string): Promise<Record<string, unknown>[]> {
  const t = await conn.query(sql);
  return JSON.parse(JSON.stringify(t.toArray().map((r: any) => r.toJSON()), plain));
}

// For statements with no result set (CREATE/INSERT).
export async function exec(sql: string): Promise<void> {
  await conn.query(sql);
}

export async function schemaSummary(): Promise<string> {
  let out = "";
  for (const t of ["laps", "results", "driver_seasons"]) {
    const cols = await query(`DESCRIBE ${t}`);
    if (t === "driver_seasons") out += "driver_seasons: one row per driver per season. Map a laps.Driver code (e.g. VER) to the driver's name with full_name. Always filter season = 2024; the table covers 2018 to 2025.\n";
    out += `TABLE ${t} (${cols.map((c) => `${c.column_name} ${c.column_type}`).join(", ")})\n`;
    const rows = await query(t === "driver_seasons" ? `SELECT * FROM ${t} WHERE season = 2024 LIMIT 3` : `SELECT * FROM ${t} WHERE session = 'R' LIMIT 3`);
    out += `Sample rows:\n${rows.map((r) => JSON.stringify(r, (k, v) => (typeof v === "string" && v.length > 40 ? v.slice(0, 40) : v))).join("\n")}\n\n`;
  }
  return out;
}
