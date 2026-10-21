const d=require('./node_modules/duckdb');const c=new d.Connection(new d.Database(':memory:'));
const R='/Users/justin/github/off-the-pace/data/bronze';const q=(s)=>new Promise((res,rej)=>c.all(s,(e,r)=>e?rej(e):res(r)));
const n=(v)=>typeof v==='bigint'?Number(v):v;
(async()=>{
await q(`CREATE VIEW laps AS SELECT * FROM read_parquet('${R}/laps/season=2024/**/*.parquet', union_by_name=true, hive_partitioning=false)`);
await q(`CREATE VIEW results AS SELECT * FROM read_parquet('${R}/results/season=2024/**/*.parquet', union_by_name=true, hive_partitioning=false)`);
const r=await q(`WITH done AS (SELECT race_id rid, Driver, max(LapNumber) ld FROM laps GROUP BY 1,2)
SELECT res.race_id, res.Abbreviation, res.Status, res.Position, done.ld FROM results res JOIN done ON done.rid=res.race_id AND done.Driver=res.Abbreviation WHERE res.session_type IS NULL AND res.race_id='2024_21' ORDER BY done.ld`);
console.log(r.map(x=>`${x.Abbreviation}:${n(x.ld)}:${x.Status}:P${n(x.Position)}`).join('  '));
})().catch(e=>console.log('ERR',e.message));
