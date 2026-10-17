// Scratch test of the table splitter: a hand-stripped copy of splitLongTable from web/src/chat.ts. Type annotations removed so it runs as .mjs.
function splitLongTable(text) {
  const lines = text.split("\n");
  const isRow = (l) => /^\s*\|/.test(l);
  const keep = [];
  let rows = 0;
  let i = 0;
  while (i < lines.length) {
    if (!isRow(lines[i])) { keep.push(lines[i]); i++; continue; }
    const block = [];
    while (i < lines.length && isRow(lines[i])) block.push(lines[i++]);
    const data = block.filter((l) => !/^\s*\|[\s|:-]+\|?\s*$/.test(l)).length - 1; // minus the header row
    if (data > 15) rows = Math.max(rows, data); else keep.push(...block);
  }
  return { prose: keep.join("\n").replace(/\n{3,}/g, "\n\n").trim(), rows };
}
const big = ["Intro line", "| Race | Driver | n |", "|---|---|---|", ...Array.from({length: 138}, (_, i) => `| r${i} | d${i} | 1 |`), "", "Outro"].join("\n");
const small = ["Top 3:", "| A | B |", "|---|---|", "| 1 | x |", "| 2 | y |", "done"].join("\n");
const a = splitLongTable(big), b = splitLongTable(small);
console.log("big rows:", a.rows, "| prose:", JSON.stringify(a.prose));
console.log("small rows:", b.rows, "| kept table:", b.prose.includes("| x |"));
