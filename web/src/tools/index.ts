import { CompareLapTimesTool } from "./compareLapTimes";
import { MakeChartTool } from "./makeChart";
import { RunSqlTool } from "./runSql";
import type { Tool } from "./types";

export { validateSql, ROW_CAP } from "./runSql";
export { checkChartSpec } from "./makeChart";
export type { Tool, ToolContext, ToolResult, Row } from "./types";

// The tools the chat model sees, in order. run_sql is the fallback for everything compare_lap_times does not cover.
export const defaultTools = (): Tool[] => [new RunSqlTool(), new MakeChartTool(), new CompareLapTimesTool()];
