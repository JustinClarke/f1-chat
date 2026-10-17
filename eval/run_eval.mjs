// Runs questions from eval/questions.json under a matrix of configs (data guide on/off x exploration notes off/on), REPEATS times each,
// and logs everything to eval/logs/<timestamp>/{runs.jsonl,summary.md}. Env: ONLY=id,id  GUIDE=on,off  NOTES=off|on|off,on  REPEATS=3
// MODEL=<label> (the model is really set by the Worker's AI_MODEL; default is read from wrangler.toml)  LABEL=<free text note>
// Uses the real web/src chat/explore/profile/db code, bundled for Node with DuckDB-WASM (blocking build) over the same Parquet files,
// and the same Worker the browser hits.   Needs `npm run data` and `npm run worker` running.
import { build } from "esbuild";
import { createRequire } from "node:module";
import { readFileSync, writeFileSync, appendFileSync, mkdirSync, mkdtempSync } from "node:fs";
import { createHash } from "node:crypto";
import { score } from "./score.mjs";
import { tmpdir } from "node:os";
import path from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DATA_URL = process.env.VITE_DATA_URL ?? "http://localhost:8000";
const WORKER_URL = process.env.VITE_WORKER_URL ?? "http://localhost:8787";
const DATA_ROOT = path.resolve(process.env.DATA_ROOT || "/Users/justin/github/off-the-pace/data");
const only = process.env.ONLY?.split(","); // e.g. ONLY=wins_driver,poles

// 1. Bundle the app code for Node. The browser-only DuckDB import and Vite ?url imports are stubbed out.
const stub = { name: "stub", setup(b) {
  b.onResolve({ filter: /\?url$|^@duckdb\/duckdb-wasm$/ }, (a) => ({ path: a.path, namespace: "stub" }));
  b.onLoad({ filter: /.*/, namespace: "stub" }, () => ({ contents: "export default ''", loader: "js" }));
} };
// The guide is toggled at run time without touching dataGuide.ts: the bundled copy exposes DATA_GUIDE as a live binding plus __setGuide().
const guideSwitch = { name: "guide-switch", setup(b) {
  b.onLoad({ filter: /dataGuide\.ts$/ }, (a) => {
    const src = readFileSync(a.path, "utf8");
    if (!src.includes("export const DATA_GUIDE =")) throw new Error("dataGuide.ts no longer exports DATA_GUIDE as a const");
    return { loader: "ts", contents: src.replace("export const DATA_GUIDE =", "const REAL_GUIDE =") + "\nexport let DATA_GUIDE = REAL_GUIDE;\nexport function __setGuide(on) { DATA_GUIDE = on ? REAL_GUIDE : ''; }\n" };
  });
} };
const out = path.join(mkdtempSync(path.join(tmpdir(), "f1eval-")), "app.mjs");
await build({
  stdin: { contents: `export * from "${ROOT}/web/src/db.ts"; export * from "${ROOT}/web/src/chat.ts"; export * from "${ROOT}/web/src/explore.ts"; export { __setGuide } from "${ROOT}/web/src/dataGuide.ts";`, resolveDir: ROOT, loader: "ts" },
  bundle: true, platform: "node", format: "esm", outfile: out, plugins: [guideSwitch, stub], logLevel: "error",
  define: { "import.meta.env": JSON.stringify({ VITE_DATA_URL: DATA_URL, VITE_WORKER_URL: WORKER_URL }) },
});
const app = await import(pathToFileURL(out).href);

// 2. Node DuckDB-WASM over local files (same files the data server serves).
const need = async (url, what, fix) => { try { await fetch(url, { method: "OPTIONS" }); } catch { console.error(`${what} not reachable at ${url}. ${fix}`); process.exit(1); } };
await need(`${DATA_URL}/manifest.json`, "Data server", "Run `npm run data`.");
if (!process.env.LLM_URL) await need(`${WORKER_URL}/chat`, "Worker", "Run `npm run worker` (needs `npx wrangler login` once).");
const require = createRequire(import.meta.url);
const dist = path.join(ROOT, "node_modules/@duckdb/duckdb-wasm/dist");
const duck = require(`${dist}/duckdb-node-blocking.cjs`);
const db = await duck.createDuckDB(
  { mvp: { mainModule: `${dist}/duckdb-mvp.wasm`, mainWorker: "" }, eh: { mainModule: `${dist}/duckdb-eh.wasm`, mainWorker: "" } },
  new duck.ConsoleLogger(duck.LogLevel.WARNING), duck.NODE_RUNTIME);
await db.instantiate(() => {});
const manifest = await (await fetch(`${DATA_URL}/manifest.json`)).json();
await app.loadViews(db.connect(), manifest, (f) => db.registerFileURL(f, path.join(DATA_ROOT, f), duck.DuckDBDataProtocol.NODE_FS, false));
console.log("Data loaded.");

// 3. Config, logging helpers.
const env = (k, d) => (process.env[k] ?? d).split(",").map((x) => x.trim()).filter(Boolean);
const repeats = Number(process.env.REPEATS ?? 3);
const configs = env("GUIDE", "on,off").flatMap((g) => env("NOTES", "off").map((n) => ({ guide: g, notes: n })));
const LLM_URL = process.env.LLM_URL; // e.g. http://localhost:11434/v1 (Ollama). Bypasses the Worker; the app code is unchanged.
const LLM_MODEL = process.env.LLM_MODEL; // Ollama model name, e.g. qwen3:4b
const model = process.env.MODEL || (LLM_URL ? `ollama:${LLM_MODEL}` : (readFileSync(path.join(ROOT, "wrangler.toml"), "utf8").match(/AI_MODEL\s*=\s*"([^"]+)"/)?.[1] ?? "unknown"));
const modelNote = process.env.MODEL ? "from MODEL env (must match the Worker's --var AI_MODEL)" : "from wrangler.toml (the Worker's default)";
const stamp = new Date().toISOString().replace(/[:.]/g, "-");
const logDir = path.join(ROOT, "eval/logs", stamp);
mkdirSync(logDir, { recursive: true });
const runsFile = path.join(logDir, "runs.jsonl");
const sha = (x) => createHash("sha256").update(x).digest("hex").slice(0, 12);
const shape = (o) => (o && typeof o === "object" && !Array.isArray(o) ? Object.fromEntries(Object.entries(o).map(([k, v]) => [k, Array.isArray(v) ? `array(${v.length})` : v && typeof v === "object" ? shape(v) : typeof v])) : typeof o);

// Intercept the app's calls to the Worker so we record exactly what was sent and returned (the app code is unchanged).
let calls = [];
const realFetch = globalThis.fetch;
globalThis.fetch = async (url, init) => {
  const isChat = String(url).startsWith(`${WORKER_URL}/chat`) && init?.method === "POST";
  if (isChat && LLM_URL) {
    // Same OpenAI-style request, sent to Ollama instead of the Worker. The model name is added here.
    url = `${LLM_URL}/chat/completions`;
    init = { ...init, body: JSON.stringify({ model: LLM_MODEL, reasoning_effort: process.env.LLM_THINK ? undefined : "none", ...JSON.parse(init.body) }) };
    // Thinking is off by default: a 4B model spends ~2 min per call reasoning locally. Set LLM_THINK=1 to turn it on.
  }
  if (!(isChat || (LLM_URL && String(url) === `${LLM_URL}/chat/completions`))) return realFetch(url, init);
  const body = JSON.parse(init.body);
  const t0 = Date.now();
  const rec = { n: calls.length + 1, request: body };
  calls.push(rec);
  try {
    const res = await realFetch(url, { ...init, signal: AbortSignal.timeout(LLM_URL ? 900_000 : 180_000) });
    const text = await res.text();
    rec.status = res.status; rec.seconds = (Date.now() - t0) / 1000;
    try { rec.response = JSON.parse(text); } catch { rec.response_text = text.slice(0, 2000); }
    return new Response(text, { status: res.status, headers: res.headers });
  } catch (e) { rec.error = String(e); rec.seconds = (Date.now() - t0) / 1000; throw e; }
};

const clip = (rows, n = 5) => (rows ?? []).slice(0, n);
// Rebuild the SQL trail from what the model actually asked for and what it was shown back (tool messages in later requests).
function sqlTrail(callsLog, answer) {
  const lastReq = callsLog.at(-1)?.request.messages ?? [];
  const toolMsgs = Object.fromEntries(lastReq.filter((m) => m.role === "tool").map((m) => [m.tool_call_id, m.content]));
  const trail = [];
  for (const c of callsLog) {
    const msg = c.response?.choices?.[0]?.message ?? c.response ?? {};
    for (const tc of msg.tool_calls ?? []) {
      const fn = tc.function ?? tc; const id = tc.id;
      let attempted = fn.arguments; try { attempted = JSON.parse(fn.arguments).sql ?? fn.arguments; } catch {}
      let result = null; try { result = JSON.parse(toolMsgs[id]); } catch { result = toolMsgs[id] ?? null; }
      trail.push({ call: c.n, tool_call_id: id, tool: fn.name, sql: attempted,
        row_count: result?.row_count ?? null, first_rows: clip(result?.rows), error: result?.error ?? (result === null ? `no tool result recorded (run ended: ${String(answer).slice(0, 200)})` : null) });
    }
  }
  return trail;
}
function reasoningOf(r) {
  const m = r?.choices?.[0]?.message ?? r ?? {};
  return m.reasoning_content ?? m.reasoning ?? r?.reasoning ?? null;
}

async function runOne(q, cfg, rep) {
  app.__setGuide(cfg.guide === "on");
  app.resetChat();
  calls = [];
  const sqls = []; const t0 = Date.now();
  let answer, error = null;
  try { answer = await app.ask(q.question, (s) => sqls.push(s), cfg.notes === "on"); } catch (e) { error = String(e); answer = `Gave up: ${e}`; }
  const seconds = (Date.now() - t0) / 1000;
  const infraError = error !== null || calls.some((c) => c.error || (c.status && c.status >= 400));
  const sc = score(q, answer);
  const verdict = infraError ? "error" : sc.verdict;
  const systems = [...new Set(calls.map((c) => JSON.stringify(c.request.messages?.[0])))];
  const system_prompt = calls[0]?.request.messages?.[0]?.content ?? null;
  const record = {
    run_id: `${q.id}|guide=${cfg.guide}|notes=${cfg.notes}|rep=${rep}`,
    timestamp: new Date().toISOString(),
    config: { model, model_note: modelNote, guide: cfg.guide, notes: cfg.notes, repeat: rep, label: process.env.LABEL ?? null },
    question_id: q.id, question: q.question, expected: q.expected, expected_values: q.expected_values,
    system_prompt, system_prompt_sha: system_prompt ? sha(system_prompt) : null, system_prompt_changed_between_calls: systems.length > 1,
    worker_calls: calls.map((c) => ({
      n: c.n, seconds: c.seconds, status: c.status ?? null, error: c.error ?? null,
      // system message (identical every call) is replaced by a pointer; everything else is verbatim
      messages_sent: systems.length > 1 ? c.request.messages : c.request.messages.map((m, i) => (i === 0 ? { role: "system", content: "<see system_prompt>" } : m)),
      tools_sent: c.request.tools,
      response_shape: shape(c.response), reasoning: reasoningOf(c.response), response: c.response ?? c.response_text ?? null,
    })),
    sql: sqlTrail(calls, answer), sql_validated: sqls,
    final_answer: answer, verdict, verdict_reason: infraError ? `infrastructure error: ${error ?? calls.find((c) => c.error || c.status >= 400)?.error ?? "worker status >=400"}` : sc.reason,
    score: { checks: sc.checks, parsed_numbers: sc.parsed_numbers, parsed_times_seconds: sc.parsed_times_seconds },
    elapsed_seconds: seconds, error,
  };
  appendFileSync(runsFile, JSON.stringify(record) + "\n");
  console.log(`[guide=${cfg.guide} notes=${cfg.notes} #${rep}] ${q.id}: ${verdict} (${seconds.toFixed(1)}s) | ${answer.replace(/\s+/g, " ").slice(0, 150)}`);
  return record;
}

// 4. Run: repeat -> config -> question, so slow drift in the model hits every config alike.
const questions = JSON.parse(readFileSync(path.join(ROOT, "eval/questions.json"), "utf8")).filter((q) => !only || only.includes(q.id));
if (!questions.length) { console.error("No questions selected."); process.exit(1); }
console.log(`Model ${model} (${modelNote}); configs ${JSON.stringify(configs)}; ${questions.length} questions x ${repeats} repeats -> ${logDir}`);
let explored = false;
const records = [];
for (let rep = 1; rep <= repeats; rep++) {
  for (const cfg of configs) {
    if (cfg.notes === "on" && !explored) {
      app.__setGuide(cfg.guide === "on"); app.resetChat();
      const lines = []; await app.explore((l) => lines.push(l));
      writeFileSync(path.join(logDir, "exploration.json"), JSON.stringify({ lines, notes: await app.query("SELECT * FROM llm_notes ORDER BY id") }, null, 2));
      explored = true;
    }
    for (const q of questions) records.push(await runOne(q, cfg, rep));
  }
}

// 5. summary.md
const cell = (r) => ({ pass: "PASS", fail: "FAIL", "check manually": "CHECK", error: "ERROR" }[r.verdict]);
const cfgName = (c) => `guide ${c.guide}${c.notes === "on" ? " + notes" : ""}`;
let md = `# Eval run ${stamp}\n\nModel: \`${model}\` (${modelNote}). Repeats: ${repeats}. Full detail per run: \`runs.jsonl\` (one line per run; \`run_id\` is the key).\n\n`;
md += `Scorer: all expected values (from ground_truth.py) must appear in the answer; numbers are exact (commas, spaces, 1:21.432 times and ns handled); names whole-word; unanswerable needs a refusal and no driver name. See eval/score.mjs.\n\n`;
const groups = [...new Set(records.map((r) => cfgName(r.config)))];
md += `## Pass counts (pass / runs)\n\n| question | ${groups.join(" | ")} |\n|---|${groups.map(() => "---").join("|")}|\n`;
for (const q of questions) md += `| ${q.id} | ${groups.map((g) => { const rs = records.filter((r) => r.question_id === q.id && cfgName(r.config) === g); return `${rs.filter((r) => r.verdict === "pass").length}/${rs.length}`; }).join(" | ")} |\n`;
md += `\n## Every run\n\n| question | config | ${Array.from({ length: repeats }, (_, i) => `#${i + 1}`).join(" | ")} |\n|---|---|${Array.from({ length: repeats }, () => "---").join("|")}|\n`;
for (const q of questions) for (const g of groups) md += `| ${q.id} | ${g} | ${Array.from({ length: repeats }, (_, i) => { const r = records.find((x) => x.question_id === q.id && cfgName(x.config) === g && x.config.repeat === i + 1); return r ? cell(r) : "-"; }).join(" | ")} |\n`;
const bad = records.filter((r) => r.verdict !== "pass");
md += `\n## Non-passing runs (${bad.length})\n`;
for (const r of bad) {
  md += `\n### ${r.run_id} -> ${r.verdict.toUpperCase()}\n- Question: ${r.question}\n- Expected: ${r.expected}\n- Why: ${r.verdict_reason}\n- Parsed from answer: numbers ${JSON.stringify(r.score.parsed_numbers)}, times(s) ${JSON.stringify(r.score.parsed_times_seconds)}\n- Answer: ${r.final_answer.replace(/\s+/g, " ").slice(0, 400)}\n`;
  r.sql.forEach((s, i) => { md += `- SQL ${i + 1}: \`${s.sql.replace(/\s+/g, " ")}\` -> ${s.error ? `ERROR ${String(s.error).slice(0, 150)}` : `${s.row_count} rows ${JSON.stringify(s.first_rows).slice(0, 200)}`}\n`; });
  if (!r.sql.length) md += `- The model ran no SQL.\n`;
  md += `- Details: \`jq 'select(.run_id==\"${r.run_id}\")' runs.jsonl\` (${r.worker_calls.length} Worker calls, ${r.elapsed_seconds.toFixed(1)}s)\n`;
}
writeFileSync(path.join(logDir, "summary.md"), md);
console.log(`\n${md.split("## Every run")[0].split("## Pass counts")[1]}\nWrote ${logDir}/summary.md and runs.jsonl`);
