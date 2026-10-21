// Baseline run for the companion adapter. Questions: experiments/04-companion-adapter/companion_questions.json (contested items are skipped).
//   Every question gets the same master system prompt (page text + schema) and the same run_sql tool.
// Model: local Ollama (OpenAI-compatible endpoint). Env: LLM_URL, LLM_MODEL, REPEATS (default 1), ONLY=id,id
// Writes runs.jsonl and summary.md into this folder.
import fs from "node:fs";
import { readFileSync, writeFileSync, appendFileSync, existsSync, rmSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { score, normalise } from "../_shared/score.mjs";
import { openAdapter } from "./adapter.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "../..");
const LLM_URL = process.env.LLM_URL ?? "http://localhost:11434/v1/chat/completions";
const LLM_MODEL = process.env.LLM_MODEL ?? "gpt-oss:20b-f1";
const REPEATS = Number(process.env.REPEATS ?? 1);
const ONLY = process.env.ONLY?.split(",");
const MAX_TURNS = 6;
// Harness cap on SQL calls per question (env MAX_SQL, default 3). The first call past the cap is not run; its tool
// message is CAP_MESSAGE, and from then on the model is called without tools, so no further tool is executed.
const MAX_SQL = Number(process.env.MAX_SQL ?? 3);
const CAP_MESSAGE = "SQL limit reached; answer now from what you have, or say the data does not cover the question.";

// QUESTIONS=<file in this folder> selects a question set (default: the companion set). Optional, so the default run is unchanged.
const questionFile = process.env.QUESTIONS ? path.join(HERE, process.env.QUESTIONS) : path.join(ROOT, "experiments/04-companion-adapter/companion_questions.json");
const questions = JSON.parse(readFileSync(questionFile, "utf8"))
  .filter((q) => !q.contested)
  .filter((q) => !ONLY || ONLY.includes(q.id));
const pageContext = readFileSync(path.join(HERE, "page_context_driver_consistency.txt"), "utf8");

const adapter = await openAdapter();
const schema = adapter.schemaText();

const RUN_SQL_TOOL = {
  type: "function",
  function: {
    name: "run_sql",
    description: "Run one read-only DuckDB SELECT/WITH query against the gold warehouse tables listed in the system prompt. Returns up to 200 rows as JSON.",
    parameters: { type: "object", properties: { sql: { type: "string", description: "A single DuckDB SQL SELECT statement" } }, required: ["sql"] },
  },
};

const SYSTEM = [
  "You answer questions about Formula 1. When data is needed, write DuckDB SQL and run it with run_sql, then answer from the rows returned.",
  "Answer in one or two sentences with the key numbers. If the page text below covers the question, answer from it; if not, say the data does not cover it. If a query returns no rows or fails, do not try variations of it; answer that the data does not cover the question.",
  "",
  "PAGE TEXT:",
  pageContext,
  "",
  "TABLES (name and columns):",
  schema,
].join("\n");

async function chat(messages, tools) {
  const body = { model: LLM_MODEL, messages, temperature: 0, max_tokens: 4096 };
  if (tools) body.tools = tools;
  const res = await fetch(LLM_URL, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  if (!res.ok) throw new Error(`LLM ${res.status}: ${(await res.text()).slice(0, 300)}`);
  return (await res.json()).choices[0].message;
}

async function ask(q) {
  const messages = [{ role: "system", content: SYSTEM }, { role: "user", content: q.question }];
  const tools = [RUN_SQL_TOOL];
  const sqls = [];
  const errors = [];
  let capped = false;
  for (let turn = 0; turn < MAX_TURNS; turn++) {
    const msg = await chat(messages, capped ? undefined : tools);
    messages.push(msg);
    if (!msg.tool_calls?.length || capped) return { answer: msg.content ?? "", sqls, errors, turns: turn + 1, capped, messages };
    for (const call of msg.tool_calls) {
      if (capped || sqls.length >= MAX_SQL) {
        // Every tool call needs a reply; past the cap the reply is the limit message and nothing is run.
        capped = true;
        messages.push({ role: "tool", tool_call_id: call.id, content: CAP_MESSAGE });
        continue;
      }
      let content;
      try {
        const args = JSON.parse(call.function.arguments || "{}");
        if (call.function.name !== "run_sql") throw new Error(`Unknown tool: ${call.function.name}`);
        sqls.push(args.sql);
        const r = adapter.runSql(args.sql);
        content = JSON.stringify({ columns: r.columns, row_count: r.rowCount, rows: r.rows, ...(r.truncated && { note: "Only the first 200 rows are shown." }) });
      } catch (e) {
        errors.push(String(e.message ?? e));
        content = JSON.stringify({ error: String(e.message ?? e) });
      }
      messages.push({ role: "tool", tool_call_id: call.id, content });
    }
  }
  return { answer: "(no final answer within turn limit)", sqls, errors, turns: MAX_TURNS, capped, messages };
}

// Phrase check for prose answers: every expected value needs one of its phrases, accent- and case-insensitive.
const fold = (s) => normalise(s).normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
function scoreQuestion(q, answer) {
  if (q.use_case === 3) {
    const checks = q.expected_values.map((e) => ({ label: e.label, ok: e.any.some((p) => fold(answer).includes(fold(p))) }));    const ok = checks.every((c) => c.ok);
    return { verdict: ok ? "pass" : "fail", checks };
  }
  const r = score(q, answer);
  return { verdict: r.verdict, checks: r.checks ?? [], reason: r.reason };
}

console.log(`schema chars: ${schema.length}`);
const outDir = HERE;
const runsPath = path.join(outDir, process.env.RUNS_FILE ?? "runs.jsonl");
if (existsSync(runsPath)) rmSync(runsPath);
const rows = [];
for (const q of questions) {
  for (let rep = 1; rep <= REPEATS; rep++) {
    const started = Date.now();
    let result;
    try {
      result = await ask(q);
    } catch (e) {
      result = { answer: "", sqls: [], errors: [String(e.message ?? e)], turns: 0 };
    }
    if (process.env.TRACE_ID === q.id && result.messages) fs.writeFileSync(process.env.TRACE_TO ?? path.join(outDir, `trace-${q.id}.json`), JSON.stringify(result.messages, null, 2));
    const s = scoreQuestion(q, result.answer);
    const row = { id: q.id, use_case: q.use_case, rep, verdict: s.verdict, checks: s.checks, answer: result.answer, sqls: result.sqls, errors: result.errors, turns: result.turns, capped: result.capped ?? false, max_sql: MAX_SQL, ms: Date.now() - started };
    appendFileSync(runsPath, JSON.stringify(row) + "\n");
    rows.push(row);
    console.log(`${q.id} rep${rep}: ${s.verdict} (${row.ms} ms, ${result.sqls.length} sql${row.capped ? ", capped" : ""})`);
  }
}

const passes = rows.filter((r) => r.verdict === "pass").length;
const lines = [
  "# Companion adapter baseline",
  "",
  `Model: ${LLM_MODEL}. Repeats: ${REPEATS}. Questions: ${questions.length} (contested items skipped). SQL cap: ${MAX_SQL}.`,
  `Passes: ${passes} of ${rows.length}.`,
  "",
  "| id | use case | verdict | sql | errors | capped |",
  "|---|---|---|---|---|---|",
  ...rows.map((r) => `| ${r.id} | ${r.use_case} | ${r.verdict} | ${r.sqls.length} | ${r.errors.length} | ${r.capped ? "yes" : "no"} |`),
  "",
];
writeFileSync(path.join(outDir, process.env.SUMMARY_FILE ?? "summary.md"), lines.join("\n"));
console.log(`\nPasses ${passes} of ${rows.length}. Summary: ${path.join(outDir, "summary.md")}`);
