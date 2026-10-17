import { createRequire } from "node:module"; import { readdirSync, readFileSync } from "node:fs"; import path from "node:path";
const require = createRequire(import.meta.url); const duckdb = require("./node_modules/duckdb");
const DATA_ROOT="/Users/justin/github/off-the-pace/data"; const db=new duckdb.Database(":memory:"); const con=new duckdb.Connection(db);
const all=(s)=>new Promise((res,rej)=>con.all(s,(e,r)=>e?rej(e):res(r)));
for (const table of ["laps","results"]) { const dir=`${DATA_ROOT}/bronze/${table}/season=2024`; const files=[];
  const walk=(d)=>{for(const f of readdirSync(d,{withFileTypes:true})){const p=path.join(d,f.name); f.isDirectory()?walk(p):f.name.endsWith(".parquet")&&files.push(p);}}; walk(dir); files.sort();
  const extra= table==="laps"?", race_name":", HeadshotUrl";
  await all(`CREATE VIEW ${table} AS SELECT * EXCLUDE (filename, session_type${extra}), regexp_extract(filename,'race=([^/]+)',1) AS race, CASE WHEN filename LIKE '%/session=Q/%' THEN 'Q' ELSE 'R' END AS session FROM read_parquet([${files.map(f=>`'${f}'`).join(",")}], union_by_name=true, filename=true, hive_partitioning=false)`);}
await all(`CREATE VIEW driver_seasons AS SELECT * FROM read_parquet('${DATA_ROOT}/bronze/reference/drivers/driver_seasons.parquet')`);
const N=(r)=>r.map(o=>Object.fromEntries(Object.entries(o).map(([k,v])=>[k,typeof v==="bigint"?Number(v):v])));
const base=`WITH driver_laps AS (
  SELECT r.race, r.Abbreviation AS driver_abbrev, MAX(l.LapNumber) AS driver_laps
  FROM results r JOIN laps l ON l.race = r.race AND l.session='R' AND l.Driver = r.Abbreviation
  WHERE r.session='R' AND (r.Status LIKE 'Finished%' OR r.Status LIKE 'Lapped%' OR r.Status LIKE '+% Lap')
  GROUP BY r.race, r.Abbreviation
), winner_laps AS (
  SELECT r.race, r.Abbreviation AS winner_abbrev, MAX(l.LapNumber) AS winner_laps
  FROM results r JOIN laps l ON l.race = r.race AND l.session='R' AND l.Driver = r.Abbreviation
  WHERE r.session='R' AND r.Position=1 GROUP BY r.race, r.Abbreviation
), x AS (
SELECT ds.full_name AS driver, w.race, (w.winner_laps - d.driver_laps) AS laps_fewer
FROM driver_laps d JOIN winner_laps w ON w.race = d.race
JOIN driver_seasons ds ON ds.driver_code = d.driver_abbrev AND ds.season = 2024
WHERE d.driver_abbrev <> w.winner_abbrev AND d.driver_laps < w.winner_laps)`;
const full=N(await all(base+` SELECT * FROM x ORDER BY race, driver`));
console.log("full rows", full.length, "races", new Set(full.map(r=>r.race)).size);
// Compare model answer rows
const L=readFileSync("run_q10_fix.log","utf8").split("\n").filter(l=>l.startsWith("steps="));
const truth=new Set(full.map(r=>`${r.driver}|${r.race}|${Number(r.laps_fewer)}`));
const first50=new Set(full.slice(0,50).map(r=>`${r.driver}|${r.race}|${Number(r.laps_fewer)}`));
console.log("TRUTHKEYS",JSON.stringify([...truth].slice(0,3)));
L.forEach((l,i)=>{const a=JSON.parse(l.slice(l.indexOf("ANSWER: ")+8)).replace(/[\u00a0\u202f\u2011]/g,c=>c==="\u2011"?"-":" ");
 const rows=[...new Set(a.split("\n").filter(x=>/^\| [A-Z]/.test(x)&&!x.startsWith("| Driver")).map(x=>(p=>p[0]+"|"+p[1]+"|"+Number(p[2]))(x.split("|").slice(1,4).map(s=>s.trim()))))];
 console.log("ANSKEYS",JSON.stringify(rows.slice(0,3)));const inT=rows.filter(r=>truth.has(r)).length, in50=rows.filter(r=>first50.has(r)).length;
 console.log(`run${i+1}: unique rows ${rows.length}, correct ${inT}, within first-50 shown ${in50}, wrong ${rows.length-inT}`, rows.filter(r=>!truth.has(r)).slice(0,5));});
// Compact forms
import("node:fs").then(f=>f.writeFileSync("truth.json",JSON.stringify([...truth])));const perRace=N(await all(base+` SELECT race, count(*) n_short, max(laps_fewer) max_fewer, string_agg(driver||' -'||CAST(laps_fewer AS INT), ', ' ORDER BY laps_fewer DESC, driver) AS drivers FROM x GROUP BY race ORDER BY race`));
console.log("per-race agg rows", perRace.length, "JSON chars", JSON.stringify(perRace).length, "full JSON chars", JSON.stringify(full).length);
console.log(perRace.slice(0,2));
const perGap=N(await all(base+` SELECT laps_fewer, count(*) n FROM x GROUP BY 1 ORDER BY 1`)); console.log("by gap", JSON.stringify(perGap));
