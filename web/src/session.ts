import { query, schemaSummary } from "./db";
import { DATA_GUIDE } from "./dataGuide";
import type { ChartSpec } from "./chart";
import { ModelClient, type Msg } from "./model";
import { defaultTools, type Row, type Tool, type ToolContext } from "./tools";

const MAX_SQL_RETRIES = 2;
const MAX_STEPS = 8;

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

// Exploration notes saved by explore.ts, if any. Empty string when the table is missing or has no rows.
async function notesBlock(): Promise<string> {
  try {
    const rows = await query("SELECT topic, claim, confidence FROM llm_notes ORDER BY id");
    if (!rows.length) return "";
    return `\nNotes from an earlier exploration of this data (may be wrong; check with SQL if unsure):\n${rows.map((r) => `- [${r.confidence}] ${r.topic}: ${r.claim}`).join("\n")}\n`;
  } catch { return ""; }
}

// One conversation: the history, the step loop, error counting and the long-table fallback. Tools and the model client are injected.
export class ChatSession {
  private history: Msg[] = [];
  private schema: string | undefined;
  private readonly toolByName: Map<string, Tool>;

  constructor(readonly model = new ModelClient(), readonly tools: Tool[] = defaultTools()) {
    this.toolByName = new Map(tools.map((t) => [t.name, t]));
  }

  get toolDefinitions(): unknown[] { return this.tools.map((t) => t.definition); }

  reset(): void { this.history = []; }

  async ask(
    question: string,
    onSql: (sql: string) => void,
    useNotes = false,
    onChart: (spec: ChartSpec, rows: Row[]) => void = () => {},
    onTable: (rows: Row[]) => void = () => {},
    excludePitLaps = true,
  ): Promise<string> {
    this.schema ??= await schemaSummary();
    const system = {
      role: "system",
      content: `You answer questions about 2024 Formula 1 using the run_sql tool (DuckDB SQL).
${DATA_GUIDE}
TABLE SCHEMA (types as DuckDB reports them)
${this.schema}
${useNotes ? await notesBlock() : ""}`,
    };
    const history = this.history;
    history[0] = system; // rebuilt per question so the notes toggle takes effect immediately
    history.push({ role: "user", content: question });

    let errors = 0;
    const ctx: ToolContext = { lastRows: [], onSql, excludePitLaps }; // lastRows: rows of the most recent successful row-producing tool, for make_chart
    const runs: Row[][] = []; // every successful row set this question, for the table fallback
    for (let step = 0; step < MAX_STEPS; step++) {
      const { text, calls } = await this.model.call(history, this.toolDefinitions);
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
          const tool = this.toolByName.get(c.name) ?? this.toolByName.get("run_sql")!; // unknown names fall back to run_sql, as before
          const out = await tool.run(args, ctx);
          if (out.chart) onChart(out.chart.spec, out.chart.rows);
          if (out.rows) { ctx.lastRows = out.rows; runs.push(out.rows); }
          result = out.content;
        } catch (e) {
          result = JSON.stringify({ error: String(e instanceof Error ? e.message : e) });
          if (++errors > MAX_SQL_RETRIES) { history.push({ role: "tool", tool_call_id: c.id, name: c.name, content: result }); return `Gave up after ${errors} SQL errors. Last error: ${result}`; }
        }
        history.push({ role: "tool", tool_call_id: c.id, name: c.name, content: result });
      }
    }
    return "Stopped: too many tool steps.";
  }
}
