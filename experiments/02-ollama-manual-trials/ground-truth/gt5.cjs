const d=require('./node_modules/duckdb');const c=new d.Connection(new d.Database(':memory:'));
const R='/Users/justin/github/off-the-pace/data/bronze';const q=(s)=>new Promise((res,rej)=>c.all(s,(e,r)=>e?rej(e):res(r)));
(async()=>{
await q(`CREATE VIEW laps AS SELECT * EXCLUDE (filename, session_type, race_name), regexp_extract(filename,'race=([^/]+)',1) AS race, CASE WHEN filename LIKE '%/session=Q/%' THEN 'Q' ELSE 'R' END AS session FROM read_parquet('${R}/laps/season=2024/**/*.parquet', union_by_name=true, filename=true, hive_partitioning=false)`);
console.log((await q(`DESCRIBE laps`)).map(x=>x.column_name).join(', '));
const nulls=await q(`SELECT count(*) total, count(Position) pos_nonnull, count(LapNumber) lap_nonnull FROM laps WHERE session='R'`);
console.log(nulls.map(x=>({total:Number(x.total),pos:Number(x.pos_nonnull),lap:Number(x.lap_nonnull)})));
const r=await q(`SELECT Driver, count(*) laps_led, count(DISTINCT race) races_with_lead FROM laps WHERE session='R' AND Position=1 GROUP BY 1 ORDER BY 2 DESC LIMIT 8`);
console.log(r.map(x=>({drv:x.Driver,laps_led:Number(x.laps_led),races:Number(x.races_with_lead)})));
const byRace=await q(`SELECT race, Driver, count(*) n FROM laps WHERE session='R' AND Position=1 GROUP BY 1,2 ORDER BY 1,3 DESC`);
console.log(byRace.length, 'race-driver rows; sample:', byRace.slice(0,5).map(x=>`${x.race}:${x.Driver}:${Number(x.n)}`));
})().catch(e=>console.log('ERR',e.message));
