// usage: node score.mjs <log>  -- scores each ANSWER against truth (reuses q10check truth via a cached json)
import { readFileSync } from "node:fs";
const truth=new Set(JSON.parse(readFileSync(new URL("./truth.json", import.meta.url))));
for (const l of readFileSync(process.argv[2],"utf8").split("\n").filter(l=>/^steps=\d+ ANSWER/.test(l))) {
  const a=JSON.parse(l.slice(l.indexOf("ANSWER: ")+8)).replace(/[  ]/g," ").replace(/‑/g,"-");
  const lines=a.split("\n").filter(x=>/^\| [A-Z]/.test(x)&&!x.startsWith("| Driver")&&!x.startsWith("| Race"));
  const keys=lines.map(x=>{const p=x.split("|").slice(1,4).map(s=>s.trim().replace(/\*/g,""));return p[0]+"|"+p[1]+"|"+Number(p[2]);});
  const u=[...new Set(keys)];
  console.log(`chars=${a.length} tablelines=${lines.length} unique=${u.length} correct=${u.filter(k=>truth.has(k)).length} wrong=${u.filter(k=>!truth.has(k)).length} missing=${[...truth].filter(k=>!u.includes(k)).length}`);
  console.log("  wrong sample:", u.filter(k=>!truth.has(k)).slice(0,4));
  console.log("  head:", a.slice(0,250).replace(/\n/g," / "));
}
