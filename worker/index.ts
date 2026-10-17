// POST /chat  {messages, tools}  ->  Workers AI response as JSON.
interface Env {
  AI: { run(model: string, input: unknown): Promise<unknown> };
  AI_MODEL: string;
}

const cors = {
  "Access-Control-Allow-Origin": "*", // local dev only; restrict before deploying
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const url = new URL(req.url);
    if (req.method === "OPTIONS") return new Response(null, { headers: cors });
    if (req.method !== "POST" || url.pathname !== "/chat") return json({ error: "POST /chat only" }, 404);
    try {
      const { messages, tools, temperature, max_tokens, reasoning } = (await req.json()) as { messages: unknown[]; tools?: unknown[]; temperature?: number; max_tokens?: number; reasoning?: unknown };
      if (!Array.isArray(messages)) return json({ error: "messages must be an array" }, 400);
      const result = await env.AI.run(env.AI_MODEL, { messages, tools, max_tokens: max_tokens ?? 8192, ...(temperature !== undefined && { temperature }), ...(reasoning !== undefined && { reasoning }) });
      return json(result);
    } catch (e) {
      return json({ error: String(e) }, 500);
    }
  },
};
