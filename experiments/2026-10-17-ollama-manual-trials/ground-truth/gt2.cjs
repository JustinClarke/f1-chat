const d=require('./node_modules/duckdb');const c=new d.Connection(new d.Database(':memory:'));
const R='/Users/justin/github/off-the-pace/data/bronze';const q=(s)=>new Promise((res,rej)=>c.all(s,(e,r)=>e?rej(e):res(r)));
(async()=>{
await q(`CREATE VIEW results AS SELECT * FROM read_parquet('${R}/results/season=2024/**/*.parquet', union_by_name=true, hive_partitioning=false)`);
console.log(await q(`SELECT session_type, count(*) n FROM results GROUP BY 1`));
console.log(await q(`SELECT FullName, count(*) n_finishes, list(race_id) races FROM results WHERE session_type='R' AND GridPosition>10 AND Position<=3 GROUP BY 1 ORDER BY 2 DESC`));
})().catch(e=>console.log('ERR',e.message));
