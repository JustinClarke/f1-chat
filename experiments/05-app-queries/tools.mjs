// Spike: three tools that run the app's own SQL (app/src/features/*/queries.ts), not model-written SQL.
// The app's `${table}_${season}` registrations are replaced by the base tables with the same season filter.
// Params are checked against valid values before SQL runs, so the model cannot send a guessed id.
import { readFileSync } from "node:fs";
import { openAdapter } from "../04-companion-adapter/adapter.mjs";

const DRIVER_NAMES = JSON.parse(readFileSync(new URL("./driver_names.json", import.meta.url), "utf8"));
// Full name for a driver_id code. A code missing from the map is reported, never guessed.
export const nameFor = (id) => DRIVER_NAMES[id]?.name ?? `UNKNOWN (${id})`;
const TOP_N = 10;

const SEASONS = [2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025];
const isSeason = (s) => Number.isInteger(s) && SEASONS.includes(s);
const quote = (s) => `'${String(s).replace(/'/g, "''")}'`;

export async function buildTools() {
  const a = await openAdapter();
  const races = (season) => a.runSql(`SELECT race_id, track_id FROM race_to_track WHERE race_id LIKE '${season}_%' ORDER BY race_id`).rows;
  const raceIds = new Set(SEASONS.flatMap((s) => races(s).map((r) => r.race_id)));
  const constructorIds = new Set(a.runSql("SELECT constructor_id FROM dim_constructors").rows.map((r) => r.constructor_id));

  const specs = {
    dirty_air_cost: {
      description: "Dirty-air time cost per driver for one race: total seconds lost to following another car (from the app's Dirty air cost page). Returns one row per driver, largest cost first.",
      grain: "one row per driver for the race",
      rankBy: "total_dirty_air_cost_s",
      parameters: {
        type: "object",
        properties: {
          season: { type: "integer", enum: SEASONS, description: "Season year" },
          race_id: { type: "string", description: "Race id in the form YEAR_ROUND, e.g. 2024_16. Use list_races to find it." },
        },
        required: ["season", "race_id"],
      },
      run({ season, race_id }) {
        if (!isSeason(season)) throw new Error(`season must be one of ${SEASONS.join(", ")}`);
        if (!raceIds.has(race_id)) throw new Error(`unknown race_id ${race_id}; use list_races`);
        return a.runSql(`
          SELECT f.driver_id,
            MAX(d.cumulative_dirty_air_tax_race_s) AS total_dirty_air_cost_s,
            AVG(d.dirty_air_tax_s) AS avg_tax_s,
            SUM(CASE WHEN d.dirty_air_tax_s > 0 THEN 1 ELSE 0 END) AS taxed_laps,
            COUNT(*) AS total_laps
          FROM int_dirty_air_tax_component d
          JOIN fct_cliff_prediction_features f USING (lap_id)
          WHERE f.race_year = ${season} AND f.race_id = ${quote(race_id)}
          GROUP BY f.driver_id
          ORDER BY total_dirty_air_cost_s DESC`).rows;
      },
    },
    driver_consistency: {
      description: "Driver consistency for one season (from the app's Driver consistency page): mean and standard deviation of residual lap time per driver, for drivers with at least 10 clean laps. Lower stddev means more consistent. Quadrant labels are NOT included; medians are not computed here.",
      grain: "one row per driver per race, not per season: the same driver appears once for each race",
      rankBy: "driver_residual_stddev_s",
      parameters: {
        type: "object",
        properties: { season: { type: "integer", enum: SEASONS, description: "Season year" } },
        required: ["season"],
      },
      run({ season }) {
        if (!isSeason(season)) throw new Error(`season must be one of ${SEASONS.join(", ")}`);
        return a.runSql(`
          SELECT driver_id, race_year, driver_residual_mean_s, driver_residual_stddev_s, clean_lap_count, constructor_id
          FROM fct_driver_skill_features
          WHERE race_year = ${season} AND driver_residual_mean_s IS NOT NULL
            AND driver_residual_stddev_s IS NOT NULL AND clean_lap_count >= 10
          ORDER BY driver_residual_stddev_s ASC`).rows;
      },
    },
    constructor_pace: {
      description: "Constructor structural pace (from the app's Constructor pace page): estimated pace in seconds with standard error and 95% interval, for one race or averaged over a season. Lower pace_s is faster.",
      grain: "one row per constructor, for one race or averaged over the season",
      rankBy: "constructor_structural_pace_s",
      parameters: {
        type: "object",
        properties: {
          season: { type: "integer", enum: SEASONS, description: "Season year" },
          race_id: { type: "string", description: "Optional race id (YEAR_ROUND). Omit for the season average." },
          mode: { type: "string", enum: ["race", "qualifying"], description: "Race pace or qualifying pace. Default race." },
        },
        required: ["season"],
      },
      run({ season, race_id = null, mode = "race" }) {
        if (!isSeason(season)) throw new Error(`season must be one of ${SEASONS.join(", ")}`);
        if (race_id && !raceIds.has(race_id)) throw new Error(`unknown race_id ${race_id}; use list_races`);
        const table = mode === "qualifying" ? "int_constructor_structural_pace_qualifying" : "int_constructor_structural_pace";
        if (race_id) {
          return a.runSql(`
            SELECT constructor_id, constructor_structural_pace_s, constructor_structural_pace_se_s,
              constructor_structural_pace_ci_low_s, constructor_structural_pace_ci_high_s, panel_observations_n, 1 AS races_n
            FROM ${table} WHERE race_year = ${season} AND race_id = ${quote(race_id)}
            ORDER BY constructor_structural_pace_s`).rows;
        }
        return a.runSql(`
          SELECT constructor_id,
            AVG(constructor_structural_pace_s) AS constructor_structural_pace_s,
            AVG(constructor_structural_pace_se_s) AS constructor_structural_pace_se_s,
            AVG(constructor_structural_pace_ci_low_s) AS constructor_structural_pace_ci_low_s,
            AVG(constructor_structural_pace_ci_high_s) AS constructor_structural_pace_ci_high_s,
            SUM(panel_observations_n) AS panel_observations_n, COUNT(*) AS races_n
          FROM ${table} WHERE race_year = ${season}
          GROUP BY constructor_id ORDER BY AVG(constructor_structural_pace_s)`).rows;
      },
    },
    list_races: {
      description: "List the races in a season with their race_id and track name. Use this to find a race_id.",
      parameters: { type: "object", properties: { season: { type: "integer", enum: SEASONS } }, required: ["season"] },
      run({ season }) {
        if (!isSeason(season)) throw new Error(`season must be one of ${SEASONS.join(", ")}`);
        return races(season);
      },
    },
  };

  const definitions = Object.entries(specs).map(([name, s]) => ({
    type: "function",
    function: { name, description: s.description, parameters: s.parameters },
  }));
  const grainFor = (name) => specs[name]?.grain ?? null;
  const call = (name, args) => {
    const spec = specs[name];
    if (!spec) throw new Error(`no tool named ${name}`);
    let rows = spec.run(args).map((r) => Object.fromEntries(Object.entries(r).map(([k, v]) => [k, v !== null && typeof v === "object" && !Array.isArray(v) ? Number(String(v)) : typeof v === "bigint" ? Number(v) : v])));
    const total = rows.length;
    if (!spec.rankBy) return { rowCount: total, rows: rows.slice(0, 25) }; // list_races: no ranking, no top-10 cut
    // Competition ranking on the value rounded to 3 dp (as shown): ties share a rank. Row order is kept.
    const key = (r) => Math.round(r[spec.rankBy] * 1000);
    rows = rows.map((r, i) => {
      const rank = i > 0 && key(r) === key(rows[i - 1]) ? null : i + 1;
      return { r, rank };
    });
    for (let i = 0; i < rows.length; i++) if (rows[i].rank === null) rows[i].rank = rows[i - 1].rank;
    rows = rows.map(({ r, rank }) => ({ rank, ...r }));
    for (const r of rows) if ("driver_id" in r) r.driver_name = nameFor(r.driver_id);
    const shown = rows.slice(0, TOP_N);
    const lastRank = shown.length ? shown[shown.length - 1].rank : null;
    const tiedBeyondCut = rows.slice(TOP_N).filter((r) => r.rank === lastRank).length;
    const out = { rowCount: total, rowsShown: shown.length, rowsDropped: total - shown.length, rankedBy: spec.rankBy, rows: shown };
    if (total > shown.length) out.note = `Only the top ${TOP_N} of ${total} rows are shown; ${total - shown.length} rows were dropped.` + (tiedBeyondCut ? ` ${tiedBeyondCut} dropped row(s) are tied with rank ${lastRank}.` : "");
    return out;
  };
  return { definitions, call, grainFor, names: Object.keys(specs) };
}
