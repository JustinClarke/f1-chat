const d=require('./node_modules/duckdb');const c=new d.Connection(new d.Database(':memory:'));
const R='/Users/justin/github/off-the-pace/data/bronze';const q=(s)=>new Promise((res,rej)=>c.all(s,(e,r)=>e?rej(e):res(r)));
const n=(v)=>typeof v==='bigint'?Number(v):v;
(async()=>{
await q(`CREATE VIEW laps AS SELECT * FROM read_parquet('${R}/laps/season=2024/**/*.parquet', union_by_name=true, hive_partitioning=false)`);
await q(`CREATE VIEW results AS SELECT * FROM read_parquet('${R}/results/season=2024/**/*.parquet', union_by_name=true, hive_partitioning=false)`);
const sql=`WITH done AS (SELECT race_id AS rid, Driver, max(LapNumber) laps_done FROM laps GROUP BY 1,2),
res AS (SELECT race_id, Abbreviation, FullName, Position, Status FROM results WHERE session_type IS NULL),
w AS (SELECT race_id, laps_done wl FROM done d JOIN res r ON r.race_id=d.rid AND r.Abbreviation=d.Driver WHERE r.Position=1)
SELECT r.race_id, r.Abbreviation, r.Position, r.Status, dn.laps_done, w.wl FROM res r JOIN done dn ON dn.rid=r.race_id AND dn.Driver=r.Abbreviation JOIN w ON w.race_id=r.race_id WHERE dn.laps_done < w.wl`;
const rows=await q(sql);
const cls=(s)=> (/^\+|Lap|Finished/.test(s||'')) ? 'classified' : 'DNF';
const agg={classified:0,DNF:0};
for(const r of rows){ agg[cls(r.Status)]++; }
console.log('total drivers with fewer laps than winner:', rows.length, agg);
const deficits=rows.map(r=>({race:r.race_id,drv:r.Abbreviation,status:r.Status,done:n(r.laps_done),winner:n(r.wl),gap:n(r.wl)-n(r.laps_done),cls:cls(r.Status)}));
console.log('classified (finished, lapped) max gap:', deficits.filter(x=>x.cls==='classified').sort((a,b)=>b.gap-a.gap).slice(0,3));
console.log('DNF max gap:', deficits.filter(x=>x.cls==='DNF').sort((a,b)=>b.gap-a.gap).slice(0,3));
console.log('statuses seen:', [...new Set(rows.map(r=>r.Status))].join(' | '));
})().catch(e=>console.log('ERR',e.message));
