// Prompt-variant experiment (protocol: experiments/01-prompt-variants/PROTOCOL.md). One variable changes: the data-guide text (experiments/01-prompt-variants/variants/v0..v3.txt).
// Everything else is frozen. Uses the real web/src chat/db code, bundled for Node, against the same Worker the browser hits.
// Needs `npm run data` and `npm run worker` running.
//   PILOT=1 [PILOT_V=v3 PILOT_Q=bahrain_clean_pace]  one run -> experiments/01-prompt-variants/results/pilot.jsonl
//   (default)                                         full grid -> experiments/01-prompt-variants/results/runs.jsonl (skips run ids already logged, so it can resume)
//   SUMMARY_ONLY=1                                    rebuild experiments/01-prompt-variants/results/summary.md from runs.jsonl
import { build } from "esbuild";
import { createRequire } from "node:module";
import { readFileSync, writeFileSync, appendFileSync, existsSync, mkdtempSync } from "node:fs";
import { createHash } from "node:crypto";
import { tmpdir } from "node:os";
import path from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";
import { score } from "../_shared/score.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const EXP = path.join(ROOT, "experiments/01-prompt-variants/results");
const DATA_URL = "http://localhost:8000", WORKER_URL = "http://localhost:8787";
const DATA_ROOT = path.resolve(process.env.DATA_ROOT || "/Users/justin/github/off-the-pace/data");

// Frozen settings (also written in PROTOCOL.md).
const SEED = 20261015;
const REPEATS = 5;
const VARIANTS = ["v0", "v1", "v2", "v3"];
const QUESTION_IDS = ["wins_team", "top_compound", "bahrain_clean_pace", "unanswerable"];
const SETTINGS = { temperature: 0, reasoning: { effort: "medium" }, max_tokens: 4096, row_limit: 50 };
const QUESTIONS_SHA256 = readFileSync(path.join(EXP, "questions.sha256"), "utf8").trim().split(/\s+/)[0];

const sha = (x) => createHash("sha256").update(x).digest("hex");
const read = (f) => readFileSync(path.join(ROOT, "experiments/01-prompt-variants/variants", f), "utf8");
const variantText = Object.fromEntries(VARIANTS.map((v) => [v, read(`${v}.txt`)]));
const RULE = read("rule.txt").replace(/\n$/, "");
const variantSha = Object.fromEntries(VARIANTS.map((v) => [v, sha(variantText[v])]));
const jsonl = (f) => (existsSync(f) ? readFileSync(f, "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l)) : []);

if (process.env.SUMMARY_ONLY) { writeSummary(jsonl(path.join(EXP, "runs.jsonl"))); process.exit(0); }

const questionsRaw = readFileSync(path.join(ROOT, "experiments/_shared/questions.json"));
if (sha(questionsRaw) !== QUESTIONS_SHA256) { console.error("experiments/_shared/questions.json does not match experiments/01-prompt-variants/results/questions.sha256. Ground truth is frozen; stopping."); process.exit(1); }
const allQ = JSON.parse(questionsRaw);
const questions = QUESTION_IDS.map((id) => allQ.find((q) => q.id === id) ?? (() => { throw new Error(`missing question ${id}`); })());

// 1. Bundle the app for Node. The data guide and the extra rule are swapped in here; web/src/dataGuide.ts and chat.ts are not edited.
const RULES_ANCHOR = "- Use only the data guide and query results. Do not use outside knowledge of F1.";
const stub = { name: "stub", setup(b) {
  b.onResolve({ filter: /\?url$|^@duckdb\/duckdb-wasm$/ }, (a) => ({ path: a.path, namespace: "stub" }));
  b.onLoad({ filter: /.*/, namespace: "stub" }, () => ({ contents: "export default ''", loader: "js" }));
} };
const swap = { name: "swap", setup(b) {
  b.onLoad({ filter: /dataGuide\.ts$/ }, (a) => {
    const src = readFileSync(a.path, "utf8");
    if (!src.includes("export const DATA_GUIDE =")) throw new Error("dataGuide.ts no longer exports DATA_GUIDE as a const");
    return { loader: "ts", contents: src.replace("export const DATA_GUIDE =", "const REAL_GUIDE =") + "\nexport let DATA_GUIDE = '';\nexport function __setGuide(t) { DATA_GUIDE = t; }\nexport const __realGuide = REAL_GUIDE;\n" };
  });
  b.onLoad({ filter: /web\/src\/chat\.ts$/ }, (a) => {
    const src = readFileSync(a.path, "utf8");
    if (!src.includes(RULES_ANCHOR)) throw new Error("chat.ts RULES anchor line not found");
    return { loader: "ts", contents: src.replace(RULES_ANCHOR, RULES_ANCHOR + "\n" + RULE) };
  });
} };
const out = path.join(mkdtempSync(path.join(tmpdir(), "f1exp-")), "app.mjs");
await build({
  stdin: { contents: `export * from "${ROOT}/web/src/db.ts"; export * from "${ROOT}/web/src/chat.ts"; export { __setGuide, __realGuide } from "${ROOT}/web/src/dataGuide.ts";`, resolveDir: ROOT, loader: "ts" },
  bundle: true, platform: "node", format: "esm", outfile: out, plugins: [swap, stub], logLevel: "error",
  define: { "import.meta.env": JSON.stringify({ VITE_DATA_URL: DATA_URL, VITE_WORKER_URL: WORKER_URL }) },
});
const bundleUrl = pathToFileURL(out).href;
const probe = await import(`${bundleUrl}?probe`);
if (probe.__realGuide !== variantText.v3) { console.error("experiments/01-prompt-variants/variants/v3.txt differs from DATA_GUIDE in web/src/dataGuide.ts. Run node experiments/01-prompt-variants/variants/make_v3.mjs."); process.exit(1); }

// 2. Servers reachable?
for (const [u, n] of [[`${DATA_URL}/manifest.json`, "Data server (npm run data)"], [`${WORKER_URL}/chat`, "Worker (npm run worker)"]]) {
  try { await fetch(u, { method: "OPTIONS" }); } catch { console.error(`${n} not reachable at ${u}.`); process.exit(1); }
}
const manifest = await (await fetch(`${DATA_URL}/manifest.json`)).json();
const require = createRequire(import.meta.url);
const dist = path.join(ROOT, "node_modules/@duckdb/duckdb-wasm/dist");
const duck = require(`${dist}/duckdb-node-blocking.cjs`);
const bundles = { mvp: { mainModule: `${dist}/duckdb-mvp.wasm`, mainWorker: "" }, eh: { mainModule: `${dist}/duckdb-eh.wasm`, mainWorker: "" } };

// 3. Record every Worker call, and add the frozen sampling settings to each request (the app itself sends only messages + tools).
let calls = [];
const realFetch = globalThis.fetch;
globalThis.fetch = async (url, init) => {
  if (!(String(url).startsWith(`${WORKER_URL}/chat`) && init?.method === "POST")) return realFetch(url, init);
  const body = { ...JSON.parse(init.body), temperature: SETTINGS.temperature, reasoning: SETTINGS.reasoning, max_tokens: SETTINGS.max_tokens };
  const rec = { n: calls.length + 1, request: body };
  calls.push(rec);
  const t0 = Date.now();
  try {
    const res = await realFetch(url, { ...init, body: JSON.stringify(body), signal: AbortSignal.timeout(180_000) });
    const text = await res.text();
    rec.status = res.status; rec.seconds = (Date.now() - t0) / 1000;
    try { rec.response = JSON.parse(text); } catch { rec.response_text = text.slice(0, 2000); }
    return new Response(text, { status: res.status, headers: res.headers });
  } catch (e) { rec.error = String(e); rec.seconds = (Date.now() - t0) / 1000; throw e; }
};

const QUOTA = /4006|neurons|quota|daily free allocation/i;
const usageOf = (r) => r?.usage ?? {};
const reasoningTokens = (u) => u.completion_tokens_details?.reasoning_tokens ?? null;
const reasoningText = (r) => { const m = r?.choices?.[0]?.message ?? r ?? {}; return m.reasoning_content ?? m.reasoning ?? null; };
const clip = (rows, n = 5) => (rows ?? []).slice(0, n);

function sqlTrail(callsLog) {
  const tool = {};
  for (const m of callsLog.at(-1)?.request.messages ?? []) if (m.role === "tool") tool[m.tool_call_id] = m.content;
  const trail = [];
  for (const c of callsLog) {
    for (const tc of (c.response?.choices?.[0]?.message ?? c.response ?? {}).tool_calls ?? []) {
      const fn = tc.function ?? tc; let sql = fn.arguments; try { sql = JSON.parse(fn.arguments).sql ?? sql; } catch {}
      let res = null; try { res = JSON.parse(tool[tc.id]); } catch { res = null; }
      trail.push({ call: c.n, sql, row_count: res?.row_count ?? null, rows_sent_to_model: res?.rows?.length ?? null, error_flag: res === null || res.error !== undefined, error: res?.error ?? (res === null ? "no tool result recorded" : null), first_rows: clip(res?.rows) });
    }
  }
  return trail;
}

async function runOne(v, q, pos, rep) {
  // Clean state: new DuckDB instance + views, fresh bundle module instance (empty chat history, schema recomputed).
  const app = await import(`${bundleUrl}?run=${pos}`);
  const db = await duck.createDuckDB(bundles, new duck.ConsoleLogger(duck.LogLevel.WARNING), duck.NODE_RUNTIME);
  await db.instantiate(() => {});
  await app.loadViews(db.connect(), manifest, (f) => db.registerFileURL(f, path.join(DATA_ROOT, f), duck.DuckDBDataProtocol.NODE_FS, false));
  app.__setGuide(variantText[v]);
  app.resetChat();
  calls = [];
  const sqls = []; const t0 = Date.now(); let answer, error = null;
  try { answer = await app.ask(q.question, (s) => sqls.push(s), false); } catch (e) { error = String(e); answer = `Gave up: ${e}`; }
  const total = (Date.now() - t0) / 1000;
  const system = calls[0]?.request.messages?.[0]?.content ?? "";
  const schemaBlock = system.split("TABLE SCHEMA (types as DuckDB reports them)\n")[1]?.split("\nRULES\n")[0] ?? "";
  const promptChecks = { rule_count: system.split(RULE).length - 1, system_identical_all_calls: new Set(calls.map((c) => c.request.messages?.[0]?.content)).size <= 1 };
  const bad = calls.find((c) => c.error || (c.status && c.status >= 400));
  const blob = bad ? JSON.stringify(bad.response ?? bad.response_text ?? bad.error) : "";
  const quota = bad ? QUOTA.test(blob) : false;
  const infra = error !== null || !!bad || calls.length === 0;
  const sc = score(q, answer);
  // Informational only: time checks that match within 1 ms (the strict scorer uses 0.5 ms; some medians end in .5 ms).
  const near = sc.checks.filter((c) => c.kind === "time").map((c) => { const s = Number(String(c.expected).match(/= ([\d.]+)s/)?.[1]); return { label: c.label, within_1ms: [...sc.parsed_times_seconds, ...sc.parsed_numbers].some((n) => Math.abs(n - s) <= 0.001) }; });
  const usages = calls.map((c) => usageOf(c.response));
  const sum = (k) => usages.reduce((a, u) => a + (u[k] ?? 0), 0);
  const rec = {
    run_id: `${v}|${q.id}|rep${rep}`, seed: SEED, seed_position: pos, timestamp: new Date().toISOString(),
    variant: v, question_id: q.id, repeat: rep, settings: SETTINGS, model: "@cf/openai/gpt-oss-20b",
    hashes: { variant_sha256: variantSha[v], rule_sha256: sha(RULE), system_prompt_sha256: sha(system), schema_block_sha256: sha(schemaBlock), questions_sha256: QUESTIONS_SHA256 },
    prompt_checks: promptChecks, question: q.question, expected: q.expected,
    model_calls: calls.map((c) => ({ n: c.n, seconds: c.seconds, status: c.status ?? null, error: c.error ?? null, request: c.request, response: c.response ?? c.response_text ?? null,
      usage: usageOf(c.response), reasoning_tokens: reasoningTokens(usageOf(c.response)), reasoning: reasoningText(c.response) })),
    tokens: { prompt: sum("prompt_tokens"), completion: sum("completion_tokens"), reasoning: usages.some((u) => reasoningTokens(u) !== null) ? usages.reduce((a, u) => a + (reasoningTokens(u) ?? 0), 0) : null, total: sum("total_tokens"), neurons: +sum("neurons").toFixed(1) },
    sql: sqlTrail(calls), final_answer: answer,
    verdict: infra ? "error" : sc.verdict, verdict_reason: infra ? `infrastructure error: ${error ?? blob.slice(0, 300)}` : sc.reason,
    score: { checks: sc.checks, parsed_numbers: sc.parsed_numbers, parsed_times_seconds: sc.parsed_times_seconds, within_1ms_info: near },
    seconds_total: total, error, quota_exhausted: quota,
  };
  return rec;
}

// 4. Order: for each repeat a block of the 16 variant x question cells, shuffled with a seeded PRNG. Variants are interleaved and a partial run stays balanced.
function mulberry32(a) { return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const rand = mulberry32(SEED);
const plan = [];
for (let rep = 1; rep <= REPEATS; rep++) {
  const cells = VARIANTS.flatMap((v) => questions.map((q) => ({ v, q, rep })));
  for (let i = cells.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [cells[i], cells[j]] = [cells[j], cells[i]]; }
  plan.push(...cells);
}
plan.forEach((p, i) => { p.pos = i + 1; });

if (process.env.PILOT) {
  const v = process.env.PILOT_V ?? "v3", qid = process.env.PILOT_Q ?? "bahrain_clean_pace";
  const rec = await runOne(v, questions.find((q) => q.id === qid), 0, 0);
  appendFileSync(path.join(EXP, "pilot.jsonl"), JSON.stringify(rec) + "\n");
  console.log(JSON.stringify({ run_id: rec.run_id, verdict: rec.verdict, reason: rec.verdict_reason, seconds: rec.seconds_total, tokens: rec.tokens, calls: rec.model_calls.length, sql: rec.sql.map((s) => [s.row_count, s.error_flag]), prompt_checks: rec.prompt_checks, answer: rec.final_answer.slice(0, 400) }, null, 1));
  process.exit(0);
}

const runsFile = path.join(EXP, "runs.jsonl");
const done = new Set(jsonl(runsFile).map((r) => r.run_id));
console.log(`Seed ${SEED}; ${plan.length} planned, ${done.size} already logged.`);
let consecutiveInfra = 0, stopped = null, started = 0;
const maxRuns = Number(process.env.MAX_RUNS ?? Infinity); // each run builds a new DuckDB-WASM instance that is never freed; a process ran out of heap after 40 runs, so run in batches
for (const p of plan) {
  const id = `${p.v}|${p.q.id}|rep${p.rep}`;
  if (done.has(id)) continue;
  if (started++ >= maxRuns) break;
  const rec = await runOne(p.v, p.q, p.pos, p.rep);
  appendFileSync(runsFile, JSON.stringify(rec) + "\n");
  console.log(`#${p.pos} ${id}: ${rec.verdict} (${rec.seconds_total.toFixed(1)}s, ${rec.tokens.total} tok) | ${rec.final_answer.replace(/\s+/g, " ").slice(0, 110)}`);
  if (rec.quota_exhausted) { stopped = `Workers AI quota exhausted at run #${p.pos} (${id}). Stopping; no retry.`; break; }
  consecutiveInfra = rec.verdict === "error" ? consecutiveInfra + 1 : 0;
  if (consecutiveInfra > 5) { stopped = `More than 5 infrastructure errors in a row, stopped after #${p.pos}.`; break; }
}
if (stopped) console.log(stopped);
writeSummary(jsonl(runsFile), stopped);

function writeSummary(recs, stopNote = null) {
  const med = (a) => { const s = a.filter((x) => x !== null && x !== undefined).sort((x, y) => x - y); if (!s.length) return "n/a"; const m = s.length >> 1; return +(s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2).toFixed(2); };
  let md = `# Summary (${new Date().toISOString().slice(0, 10)})\n\nRuns logged: ${recs.length} of ${VARIANTS.length * QUESTION_IDS.length * REPEATS} planned. Seed ${SEED}. Source: runs.jsonl.${stopNote ? `\n\nSTOPPED EARLY: ${stopNote}` : ""}\n\n`;
  md += "Each cell is passes/runs under the strict scorer (experiments/_shared/score.mjs). Verdicts other than pass: fail, check manually (CHK), error (infrastructure).\n\n";
  md += `| question | ${VARIANTS.join(" | ")} |\n|---|${VARIANTS.map(() => "---").join("|")}|\n`;
  for (const id of QUESTION_IDS) md += `| ${id} | ${VARIANTS.map((v) => { const r = recs.filter((x) => x.variant === v && x.question_id === id); const c = (k) => r.filter((x) => x.verdict === k).length; return `${c("pass")}/${r.length}` + (c("check manually") ? ` (${c("check manually")} CHK)` : "") + (c("error") ? ` (${c("error")} err)` : ""); }).join(" | ")} |\n`;
  md += `| **all** | ${VARIANTS.map((v) => { const r = recs.filter((x) => x.variant === v); return `**${r.filter((x) => x.verdict === "pass").length}/${r.length}**`; }).join(" | ")} |\n`;
  md += `\n## Latency and tokens per variant (medians over runs)\n\n| variant | runs | total latency s | model calls | prompt tokens | completion tokens | reasoning tokens | total tokens | neurons | neurons (sum) |\n|---|---|---|---|---|---|---|---|---|---|\n`;
  for (const v of VARIANTS) { const r = recs.filter((x) => x.variant === v); md += `| ${v} | ${r.length} | ${med(r.map((x) => x.seconds_total))} | ${med(r.map((x) => x.model_calls.length))} | ${med(r.map((x) => x.tokens.prompt))} | ${med(r.map((x) => x.tokens.completion))} | ${med(r.map((x) => x.tokens.reasoning))} | ${med(r.map((x) => x.tokens.total))} | ${med(r.map((x) => x.tokens.neurons))} | ${+r.reduce((a, x) => a + (x.tokens.neurons ?? 0), 0).toFixed(0)} |\n`; }
  md += `\n## Median latency (s) per variant x question\n\n| question | ${VARIANTS.join(" | ")} |\n|---|${VARIANTS.map(() => "---").join("|")}|\n`;
  for (const id of QUESTION_IDS) md += `| ${id} | ${VARIANTS.map((v) => med(recs.filter((x) => x.variant === v && x.question_id === id).map((x) => x.seconds_total))).join(" | ")} |\n`;
  const nonpass = recs.filter((x) => x.verdict !== "pass");
  md += `\n## Non-passing runs (${nonpass.length})\n\n`;
  for (const r of nonpass) md += `- ${r.run_id} (position ${r.seed_position}): ${r.verdict}. ${r.verdict_reason}. Answer: ${r.final_answer.replace(/\s+/g, " ").slice(0, 200)}\n`;
  writeFileSync(path.join(EXP, "summary.md"), md);
}
