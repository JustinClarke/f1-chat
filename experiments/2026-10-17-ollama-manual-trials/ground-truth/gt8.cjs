const d=require('./node_modules/duckdb');const c=new d.Connection(new d.Database(':memory:'));
const R='/Users/justin/github/off-the-pace/data/bronze';const q=(s)=>new Promise((res,rej)=>c.all(s,(e,r)=>e?rej(e):res(r)));
const n=(v)=>typeof v==='bigint'?Number(v):v;
(async()=>{
await q(`CREATE VIEW laps AS SELECT * EXCLUDE (filename, session_type, race_name), regexp_extract(filename,'race=([^/]+)',1) AS race, CASE WHEN filename LIKE '%/session=Q/%' THEN 'Q' ELSE 'R' END AS session FROM read_parquet('${R}/laps/season=2024/**/*.parquet', union_by_name=true, filename=true, hive_partitioning=false)`);
await q(`CREATE VIEW results AS SELECT * FROM read_parquet('${R}/results/season=2024/**/*.parquet', union_by_name=true, hive_partitioning=false)`);
const rows=await q(`WITH done AS (SELECT race, Driver, max(LapNumber) laps_done FROM laps WHERE session='R' GROUP BY 1,2),
st AS (SELECT race_id, Abbreviation, Status, Position FROM results WHERE session_type IS NULL),
w AS (SELECT race, max(laps_done) wl FROM done GROUP BY 1)
SELECT d.race, d.Driver, d.laps_done, w.wl, s.Status, s.Position FROM done d JOIN w USING(race) LEFT JOIN st s ON s.Abbreviation=d.Driver AND s.race_id IN (SELECT race_id FROM st) WHERE d.laps_done < w.wl ORDER BY (w.wl-d.laps_done) DESC`);
const byRace={}; for(const r of rows){ byRace[r.race]=(byRace[r.race]||[]); byRace[r.race].push(r); }
const top=rows.slice(0,8).map(r=>({race:r.race,drv:r.Driver,done:n(r.laps_done),winner:n(r.wl),gap:n(r.wl)-n(r.laps_done),status:r.Status,pos:r.Position}));
console.log('largest deficits:', top);
const finishers=rows.filter(r=>/Finished|Lap/.test(r.Status||'')).length;
console.log('rows with lap deficit:', rows.length, ' of which status says finished/lapped:', finishers);
})().catch(e=>console.log('ERR',e.message));
