import { query, schemaSummary } from "./db";
import { DATA_GUIDE } from "./dataGuide";
import type { ChartSpec } from "./chart";

type Row = Record<string, unknown>;

// Which model answers. "local" calls Ollama directly; "cloudflare" goes through the Worker (Workers AI).
// Switch back with: VITE_PROVIDER=cloudflare npm run dev
const PROVIDER = import.meta.env.VITE_PROVIDER ?? "local";
const WORKER_URL = import.meta.env.VITE_WORKER_URL ?? "http://localhost:8787";
const OLLAMA_URL = import.meta.env.VITE_OLLAMA_URL ?? "http://localhost:11434/v1";
// gpt-oss:20b with a 20k context and 8k output, built from eval/ollama/Modelfile.
const OLLAMA_MODEL = import.meta.env.VITE_OLLAMA_MODEL ?? "gpt-oss:20b-f1";
const MAX_SQL_RETRIES = 2;
const ROW_CAP = 200;

const tools = [{
  type: "function",
  function: {
    name: "run_sql",
    description: "Run one read-only DuckDB SELECT/WITH query against the laps, results and driver_seasons tables. Returns up to 200 rows as JSON.",
    parameters: { type: "object", properties: { sql: { type: "string", description: "A single DuckDB SQL SELECT statement" } }, required: ["sql"] },
  },
}, {
  type: "function",
  function: {
    name: "make_chart",
    description: "Draw a chart of the rows from your most recent successful run_sql query. Give column names from that query only; the rows are not resent. Use bar for categories (teams, drivers), line for an ordered x such as lap or race number.",
    parameters: {
      type: "object",
      properties: {
        type: { type: "string", enum: ["bar", "line"] },
        x: { type: "string", description: "Column for the category or order axis" },
        y: { type: "string", description: "Numeric column for the value axis" },
        title: { type: "string", description: "Short chart title" },
      },
      required: ["type", "x", "y"],
    },
  },
}];

// Returns the cleaned SQL, or throws with a reason the model can read.
export function validateSql(raw: string): string {
  const sql = raw.trim().replace(/;+\s*$/, "");
  if (sql.includes(";")) throw new Error("Only one statement is allowed.");
  if (!/^(select|with)\b/i.test(sql)) throw new Error("Only SELECT or WITH queries are allowed.");
  const bad = sql.match(/\b(insert|update|delete|drop|attach|copy|pragma|install|load)\b/i);
  if (bad) throw new Error(`Forbidden keyword: ${bad[0]}`);
  return /\blimit\s+\d+/i.test(sql) ? sql : `${sql} LIMIT 200`;
}

export function checkChartSpec(args: unknown, rows: Row[]): ChartSpec {
  const a = (args ?? {}) as Record<string, unknown>;
  if (a.type !== "bar" && a.type !== "line") throw new Error('type must be "bar" or "line".');
  if (typeof a.x !== "string" || typeof a.y !== "string") throw new Error("x and y must be column name strings.");
  if (!rows.length) throw new Error("No rows to chart; run a successful run_sql query first.");
  for (const col of [a.x, a.y]) if (!(col in rows[0])) throw new Error(`Column ${col} is not in the last query result (columns: ${Object.keys(rows[0]).join(", ")}).`);
  const y = a.y;
  if (!rows.every((r) => r[y] != null && r[y] !== "" && Number.isFinite(Number(r[y])))) throw new Error(`Column ${y} is not numeric; choose a numeric column for y.`);
  return { type: a.type, x: a.x, y, title: typeof a.title === "string" ? a.title : undefined };
}

// Pulls a markdown table of more than 15 data rows out of the answer text. Returns the text without it and the data-row count (0 if none).
export function splitLongTable(text: string): { prose: string; rows: number } {
  const lines = text.split("\n");
  const isRow = (l: string) => /^\s*\|/.test(l);
  const keep: string[] = [];
  let rows = 0;
  let i = 0;
  while (i < lines.length) {
    if (!isRow(lines[i])) { keep.push(lines[i]); i++; continue; }
    const block: string[] = [];
    while (i < lines.length && isRow(lines[i])) block.push(lines[i++]);
    const data = block.filter((l) => !/^\s*\|[\s|:-]+\|?\s*$/.test(l)).length - 1; // minus the header row
    if (data > 15) rows = Math.max(rows, data); else keep.push(...block);
  }
  return { prose: keep.join("\n").replace(/\n{3,}/g, "\n\n").trim(), rows };
}

export type Msg ={ role: string; content?: string | null; tool_calls?: unknown[]; tool_call_id?: string; name?: string };
export type Call = { id: string; name: string; args: string };

export async function callModel(messages: Msg[], toolList: unknown[] = tools): Promise<{ text: string; calls: Call[] }> {
  const local = PROVIDER === "local";
  // Same OpenAI-style body either way. Ollama needs the model name, thinking off, and an output cap (the Worker sets the cap itself).
  const body = local
    ? { model: OLLAMA_MODEL, messages, tools: toolList, reasoning_effort: "none", max_tokens: 8192 }
    : { messages, tools: toolList };
  const res = await fetch(local ? `${OLLAMA_URL}/chat/completions` : `${WORKER_URL}/chat`, {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error?.message ?? data.error ?? `${local ? "Ollama" : "Worker"} error ${res.status}`);
  // Workers AI returns either {response, tool_calls} or an OpenAI-style {choices}.
  const m = data.choices?.[0]?.message ?? data;
  const raw = (m.tool_calls ?? []) as any[];
  const calls = raw.map((c, i) => {
    const fn = c.function ?? c;
    const args = typeof fn.arguments === "string" ? fn.arguments : JSON.stringify(fn.arguments ?? {});
    return { id: c.id ?? Math.random().toString(36).slice(2, 11).padEnd(9, "0"), name: fn.name, args };
  });
  return { text: m.response ?? m.content ?? "", calls };
}

let history: Msg[] = [];
export const resetChat = () => { history = []; };

// Exploration notes saved by explore.ts, if any. Empty string when the table is missing or has no rows.
async function notesBlock(): Promise<string> {
  try {
    const rows = await query("SELECT topic, claim, confidence FROM llm_notes ORDER BY id");
    if (!rows.length) return "";
    return `\nNotes from an earlier exploration of this data (may be wrong; check with SQL if unsure):\n${rows.map((r) => `- [${r.confidence}] ${r.topic}: ${r.claim}`).join("\n")}\n`;
  } catch { return ""; }
}

let schema: string | undefined;

export async function ask(
  question: string,
  onSql: (sql: string) => void,
  useNotes = false,
  onChart: (spec: ChartSpec, rows: Row[]) => void = () => {},
  onTable: (rows: Row[]) => void = () => {},
): Promise<string> {
  schema ??= await schemaSummary();
  const system = {
    role: "system",
    content: `You answer questions about 2024 Formula 1 using the run_sql tool (DuckDB SQL).
${DATA_GUIDE}
TABLE SCHEMA (types as DuckDB reports them)
${schema}
${useNotes ? await notesBlock() : ""}`,
  };
  history[0] = system; // rebuilt per question so the notes toggle takes effect immediately
  history.push({ role: "user", content: question });

  let errors = 0;
  let lastRows: Row[] = []; // rows of the most recent successful run_sql, for make_chart
  const runs: Row[][] = []; // every successful run_sql result this question, for the table fallback
  for (let step = 0; step < 8; step++) {
    const { text, calls } = await callModel(history);
    if (!calls.length) {
      // A long typed table is replaced by the rows of the query that produced it, so the model never has to copy rows.
      const { prose, rows } = splitLongTable(text ?? "");
      if (rows === 0) { history.push({ role: "assistant", content: text }); return text; }
      const match = [...runs].reverse().find((r) => r.length === rows) ?? runs.reduce<Row[] | undefined>((a, b) => (!a || b.length > a.length ? b : a), undefined);
      if (!match) { history.push({ role: "assistant", content: text }); return text; }
      onTable(match);
      history.push({ role: "assistant", content: prose });
      return prose;
    }

    history.push({
      role: "assistant", content: text ?? "",
      tool_calls: calls.map((c) => ({ id: c.id, type: "function", function: { name: c.name, arguments: c.args } })),
    });
    for (const c of calls) {
      let result: string;
      try {
        const args = JSON.parse(c.args);
        if (c.name === "make_chart") {
          const spec = checkChartSpec(args, lastRows);
          onChart(spec, lastRows);
          result = JSON.stringify({ ok: true, drawn: `${spec.type} chart of ${spec.y} by ${spec.x}, ${lastRows.length} rows` });
        } else {
          const sql = validateSql(args.sql);
          onSql(sql);
          const rows = await query(sql);
          lastRows = rows;
          runs.push(rows);
          const cut = rows.length > ROW_CAP;
          result = JSON.stringify({ row_count: rows.length, rows: rows.slice(0, ROW_CAP), ...(cut && { note: `Only the first ${ROW_CAP} of ${rows.length} rows are shown. Aggregate in SQL if you need every value in text.` }) });
        }
      } catch (e) {
        result = JSON.stringify({ error: String(e instanceof Error ? e.message : e) });
        if (++errors > MAX_SQL_RETRIES) { history.push({ role: "tool", tool_call_id: c.id, name: c.name, content: result }); return `Gave up after ${errors} SQL errors. Last error: ${result}`; }
      }
      history.push({ role: "tool", tool_call_id: c.id, name: c.name, content: result });
    }
  }
  return "Stopped: too many tool steps.";
}
