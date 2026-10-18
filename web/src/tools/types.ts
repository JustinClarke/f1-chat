import type { ChartSpec } from "../chart";

export type Row = Record<string, unknown>;

// What a tool can see and do during one question. The session owns it and passes the same object to every tool call.
export interface ToolContext {
  lastRows: Row[]; // rows of the most recent successful row-producing tool, for make_chart
  excludePitLaps: boolean; // the app's "Exclude pit laps" setting, read by lap-time tools at run time
  onSql: (sql: string) => void; // show the SQL about to run (called before it runs, so a failing query is still shown)
}

// What a tool hands back. content is the JSON string the model reads; the other fields tell the session what was produced.
export interface ToolResult {
  content: string;
  rows?: Row[]; // set when the tool produced a row set: becomes the session's lastRows and joins the table fallback
  sql?: string; // the SQL that was run, if any
  chart?: { spec: ChartSpec; rows: Row[] }; // set when the tool wants a chart drawn
}

// A tool throws an Error with a model-readable message on bad input; the session turns it into {error} and counts it.
export interface Tool {
  readonly name: string;
  readonly definition: unknown; // OpenAI-style function schema
  run(args: any, ctx: ToolContext): Promise<ToolResult>;
}
