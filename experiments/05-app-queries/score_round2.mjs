// Simple check: every number in an answer vs numbers in the rows the tool returned (rounded match). Ignores years, race ids, ranks, ten, 95%.
import { readFileSync } from "node:fs";
const names = JSON.parse(readFileSync("driver_names.json","utf8"));
for (const f of ["trace-grain-on.json","trace-grain-off.json"]) {
  console.log("==", f);
  for (const t of JSON.parse(readFileSync(f,"utf8"))) {
    const calls = t.calls.filter(c=>c.rows);
    const vals = calls.flatMap(c=>c.rows.flatMap(r=>Object.values(r).filter(v=>typeof v==="number")));
    const ans = (t.answer??"").replace(/2024_\d+|\b20\d\d\b|95 ?%|\bten\b/g,"").replace(/^\s*\d+\.\s/gm,"").replace(/[‑–−]/g,"-");
    const nums = [...ans.matchAll(/[-+]?\d+(?:\.\d+)?/g)].map(m=>m[0]);
    const bad = nums.filter(n=>{const d=(n.split(".")[1]??"").length; const x=parseFloat(n); return !vals.some(v=>Math.abs(v-x)<0.5*10**-d+1e-9 || Math.abs(Math.abs(v)-Math.abs(x))<0.5*10**-d+1e-9&&false);});
    const used = Object.entries(names).filter(([c,v])=>(t.answer??"").includes(v.name)).map(([c])=>c);
    const inRows = new Set(calls.flatMap(c=>c.rows.map(r=>r.driver_id)).filter(Boolean));
    console.log(t.id, "tools:", t.calls.map(c=>c.name).join(","), "| nums:", nums.join(" "), "| unmatched:", bad.join(" ")||"-", "| names used:", used.join(" ")||"-", "| not in rows:", used.filter(c=>!inRows.has(c)).join(" ")||"-");
  }
}
