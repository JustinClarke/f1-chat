// NOTE: copied from the session scratchpad. Its paths point at this machine's scratchpad and must be updated before use elsewhere. Logic unchanged.
// Purpose: runs a candidate DATA_GUIDE against eval questions using the real app code and local Ollama, scored with experiments/_shared/score.mjs.
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
const candidate = path.resolve(process.argv[2]);
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

// Route the app's Worker /chat calls to Ollama (same body as run_eval.mjs with LLM_URL set).
let nCalls = 0;
const realFetch = globalThis.fetch;
globalThis.fetch = async (url, init) => {
  if (String(url).startsWith(`${WORKER_URL}/chat`) && init?.method === "POST") {
    nCalls++;
    const body = { model: LLM_MODEL, reasoning_effort: "none", max_tokens: 8192, ...JSON.parse(init.body) };
    return realFetch(`${LLM_URL}/chat/completions`, { ...init, body: JSON.stringify(body), signal: AbortSignal.timeout(900_000) });
  }
  return realFetch(url, init);
};

const questions = JSON.parse(readFileSync(path.join(ROOT, "experiments/_shared/questions.json"), "utf8")).filter((q) => !only || only.includes(q.id));
const stamp = new Date().toISOString().replace(/[:.]/g, "-");
const logFile = path.join(HERE, "logs", `${path.basename(candidate, ".ts")}-${stamp}.jsonl`);
console.log(`candidate ${path.basename(candidate)}; ${questions.length} questions x ${repeats}; log ${logFile}`);
const tally = {};
for (let rep = 1; rep <= repeats; rep++) for (const q of questions) {
  app.resetChat();
  const sqls = []; const c0 = nCalls; const t0 = Date.now();
  let answer;
  try { answer = await app.ask(q.question, (s) => sqls.push(s)); } catch (e) { answer = `Gave up: ${e}`; }
  const sc = score(q, answer);
  const rec = { candidate: path.basename(candidate), id: q.id, rep, verdict: sc.verdict, reason: sc.reason, model_calls: nCalls - c0, seconds: (Date.now() - t0) / 1000, sql: sqls, answer };
  appendFileSync(logFile, JSON.stringify(rec) + "\n");
  (tally[q.id] ??= []).push(sc.verdict === "pass" ? "P" : sc.verdict === "fail" ? "F" : "C");
  console.log(`#${rep} ${q.id}: ${sc.verdict} [${rec.model_calls} calls, ${rec.seconds.toFixed(0)}s] ${sc.verdict === "pass" ? "" : sc.reason + " | "}${answer.replace(/\s+/g, " ").slice(0, 160)}`);
  for (const s of sqls) if (sc.verdict !== "pass") console.log("    SQL:", s.replace(/\s+/g, " ").slice(0, 300));
}
console.log("\nTALLY", path.basename(candidate));
for (const [id, v] of Object.entries(tally)) console.log(`  ${id}: ${v.filter((x) => x === "P").length}/${v.length} ${v.join("")}`);
console.log("total model calls", nCalls);
process.exit(0);
