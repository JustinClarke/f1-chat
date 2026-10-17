import { query } from "./db";

// Deterministic schema profile, computed in SQL. Never calls the model.
export interface ColumnProfile {
  name: string; type: string; nulls: number; null_pct: number; distinct: number;
  min: string | null; max: string | null; values?: { value: unknown; count: number }[];
}
export interface TableProfile { rows: number; columns: ColumnProfile[]; sample: Record<string, unknown>[]; candidate_keys: string[][] }
export type Profile = Record<string, TableProfile>;

const LOW_CARDINALITY = 30;
const q = (c: string) => `"${c.replace(/"/g, '""')}"`;
const num = (v: unknown) => Number(v ?? 0);

async function profileTable(view: string): Promise<TableProfile> {
  const rows = num((await query(`SELECT count(*) AS n FROM ${view}`))[0].n);
  const described = await query(`DESCRIBE ${view}`);
  const columns: ColumnProfile[] = [];
  for (const d of described) {
    const name = String(d.column_name), c = q(name);
    const [s] = await query(`SELECT count(*) - count(${c}) AS nulls, count(DISTINCT ${c}) AS dist,
      min(${c})::VARCHAR AS lo, max(${c})::VARCHAR AS hi FROM ${view}`);
    const col: ColumnProfile = {
      name, type: String(d.column_type), nulls: num(s.nulls), null_pct: rows ? Math.round((num(s.nulls) / rows) * 1000) / 10 : 0,
      distinct: num(s.dist), min: (s.lo as string) ?? null, max: (s.hi as string) ?? null,
    };
    if (col.distinct <= LOW_CARDINALITY) {
      const v = await query(`SELECT ${c} AS value, count(*) AS n FROM ${view} GROUP BY 1 ORDER BY 2 DESC, 1`);
      col.values = v.map((r) => ({ value: r.value, count: num(r.n) }));
    }
    columns.push(col);
  }

  // Seeded reservoir sample so the profile is repeatable.
  const sample = await query(`SELECT * FROM ${view} USING SAMPLE reservoir(5 ROWS) REPEATABLE (42)`);

  // Candidate keys: single columns, then pairs, that are unique over the whole table (checked in SQL).
  // Pairs only use fully non-null columns, and skip columns that are already keys.
  const keys: string[][] = columns.filter((c) => c.nulls === 0 && c.distinct === rows).map((c) => [c.name]);
  const pool = columns.filter((c) => c.nulls === 0 && c.distinct > 1 && c.distinct < rows).map((c) => c.name);
  const pairs = pool.flatMap((a, i) => pool.slice(i + 1).map((b) => [a, b]));
  for (let i = 0; i < pairs.length; i += 25) {
    const chunk = pairs.slice(i, i + 25);
    const [r] = await query(`SELECT ${chunk.map(([a, b], j) => `count(DISTINCT (${q(a)}, ${q(b)})) AS p${j}`).join(", ")} FROM ${view}`);
    chunk.forEach((p, j) => { if (num(r[`p${j}`]) === rows) keys.push(p); });
  }
  return { rows, columns, sample, candidate_keys: keys };
}

export async function profileViews(views = ["laps", "results"]): Promise<Profile> {
  const out: Profile = {};
  for (const v of views) out[v] = await profileTable(v);
  return out;
}
