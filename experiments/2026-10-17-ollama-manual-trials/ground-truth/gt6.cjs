const d=require('./node_modules/duckdb');const c=new d.Connection(new d.Database(':memory:'));
const R='/Users/justin/github/off-the-pace/data/bronze';const q=(s)=>new Promise((res,rej)=>c.all(s,(e,r)=>e?rej(e):res(r)));
(async()=>{
await q(`CREATE VIEW laps AS SELECT * EXCLUDE (filename, session_type, race_name), regexp_extract(filename,'race=([^/]+)',1) AS race, CASE WHEN filename LIKE '%/session=Q/%' THEN 'Q' ELSE 'R' END AS session FROM read_parquet('${R}/laps/season=2024/**/*.parquet', union_by_name=true, filename=true, hive_partitioning=false)`);
const sql=`
WITH ins AS (SELECT race, Driver, Team, LapNumber, PitInTime FROM laps WHERE session='R' AND PitInTime IS NOT NULL),
outs AS (SELECT race, Driver, LapNumber, PitOutTime FROM laps WHERE session='R' AND PitOutTime IS NOT NULL),
stops AS (SELECT i.race, i.Driver, i.Team, i.LapNumber, (o.PitOutTime - i.PitInTime) AS dur_ns
  FROM ins i JOIN outs o ON o.race=i.race AND o.Driver=i.Driver AND o.LapNumber=i.LapNumber+1)
SELECT Team, count(*) n, median(dur_ns)/1e9 med_s, avg(dur_ns)/1e9 avg_s, min(dur_ns)/1e9 mn, max(dur_ns)/1e9 mx FROM stops WHERE dur_ns BETWEEN 10e9 AND 60e9 GROUP BY 1 ORDER BY med_s`;
const r=await q(sql);
console.log(r.map(x=>({team:x.Team,n:Number(x.n),median:Number(x.med_s).toFixed(3),avg:Number(x.avg_s).toFixed(3),min:Number(x.mn).toFixed(2),max:Number(x.mx).toFixed(2)})));
const tot=await q(`SELECT count(*) n FROM (SELECT 1)`); 
})().catch(e=>console.log('ERR',e.message));
