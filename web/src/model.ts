export type Msg = { role: string; content?: string | null; tool_calls?: unknown[]; tool_call_id?: string; name?: string };
export type Call = { id: string; name: string; args: string };

// Which model answers. "local" calls Ollama directly; "cloudflare" goes through the Worker (Workers AI).
// Switch back with: VITE_PROVIDER=cloudflare npm run dev
const PROVIDER = import.meta.env.VITE_PROVIDER ?? "local";
const WORKER_URL = import.meta.env.VITE_WORKER_URL ?? "http://localhost:8787";
const OLLAMA_URL = import.meta.env.VITE_OLLAMA_URL ?? "http://localhost:11434/v1";
// gpt-oss:20b with a 20k context and 8k output, built from eval/ollama/Modelfile.
const OLLAMA_MODEL = import.meta.env.VITE_OLLAMA_MODEL ?? "gpt-oss:20b-f1";

export class ModelClient {
  async call(messages: Msg[], toolList: unknown[]): Promise<{ text: string; calls: Call[] }> {
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
}
