import { buildTools } from "./tools.mjs";
const t = await buildTools();
console.log(JSON.stringify(t.call("dirty_air_cost", { season: 2024, race_id: "2024_16" })).slice(0, 300));
console.log(JSON.stringify(t.call("driver_consistency", { season: 2024 })).slice(0, 300));
console.log(JSON.stringify(t.call("constructor_pace", { season: 2024 })).slice(0, 300));
try { t.call("dirty_air_cost", { season: 2024, race_id: "monza" }); } catch (e) { console.log("guard:", e.message); }
