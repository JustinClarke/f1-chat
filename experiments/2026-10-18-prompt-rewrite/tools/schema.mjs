// NOTE: copied from the session scratchpad. Its paths point at this machine's scratchpad and must be updated before use elsewhere. Logic unchanged.
// Purpose: builds the app views and prints the schema and sample text that go into the model prompt.
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
const out = path.join(mkdtempSync(path.join(tmpdir(), "schema-")), "app.mjs");
await build({ stdin: { contents: `export * from "${ROOT}/web/src/db.ts"; export * from "${ROOT}/web/src/dataGuide.ts";`, resolveDir: ROOT, loader: "ts" },
  bundle: true, platform: "node", format: "esm", outfile: out, plugins: [stub], logLevel: "error", define: { "import.meta.env": JSON.stringify({ VITE_DATA_URL: "http://localhost:8000", VITE_WORKER_URL: "http://localhost:8787" }) } });
const app = await import(pathToFileURL(out).href);
const dist = ROOT + "/node_modules/@duckdb/duckdb-wasm/dist";
const duck = rq(`${dist}/duckdb-node-blocking.cjs`);
const db = await duck.createDuckDB({ mvp: { mainModule: `${dist}/duckdb-mvp.wasm`, mainWorker: "" }, eh: { mainModule: `${dist}/duckdb-eh.wasm`, mainWorker: "" } }, new duck.ConsoleLogger(duck.LogLevel.WARNING), duck.NODE_RUNTIME);
await db.instantiate(() => {});
const manifest = await (await fetch("http://localhost:8000/manifest.json")).json();
await app.loadViews(db.connect(), manifest, (f) => db.registerFileURL(f, path.join(DATA_ROOT, f), duck.DuckDBDataProtocol.NODE_FS, false));
console.log(await app.schemaSummary());
