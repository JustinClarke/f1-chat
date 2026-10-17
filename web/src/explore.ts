import { exec, query } from "./db";
import { callModel, validateSql, type Msg } from "./chat";
import { profileViews } from "./profile";

const MAX_TOOL_CALLS = 8, MAX_TURNS = 12;

const tools = [
  {
    type: "function",
    function: {
      name: "run_sql",
      description: "Run one read-only DuckDB SELECT/WITH query against the laps and results tables. Returns up to 50 rows as JSON.",
      parameters: { type: "object", properties: { sql: { type: "string" } }, required: ["sql"] },
    },
  },
  {
    type: "function",
    function: {
      name: "save_note",
      description: "Save one thing you learned about this data. The evidence_sql is re-run by the system and the note is rejected if it errors.",
      parameters: {
        type: "object",
        properties: {
          topic: { type: "string" },
          claim: { type: "string", description: "What you learned, in plain English" },
          evidence_sql: { type: "string", description: "A SELECT that supports the claim" },
          confidence: { type: "string", enum: ["high", "medium", "low"] },
        },
        required: ["topic", "claim", "evidence_sql", "confidence"],
      },
    },
  },
];

const esc = (s: string) => s.replace(/'/g, "''");
const short = (v: unknown) => JSON.stringify(v, (_, x) => (typeof x === "string" && x.length > 60 ? x.slice(0, 60) : x));

export interface ExploreResult { saved: number; rejected: number; toolCalls: number; turns: number }

export async function explore(onEvent: (line: string) => void = () => {}): Promise<ExploreResult> {
  await exec(`CREATE OR REPLACE TABLE llm_notes (id INTEGER, topic VARCHAR, claim VARCHAR, evidence_sql VARCHAR,
    evidence_result VARCHAR, confidence VARCHAR, created_at TIMESTAMP DEFAULT current_timestamp)`);
  onEvent("Profiling schema...");
  const profile = await profileViews();

  const messages: Msg[] = [
    {
      role: "system",
      content: `You are exploring a DuckDB database of 2024 Formula 1 data (views: laps, results) so that you can answer questions about it correctly later.
Below is a deterministic profile of every view. Use run_sql to look further, and save_note for each important thing you learn:
what each table's rows represent (grain), which columns identify a row, how races/sessions/drivers are identified, units, traps that would make a naive query wrong.
Only save claims your evidence_sql supports. You have at most ${MAX_TOOL_CALLS} tool calls in total (run_sql and save_note both count), so do not waste them. When done, reply with a short plain-text summary.

PROFILE:
${short(profile)}`,
    },
    { role: "user", content: "Explore the data and save your notes." },
  ];

  const r: ExploreResult = { saved: 0, rejected: 0, toolCalls: 0, turns: 0 };
  let nextId = 1;
  while (r.turns < MAX_TURNS && r.toolCalls < MAX_TOOL_CALLS) {
    r.turns++;
    const { text, calls } = await callModel(messages, tools);
    if (!calls.length) { onEvent(`Model: ${text}`); break; }
    messages.push({
      role: "assistant", content: text ?? "",
      tool_calls: calls.map((c) => ({ id: c.id, type: "function", function: { name: c.name, arguments: c.args } })),
    });
    for (const c of calls) {
      let result: unknown;
      if (r.toolCalls >= MAX_TOOL_CALLS) result = { error: "Tool call budget used up." };
      else {
        r.toolCalls++;
        try {
          const a = JSON.parse(c.args);
          if (c.name === "run_sql") {
            const sql = validateSql(a.sql);
            onEvent(`run_sql: ${sql}`);
            const rows = await query(sql);
            result = { row_count: rows.length, rows: rows.slice(0, 50) };
          } else if (c.name === "save_note") {
            if (!["high", "medium", "low"].includes(a.confidence)) throw new Error("confidence must be high, medium or low");
            if (!a.topic || !a.claim) throw new Error("topic and claim are required");
            // Re-run the evidence ourselves and store what it really returns, not what the model says it returns.
            const sql = validateSql(a.evidence_sql);
            const evidence = JSON.stringify(await query(sql)).slice(0, 2000);
            await exec(`INSERT INTO llm_notes (id, topic, claim, evidence_sql, evidence_result, confidence) VALUES
              (${nextId++}, '${esc(a.topic)}', '${esc(a.claim)}', '${esc(sql)}', '${esc(evidence)}', '${a.confidence}')`);
            r.saved++;
            onEvent(`note saved [${a.confidence}] ${a.topic}: ${a.claim}`);
            result = { saved: true, evidence_result: evidence.slice(0, 300) };
          } else throw new Error(`Unknown tool ${c.name}`);
        } catch (e) {
          if (c.name === "save_note") { r.rejected++; onEvent(`note rejected: ${e instanceof Error ? e.message : e}`); }
          result = { error: String(e instanceof Error ? e.message : e) };
        }
      }
      messages.push({ role: "tool", tool_call_id: c.id, name: c.name, content: JSON.stringify(result) });
    }
  }
  onEvent(`Done: ${r.saved} notes saved, ${r.rejected} rejected, ${r.toolCalls} tool calls, ${r.turns} turns.`);
  return r;
}
