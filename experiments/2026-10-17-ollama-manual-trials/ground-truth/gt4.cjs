const d=require('./node_modules/duckdb');const c=new d.Connection(new d.Database(':memory:'));
const R='/Users/justin/github/off-the-pace/data/bronze';const q=(s)=>new Promise((res,rej)=>c.all(s,(e,r)=>e?rej(e):res(r)));
(async()=>{
await q(`CREATE VIEW laps AS SELECT * EXCLUDE (filename, session_type, race_name), regexp_extract(filename,'race=([^/]+)',1) AS race, CASE WHEN filename LIKE '%/session=Q/%' THEN 'Q' ELSE 'R' END AS session FROM read_parquet('${R}/laps/season=2024/**/*.parquet', union_by_name=true, filename=true, hive_partitioning=false)`);
const r=await q(`
WITH quali AS (SELECT race, Driver, min(LapTime) best_q FROM laps WHERE session='Q' AND LapTime IS NOT NULL AND Deleted IS NOT TRUE GROUP BY 1,2),
race AS (SELECT race, Driver, percentile_cont(0.5) WITHIN GROUP (ORDER BY LapTime) med_r, count(*) n FROM laps WHERE session='R' AND TrackStatus='1' AND PitInTime IS NULL AND PitOutTime IS NULL AND Deleted IS NOT TRUE AND LapTime IS NOT NULL GROUP BY 1,2 HAVING count(*)>=5)
SELECT q.race, q.Driver, (r.med_r - q.best_q)/1e9 gap_s, q.best_q/1e9 bq, r.med_r/1e9 mr, r.n FROM quali q JOIN race r USING(race, Driver) ORDER BY gap_s DESC LIMIT 6`);
console.log(r.map(x=>({race:x.race,drv:x.Driver,gap:Number(x.gap_s).toFixed(3),best_q:Number(x.bq).toFixed(3),race_med:Number(x.mr).toFixed(3),n:Number(x.n)})));
})().catch(e=>console.log('ERR',e.message));
