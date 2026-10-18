import { query } from "../db";
import { rowsContent } from "./runSql";
import type { Tool, ToolContext, ToolResult } from "./types";

// The model supplies these values, so they are checked strictly and only then placed in the fixed SQL below.
export function checkDriverCode(v: unknown, label: string): string {
  if (typeof v !== "string" || !/^[A-Za-z]{3}$/.test(v.trim())) throw new Error(`${label} must be a 3-letter driver code such as VER or NOR.`);
  return v.trim().toUpperCase();
}

// Letters, digits, spaces, underscores and hyphens only; spaces become underscores to match values like 'monaco_grand_prix'.
export function checkRace(v: unknown): string {
  if (typeof v !== "string" || !/^[A-Za-z0-9 _-]{2,40}$/.test(v.trim())) throw new Error("race must be a short name such as 'monaco' (letters, digits, spaces only).");
  return v.trim().replace(/\s+/g, "_");
}

export function checkCompareArgs(args: unknown): { race: string; a: string; b: string } {
  const x = (args ?? {}) as Record<string, unknown>;
  const race = checkRace(x.race);
  const a = checkDriverCode(x.driver_a, "driver_a");
  const b = checkDriverCode(x.driver_b, "driver_b");
  if (a === b) throw new Error("driver_a and driver_b must be different drivers.");
  return { race, a, b };
}

export class CompareLapTimesTool implements Tool {
  readonly name = "compare_lap_times";
  readonly definition = {
    type: "function",
    function: {
      name: "compare_lap_times",
      description: "Compare the lap times of two drivers in one race. Pit laps are excluded or kept as the user set in the app. Use for any two-driver lap-time comparison, then make_chart with x=lap, y=lap_s, series=driver_name.",
      parameters: {
        type: "object",
        properties: {
          race: { type: "string", description: "Race name, matched with ILIKE, e.g. 'monaco'" },
          driver_a: { type: "string", description: "3-letter driver code as in laps.Driver, e.g. 'VER'" },
          driver_b: { type: "string", description: "3-letter driver code as in laps.Driver, e.g. 'NOR'" },
        },
        required: ["race", "driver_a", "driver_b"],
      },
    },
  };

  async run(args: unknown, ctx: ToolContext): Promise<ToolResult> {
    const { race, a, b } = checkCompareArgs(args);
    // Every interpolated value is validated above: no quotes or other SQL characters can get through.
    const where = `session = 'R' AND race ILIKE '%${race}%'`;
    const races = (await query(`SELECT DISTINCT race FROM laps WHERE ${where} ORDER BY race`)).map((r) => String(r.race));
    if (races.length === 0) throw new Error(`No 2024 race matches '${race}'.`);
    if (races.length > 1) throw new Error(`'${race}' matches several races (${races.join(", ")}); use a more specific race name.`);
    const pitFilter = ctx.excludePitLaps ? "\n  AND PitInTime IS NULL AND PitOutTime IS NULL" : "";
    // driver_seasons has one row per driver per season (2018 to 2025): the season filter keeps the join to one row per lap.
    const sql = `SELECT laps.LapNumber AS lap, laps.Driver AS driver, COALESCE(ds.full_name, laps.Driver) AS driver_name, round(laps.LapTime/1e9, 3) AS lap_s
FROM laps
LEFT JOIN driver_seasons ds ON ds.driver_code = laps.Driver AND ds.season = 2024
WHERE ${where.replace("session", "laps.session").replace("race ILIKE", "laps.race ILIKE")} AND laps.Driver IN ('${a}', '${b}')
  AND laps.LapTime IS NOT NULL AND laps.Deleted IS NOT TRUE${pitFilter}
ORDER BY laps.LapNumber, laps.Driver`;
    ctx.onSql(sql);
    const rows = await query(sql);
    if (!rows.length) throw new Error(`No timed laps found for ${a} and ${b} in ${races[0]}. Check the driver codes.`);
    const missing = [a, b].filter((d) => !rows.some((r) => r.driver === d));
    const unnamed = [a, b].filter((d) => rows.some((r) => r.driver === d && r.driver_name === d));
    const notes = [
      ...(missing.length ? [`No timed laps for ${missing.join(", ")} in this race.`] : []),
      ...(unnamed.length ? [`No 2024 full name on file for ${unnamed.join(", ")}; driver_name shows the code.`] : []),
    ];
    return {
      content: rowsContent(rows, { race: races[0], ...(notes.length && { note: notes.join(" ") }) }),
      rows, sql,
    };
  }
}
