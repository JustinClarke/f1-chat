// NOTE: copied from the session scratchpad. Its paths point at this machine's scratchpad and must be updated before use elsewhere. Logic unchanged.
// Purpose: runs a set of question types through the real app ask() (app default provider) and prints the answers.
import { createRequire } from "node:module";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
const ROOT = "/Users/justin/github/_misc/_chat/f1-chat";
const DATA_ROOT = "/Users/justin/github/off-the-pace/data";
const rq = createRequire(ROOT + "/package.json");
const { build } = rq("esbuild");
const stub = { name: "stub", setup(b) {
  b.onResolve({ filter: /\?url$|^@duckdb\/duckdb-wasm$/ }, (a) => ({ path: a.path, namespace: "stub" }));
  b.onLoad({ filter: /.*/, namespace: "stub" }, () => ({ contents: "export default ''", loader: "js" }));
} };
const out = path.join(mkdtempSync(path.join(tmpdir(), "app-")), "app.mjs");
// No VITE_PROVIDER here on purpose: the bundle uses the app's own default (local).
await build({ stdin: { contents: `export * from "${ROOT}/web/src/db.ts"; export * from "${ROOT}/web/src/chat.ts";`, resolveDir: ROOT, loader: "ts" },
  bundle: true, platform: "node", format: "esm", outfile: out, plugins: [stub], logLevel: "error",
  define: { "import.meta.env": JSON.stringify({ VITE_DATA_URL: "http://localhost:8000" }) } });
const app = await import(pathToFileURL(out).href);
const dist = ROOT + "/node_modules/@duckdb/duckdb-wasm/dist";
const duck = rq(`${dist}/duckdb-node-blocking.cjs`);
const db = await duck.createDuckDB({ mvp: { mainModule: `${dist}/duckdb-mvp.wasm`, mainWorker: "" }, eh: { mainModule: `${dist}/duckdb-eh.wasm`, mainWorker: "" } }, new duck.ConsoleLogger(duck.LogLevel.WARNING), duck.NODE_RUNTIME);
await db.instantiate(() => {});
const manifest = await (await fetch("http://localhost:8000/manifest.json")).json();
await app.loadViews(db.connect(), manifest, (f) => db.registerFileURL(f, path.join(DATA_ROOT, f), duck.DuckDBDataProtocol.NODE_FS, false));
const { score } = await import(pathToFileURL(ROOT + "/experiments/_shared/score.mjs").href);
const QS = [
  "In the 2024 Bahrain Grand Prix, who had the faster race pace, Verstappen or Norris? Use only green-flag laps, excluding in-laps, out-laps and deleted laps. Give the median lap time for each.",
  "Across the 2024 Grand Prix races, which drivers finished on the podium (top 3) after starting outside the top 10 on the grid? Give each driver with how many times they did it.",
  "Across the 2024 season, which driver had the largest gap between their best qualifying lap and their median race lap at the same Grand Prix? Use green-flag race laps only (excluding in-laps, out-laps and deleted laps) for the race median, and ignore deleted qualifying laps. Give the driver, the Grand Prix, and the gap in seconds.",
  "Across all 2024 Grand Prix races, how many laps did each driver lead? Count a lap as led when the driver's Position is 1 on that lap. Give the driver with the most laps led and their count.",
  "Who won the 2023 Monaco Grand Prix, and by how many seconds?",
  "In the 2024 Grand Prix race laps, pair each pit-in lap with the next lap's pit-out time to get each stop's pit-lane time. Ignore stops under 10 seconds or over 60 seconds. For each team, give the median pit-lane time and the number of stops. Which team had the fastest median?",
  "Chart each driver's total Grand Prix race points in 2024, highest first.",
  "Who was the most consistent driver in the 2024 races?",
  "Why did Max Verstappen retire from the 2024 Bahrain Grand Prix?",
  "Did any driver finish a 2024 race with fewer laps than the winner of that race? If so, list the driver, the race, and how many laps fewer.",
  "Who was the best qualifier in the 2024 season?",
  "In how many 2024 Grand Prix races did the driver who set the fastest qualifying lap go on to win the race? Give the count.",
  "How many points did Michael Schumacher score in the 2024 season?",
  "What percentage of 2024 race laps had a TrackStatus of exactly '1'? Count every race lap row.",
];
for (const [i, q] of QS.entries()) {
  app.resetChat();
  const t0 = Date.now();
  let answer, steps = 0;
  try { answer = await app.ask(q, () => steps++, false); } catch (e) { answer = "ERROR " + (e?.message ?? e); }
  console.log(`\n### Q${i + 1} (${((Date.now() - t0) / 1000).toFixed(1)}s, ${steps} SQL steps)\n${answer.replace(/\s+/g, " ").slice(0, 600)}`);
}
