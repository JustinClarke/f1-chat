# Master prompt protocol

Changes: every question (use_case 1 and 3) now gets the same system prompt and the same tool list (run_sql). Schema is a single format: table, column, type, plus "(values: A, B, C)" for VARCHAR columns with at most 12 distinct values (MAX_ENUM). No prose column descriptions. SCHEMA_VALUES flag and DUMP_ID option removed. Temperature 0, MAX_TURNS 6 unchanged. Schema block length: 22828 characters.

Previous baseline (plain schema, split prompts, 21 of 24) preserved in baseline-plain/.

Frozen master prompt (the page text is page_context_driver_consistency.txt, the schema is adapter.schemaText()):

```
You answer questions about Formula 1. When data is needed, write DuckDB SQL and run it with run_sql, then answer from the rows returned.
Answer in one or two sentences with the key numbers. If the page text below covers the question, answer from it; if not, say the data does not cover it.

PAGE TEXT:
<contents of page_context_driver_consistency.txt>

TABLES (name and columns):
<schema block>
```

Questions (experiments/04-companion-adapter/companion_questions.json) and scorer (experiments/_shared/score.mjs) were not changed.
