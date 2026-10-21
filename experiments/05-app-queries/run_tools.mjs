// Spike driver: the model picks an app query tool and explains the rows. It does not write SQL.
import { writeFileSync } from "node:fs";
import { buildTools } from "./tools.mjs";

const LLM_URL = process.env.LLM_URL ?? "http://localhost:11434/v1/chat/completions";
const LLM_MODEL = process.env.LLM_MODEL ?? "gpt-oss:20b-f1";
const MAX_TURNS = 4;
const GRAIN_NOTE = (process.env.GRAIN_NOTE ?? "on") !== "off";
const REMINDER = "Use only the rows above. Quote numbers exactly as shown. Do not name a driver that is not in the rows.";
const OUT = GRAIN_NOTE ? "./trace-grain-on.json" : "./trace-grain-off.json";

const QUESTIONS = [
  { id: "t1_dirty_air_monza", q: "Who lost the most time to dirty air at Monza in 2024?", expect: "STR or MAG, about 7.28 s" },
  { id: "t2_consistency_2024", q: "Which drivers were the most consistent in 2024?", expect: "lowest driver_residual_stddev_s, from driver_consistency" },
  { id: "t3_constructors_2024", q: "How did the constructors compare on pace across 2024?", expect: "constructor_pace, season average, McLaren first" },
  { id: "t4_explain_dirty_air", q: "What does the dirty air cost measure, and what does it leave out?", expect: "explanation, no table needed or dirty_air_cost used" },
  { id: "t5_braking_out_of_scope", q: "What was Verstappen's braking point into Turn 1 at Monza in 2024?", expect: "says no tool covers braking points; no invented number" },
];

const SYSTEM = [
  "You are the companion for an F1 data app. You do not write SQL.",
  "To answer a data question, call the tool that matches it. Use list_races first if you need a race_id. Use only the ids the tools return; never guess a driver or race id.",
  "Answer in two or three sentences, using the numbers in the tool rows. Say what the measure means and what it leaves out.",
  "If no tool covers the question, say so plainly and do not give a number.",
].join("\n");

const { definitions, call, grainFor } = await buildTools();

async function chat(messages) {
  const res = await fetch(LLM_URL, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ model: LLM_MODEL, messages, tools: definitions, temperature: 0, max_tokens: 2048 }),
  });
  if (!res.ok) throw new Error(`LLM ${res.status}: ${(await res.text()).slice(0, 300)}`);
  return (await res.json()).choices[0].message;
}

const trace = [];
for (const item of QUESTIONS) {
  const messages = [{ role: "system", content: SYSTEM }, { role: "user", content: item.q }];
  const calls = [];
  let answer = null;
  for (let turn = 0; turn < MAX_TURNS && answer === null; turn++) {
    const msg = await chat(messages);
    messages.push(msg);
    if (!msg.tool_calls?.length) { answer = msg.content ?? ""; break; }
    const grainNotes = [];
    for (const tc of msg.tool_calls) {
      const name = tc.function.name;
      const args = typeof tc.function.arguments === "string" ? JSON.parse(tc.function.arguments || "{}") : tc.function.arguments ?? {};
      let result;
      try { result = call(name, args); calls.push({ name, args, rowCount: result.rowCount, rows: name === "list_races" ? undefined : result.rows, note: result.note }); }
      catch (e) { result = { error: e.message }; calls.push({ name, args, error: e.message }); }
      messages.push({ role: "tool", tool_call_id: tc.id, name, content: JSON.stringify(result) });
      const g = grainFor(name);
      if (GRAIN_NOTE && g && !result.error && !grainNotes.some((n) => n.name === name)) grainNotes.push({ name, g });
    }
    // Injected after the tool results of this turn (kept contiguous), one note per tool used.
    for (const { name, g } of grainNotes) messages.push({ role: "system", content: `Note on ${name} rows: ${g}. ${REMINDER}` });
  }
  trace.push({ id: item.id, question: item.q, expect: item.expect, calls, answer });
  console.log(`\n## ${item.id}\nQ: ${item.q}\ncalls: ${JSON.stringify(calls)}\nA: ${answer}`);
}
writeFileSync(new URL(OUT, import.meta.url), JSON.stringify(trace, null, 1));
