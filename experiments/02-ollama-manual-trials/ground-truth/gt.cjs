const d=require('./node_modules/duckdb');const db=new d.Database(':memory:');const c=new d.Connection(db);
const R='/Users/justin/github/off-the-pace/data/bronze';const q=(s)=>new Promise((res,rej)=>c.all(s,(e,r)=>e?rej(e):res(r)));
(async()=>{
const glob=(t)=>require('fs').readFileSync;
await q(`CREATE VIEW results AS SELECT * FROM read_parquet('${R}/results/season=2024/**/*.parquet', union_by_name=true, hive_partitioning=false)`).catch(e=>console.log('ERR',e.message));
console.log(await q(`DESCRIBE results`).then(r=>r.map(x=>x.column_name).join(', ')));
console.log(await q(`SELECT count(*) n FROM results`));
})().catch(e=>console.log('ERR',e.message));
