const d=require('./node_modules/duckdb');const c=new d.Connection(new d.Database(':memory:'));
const R='/Users/justin/github/off-the-pace/data/bronze';const q=(s)=>new Promise((res,rej)=>c.all(s,(e,r)=>e?rej(e):res(r)));
const n=(v)=>typeof v==='bigint'?Number(v):v;
(async()=>{
await q(`CREATE VIEW results AS SELECT * FROM read_parquet('${R}/results/season=2024/**/*.parquet', union_by_name=true, hive_partitioning=false)`);
const rows=await q(`SELECT Abbreviation, count(*) n, round(stddev_samp(Position),2) sd, round(avg(Position),1) avg_pos FROM results WHERE session_type IS NULL AND Position IS NOT NULL GROUP BY 1 HAVING count(*)>=10 ORDER BY sd ASC`);
const out=rows.map(r=>({code:r.Abbreviation,n:n(r.n),sd:n(r.sd),avg:n(r.avg_pos)}));
console.log(JSON.stringify(out));
})().catch(e=>console.log('ERR',e.message));
