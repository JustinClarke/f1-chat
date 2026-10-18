import { query } from "../db";
import type { Row, Tool, ToolContext, ToolResult } from "./types";

export const ROW_CAP = 200;

// Returns the cleaned SQL, or throws with a reason the model can read.
export function validateSql(raw: string): string {
  const sql = raw.trim().replace(/;+\s*$/, "");
  if (sql.includes(";")) throw new Error("Only one statement is allowed.");
  if (!/^(select|with)\b/i.test(sql)) throw new Error("Only SELECT or WITH queries are allowed.");
  const bad = sql.match(/\b(insert|update|delete|drop|attach|copy|pragma|install|load)\b/i);
  if (bad) throw new Error(`Forbidden keyword: ${bad[0]}`);
  return /\blimit\s+\d+/i.test(sql) ? sql : `${sql} LIMIT 200`;
}

// The JSON the model reads for a row set: count, the first ROW_CAP rows, and a note when rows were cut.
export function rowsContent(rows: Row[], extra: Record<string, unknown> = {}): string {
  const cut = rows.length > ROW_CAP;
  return JSON.stringify({ ...extra, row_count: rows.length, rows: rows.slice(0, ROW_CAP), ...(cut && { note: `Only the first ${ROW_CAP} of ${rows.length} rows are shown. Aggregate in SQL if you need every value in text.` }) });
}

export class RunSqlTool implements Tool {
  readonly name = "run_sql";
  readonly definition = {
    type: "function",
    function: {
      name: "run_sql",
      description: "Run one read-only DuckDB SELECT/WITH query against the laps, results and driver_seasons tables. Returns up to 200 rows as JSON.",
      parameters: { type: "object", properties: { sql: { type: "string", description: "A single DuckDB SQL SELECT statement" } }, required: ["sql"] },
    },
  };

  async run(args: { sql: string }, ctx: ToolContext): Promise<ToolResult> {
    const sql = validateSql(args.sql);
    ctx.onSql(sql);
    const rows = await query(sql);
    return { content: rowsContent(rows), rows, sql };
  }
}
