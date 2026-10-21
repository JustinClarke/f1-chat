# show_table (archived)

`show_table` was a tool that took a single SELECT, ran it in the app, and drew every row as a table, so long lists did not have to be typed out by the model.

## Why archived

On Ollama the model never called it. Once it put rows in the tool arguments instead of a query. Stronger usage instructions did not change its behaviour. The model prefers to type tables itself.

## Restore

The `.before` files here are the versions with show_table:

- `chat.ts.before` (web/src/chat.ts)
- `main.ts.before` (web/src/main.ts)
- `trial2.mjs.before` (trial harness with the show_table stub)

Re-add the `show_table` pieces from them: the tool entry, the `onTable` parameter, the rule line, the dispatch branch, and the table rendering in main.ts.
