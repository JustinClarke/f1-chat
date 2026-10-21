// Writes experiments/01-prompt-variants/variants/v3.txt from web/src/dataGuide.ts (unchanged), so V3 is exactly the current guide.
import { transformSync } from "esbuild";
import { readFileSync, writeFileSync } from "node:fs";
const src = readFileSync(new URL("../../../web/src/dataGuide.ts", import.meta.url), "utf8");
const js = transformSync(src, { loader: "ts", format: "esm" }).code;
const { DATA_GUIDE } = await import("data:text/javascript;base64," + Buffer.from(js).toString("base64"));
writeFileSync(new URL("./v3.txt", import.meta.url), DATA_GUIDE);
