const d=require('./node_modules/duckdb');const c=new d.Connection(new d.Database(':memory:'));
const R='/Users/justin/github/off-the-pace/data/bronze';const q=(s)=>new Promise((res,rej)=>c.all(s,(e,r)=>e?rej(e):res(r)));
const n=(v)=>typeof v==='bigint'?Number(v):v;
(async()=>{
await q(`CREATE VIEW results AS SELECT * FROM read_parquet('${R}/results/season=2024/**/*.parquet', union_by_name=true, hive_partitioning=false)`);
console.log('Q3 Verstappen Bahrain:', (await q(`SELECT race_id, Abbreviation, Position, GridPosition, Status, Points, Laps, session_type FROM results WHERE Abbreviation='VER' AND race_id LIKE '2024_1' AND session_type IS NULL`)).map(r=>({...r,Laps:n(r.Laps),Points:n(r.Points)})));
console.log('Q3 bahrain race_id list:', (await q(`SELECT DISTINCT race_id FROM results WHERE race_id LIKE '2024_1%' ORDER BY 1`)).map(r=>r.race_id).join(' '));
const cons=await q(`SELECT Abbreviation, count(*) n, round(stddev_samp(Position),2) sd, round(avg(Position),2) avg_pos FROM results WHERE session_type IS NULL AND Position IS NOT NULL GROUP BY 1 HAVING count(*)>=20 ORDER BY sd ASC LIMIT 5`);
console.log('Q2 lowest sd (>=20 classified races):', cons.map(r=>({d:r.Abbreviation,n:n(r.n),sd:n(r.sd),avg:n(r.avg_pos)})));
const cons2=await q(`SELECT Abbreviation, count(*) n, round(stddev_samp(Position),2) sd FROM results WHERE session_type IS NULL AND Position IS NOT NULL GROUP BY 1 ORDER BY sd ASC LIMIT 5`);
console.log('Q2 lowest sd (all rows):', cons2.map(r=>({d:r.Abbreviation,n:n(r.n),sd:n(r.sd)})));
const short=await q(`WITH w AS (SELECT race_id, max(Laps) wl FROM results WHERE session_type IS NULL GROUP BY 1)
SELECT r.race_id, r.Abbreviation, r.Laps, w.wl, r.Status FROM results r JOIN w USING(race_id) WHERE r.session_type IS NULL AND r.Laps < w.wl ORDER BY (w.wl - r.Laps) DESC LIMIT 6`);
console.log('Q4 largest lap deficits:', short.map(r=>({race:r.race_id,d:r.Abbreviation,laps:n(r.Laps),winner_laps:n(r.wl),status:r.Status})));
const winners=await q(`SELECT race_id, Abbreviation, Laps FROM results WHERE session_type IS NULL AND Position=1 ORDER BY race_id`);
console.log('Q4 winners laps:', winners.map(r=>`${r.race_id}:${r.Abbreviation}:${n(r.Laps)}`).join(' '));
})().catch(e=>console.log('ERR',e.message));
