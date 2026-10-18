import type { ChartSpec } from "../chart";
import type { Row, Tool, ToolContext, ToolResult } from "./types";

export function checkChartSpec(args: unknown, rows: Row[]): ChartSpec {
  const a = (args ?? {}) as Record<string, unknown>;
  if (a.type !== "bar" && a.type !== "line") throw new Error('type must be "bar" or "line".');
  if (typeof a.x !== "string" || typeof a.y !== "string") throw new Error("x and y must be column name strings.");
  if (!rows.length) throw new Error("No rows to chart; run a successful run_sql query first.");
  const cols = [a.x, a.y, ...(a.series != null ? [a.series] : [])] as string[];
  for (const col of cols) if (typeof col !== "string" || !(col in rows[0])) throw new Error(`Column ${col} is not in the last query result (columns: ${Object.keys(rows[0]).join(", ")}).`);
  const y = a.y;
  if (!rows.every((r) => r[y] != null && r[y] !== "" && Number.isFinite(Number(r[y])))) throw new Error(`Column ${y} is not numeric; choose a numeric column for y.`);
  let series: string | undefined;
  if (a.series != null) {
    if (typeof a.series !== "string") throw new Error("series must be a column name string.");
    series = a.series;
    if (!rows.every((r) => r[series!] != null)) throw new Error(`Column ${series} has empty values; filter them out in SQL before charting.`);
    const seen = new Set(rows.map((r) => JSON.stringify([r[a.x as string], r[series!]])));
    if (seen.size !== rows.length) throw new Error(`Each ${a.x} and ${series} pair must be one row; the result has repeats. Aggregate in SQL first.`);
  }
  return { type: a.type, x: a.x, y, series, title: typeof a.title === "string" ? a.title : undefined };
}

export class MakeChartTool implements Tool {
  readonly name = "make_chart";
  readonly definition = {
    type: "function",
    function: {
      name: "make_chart",
      description: "Draw a chart of the rows from your most recent successful run_sql query. Give column names from that query only; the rows are not resent. Use bar for categories (teams, drivers), line for an ordered x such as lap or race number. To compare several drivers or teams on one chart, pass their name column as series: each value gets its own line or bar group, with a legend. Each x and series pair must appear in one row only.",
      parameters: {
        type: "object",
        properties: {
          type: { type: "string", enum: ["bar", "line"] },
          x: { type: "string", description: "Column for the category or order axis" },
          y: { type: "string", description: "Numeric column for the value axis" },
          series: { type: "string", description: "Optional column whose values split the chart into one line or bar group each, e.g. the driver name" },
          title: { type: "string", description: "Short chart title" },
        },
        required: ["type", "x", "y"],
      },
    },
  };

  async run(args: unknown, ctx: ToolContext): Promise<ToolResult> {
    const rows = ctx.lastRows;
    const spec = checkChartSpec(args, rows);
    return {
      content: JSON.stringify({ ok: true, drawn: `${spec.type} chart of ${spec.y} by ${spec.x}${spec.series ? `, one series per ${spec.series}` : ""}, ${rows.length} rows` }),
      chart: { spec, rows },
    };
  }
}
