# 03. Prompt size cap

Date: 2026-10-17. Status: current.

**Decision.** Keep the system prompt to about 6 to 7k tokens.

**Why.** Set by the user: 6 to 7k is acceptable. The prompt is about 3,400 to 3,800 tokens now (data guide, schema with descriptions, rules). Measured with Ollama's prompt token count.

**Rule.** Do not add background F1 knowledge. Add a rule only for a failure that was seen, and keep it to one or two lines.
