import { openAdapter } from "../04-companion-adapter/adapter.mjs";
const a = await openAdapter();
const q = (s) => { try { const r = a.runSql(s); return { n: r.rowCount, sample: r.rows.slice(0, 3) }; } catch (e) { return { error: e.message }; } };
console.log(q("SELECT * FROM int_dirty_air_tax_component LIMIT 1"));
console.log(q("SELECT race_year, race_id, driver_id, lap_id FROM fct_cliff_prediction_features WHERE race_year = 2024 AND race_id = '2024_16' LIMIT 2"));
console.log(q(`SELECT f.driver_id, MAX(d.cumulative_dirty_air_tax_race_s) AS total FROM int_dirty_air_tax_component d JOIN fct_cliff_prediction_features f USING (lap_id) WHERE f.race_year = 2024 AND f.race_id = '2024_16' GROUP BY f.driver_id ORDER BY total DESC`));
console.log(q("SELECT DISTINCT race_id FROM fct_driver_skill_features WHERE race_year = 2024 LIMIT 3"));
console.log(q("SELECT count(*) n FROM fct_driver_skill_features WHERE race_year = 2024 AND driver_residual_mean_s IS NOT NULL AND clean_lap_count >= 10"));
