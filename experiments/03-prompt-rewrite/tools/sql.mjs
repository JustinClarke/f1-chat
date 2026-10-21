// NOTE: copied from the session scratchpad. Its paths point at this machine's scratchpad and must be updated before use elsewhere. Logic unchanged.
// Purpose: runs the SQL strings given as arguments through the app's query layer on the local DuckDB data and prints the JSON rows (check data claims); the probe-style comment lines below are left over from the file it was copied from.
// Probe a candidate DATA_GUIDE against eval questions with the real app code (db.ts, chat.ts) and local Ollama.
// Usage: node probe.mjs <candidate.ts> [ids comma list] [repeats]
// Writes logs/<candidate>-<stamp>.jsonl. Does not touch the repo.
import { createRequire } from "node:module";
import { readFileSync, appendFileSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";

const ROOT = "/Users/justin/github/_misc/_chat/f1-chat";
const HERE = path.dirname(new URL(import.meta.url).pathname);
const DATA_URL = "http://localhost:8000";
const WORKER_URL = "http://localhost:8787";
const DATA_ROOT = "/Users/justin/github/off-the-pace/data";
const LLM_URL = "http://localhost:11434/v1";
const LLM_MODEL = "gpt-oss:20b-f1";
const candidate = "/Users/justin/github/_misc/_chat/f1-chat/web/src/dataGuide.ts";
const only = process.argv[3] && process.argv[3] !== "all" ? process.argv[3].split(",") : null;
const repeats = Number(process.argv[4] ?? 3);
const { score } = await import(pathToFileURL(path.join(ROOT, "experiments/_shared/score.mjs")).href);

const { build } = createRequire(path.join(ROOT, "package.json"))("esbuild");
const candSrc = readFileSync(candidate, "utf8");
if (!candSrc.includes("export const DATA_GUIDE =")) throw new Error("candidate must export const DATA_GUIDE");
const stub = { name: "stub", setup(b) {
  b.onResolve({ filter: /\?url$|^@duckdb\/duckdb-wasm$/ }, (a) => ({ path: a.path, namespace: "stub" }));
  b.onLoad({ filter: /.*/, namespace: "stub" }, () => ({ contents: "export default ''", loader: "js" }));
} };
// Replace the app's dataGuide.ts with the candidate file's export.
const guideSwap = { name: "guide-swap", setup(b) {
  b.onLoad({ filter: /dataGuide\.ts$/ }, () => ({ loader: "ts", contents: candSrc }));
} };
const out = path.join(mkdtempSync(path.join(tmpdir(), "f1probe-")), "app.mjs");
await build({
  stdin: { contents: `export * from "${ROOT}/web/src/db.ts"; export * from "${ROOT}/web/src/chat.ts";`, resolveDir: ROOT, loader: "ts" },
  bundle: true, platform: "node", format: "esm", outfile: out, plugins: [guideSwap, stub], logLevel: "error",
  define: { "import.meta.env": JSON.stringify({ VITE_DATA_URL: DATA_URL, VITE_WORKER_URL: WORKER_URL, VITE_PROVIDER: "cloudflare" }) },
});
const app = await import(pathToFileURL(out).href);

const require = createRequire(path.join(ROOT, "package.json"));
const dist = path.join(ROOT, "node_modules/@duckdb/duckdb-wasm/dist");
const duck = require(`${dist}/duckdb-node-blocking.cjs`);
const db = await duck.createDuckDB(
  { mvp: { mainModule: `${dist}/duckdb-mvp.wasm`, mainWorker: "" }, eh: { mainModule: `${dist}/duckdb-eh.wasm`, mainWorker: "" } },
  new duck.ConsoleLogger(duck.LogLevel.WARNING), duck.NODE_RUNTIME);
await db.instantiate(() => {});
const manifest = await (await fetch(`${DATA_URL}/manifest.json`)).json();
await app.loadViews(db.connect(), manifest, (f) => db.registerFileURL(f, path.join(DATA_ROOT, f), duck.DuckDBDataProtocol.NODE_FS, false));

for (const q of process.argv.slice(2)) console.log(q, "\n", JSON.stringify(await app.query(q)));
process.exit(0);
