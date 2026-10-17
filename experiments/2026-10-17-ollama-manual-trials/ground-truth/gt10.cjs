const d=require('./node_modules/duckdb');const c=new d.Connection(new d.Database(':memory:'));
const R='/Users/justin/github/off-the-pace/data/bronze';const q=(s)=>new Promise((res,rej)=>c.all(s,(e,r)=>e?rej(e):res(r)));
const n=(v)=>typeof v==='bigint'?Number(v):v;
(async()=>{
await q(`CREATE VIEW results AS SELECT * FROM read_parquet('${R}/results/season=2024/**/*.parquet', union_by_name=true, hive_partitioning=false)`);
const r=await q(`SELECT Position, Points, count(*) n FROM results WHERE session_type IS NULL AND Position<=12 GROUP BY 1,2 ORDER BY 1,2`);
console.log(r.map(x=>`P${n(x.Position)}:${n(x.Points)}pts x${n(x.n)}`).join('  '));
const off=await q(`SELECT count(*) n FROM results WHERE session_type IS NULL AND Position>10 AND Points>0`);
console.log('finishers outside top 10 with points:', n(off[0].n));
})().catch(e=>console.log('ERR',e.message));
