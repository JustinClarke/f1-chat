// NOTE: copied from the session scratchpad. Its paths point at this machine's scratchpad and must be updated before use elsewhere. Logic unchanged.
// Purpose: asks the real app ask() the team_wins_and_points eval question N times (env N) and scores each answer.
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
const Q = JSON.parse(rq("fs").readFileSync(ROOT + "/experiments/_shared/questions.json", "utf8")).find((q) => q.id === "team_wins_and_points");
for (let i = 1; i <= Number(process.env.N ?? 2); i++) {
  app.resetChat();
  const sqls = [];
  let answer;
  const t0 = Date.now();
  try { answer = await app.ask(Q.question, (s) => sqls.push(s), false); } catch (e) { answer = "ERROR " + (e?.message ?? e); }
  const sc = score(Q, answer);
  console.log(`--- run ${i} (${((Date.now() - t0) / 1000).toFixed(1)}s): ${sc.verdict} | ${sc.reason}`);
  console.log(answer.replace(/\s+/g, " ").slice(0, 300));
}
