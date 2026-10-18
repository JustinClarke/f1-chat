// Public entry point for the chat. The code lives in model.ts (ModelClient), session.ts (ChatSession) and tools/.
import type { ChartSpec } from "./chart";
import { ModelClient, type Msg, type Call } from "./model";
import { ChatSession, splitLongTable } from "./session";
import { defaultTools, validateSql, checkChartSpec, type Row } from "./tools";

export { validateSql, checkChartSpec, splitLongTable };
export type { Msg, Call };

const session = new ChatSession();
const client = new ModelClient();
const defaultDefinitions = defaultTools().map((t) => t.definition);

export const callModel = (messages: Msg[], toolList: unknown[] = defaultDefinitions) => client.call(messages, toolList);
export const resetChat = () => session.reset();
export const ask = (
  question: string,
  onSql: (sql: string) => void,
  useNotes = false,
  onChart: (spec: ChartSpec, rows: Row[]) => void = () => {},
  onTable: (rows: Row[]) => void = () => {},
  excludePitLaps = true,
): Promise<string> => session.ask(question, onSql, useNotes, onChart, onTable, excludePitLaps);
