// Strict scorer. Compares an answer against questions.json `expected_values` (computed by ground_truth.py).
// Rules (also in the eval README section / summary.md):
//  1. Normalise text: NFKC, every Unicode space (NBSP U+00A0, narrow NBSP U+202F, thin space...) -> " ", dashes/minus -> "-".
//     (This is why wins_team used to say "check manually": the model wrote "Red<U+202F>Bull", which a literal-space regex missed.)
//  2. Numbers parsed from the answer: h:mm:ss.fff and m:ss.fff times -> seconds; "13,514" and "13 514" (space-grouped) -> 13514;
//     decimals; plain integers. Time tokens are removed before plain numbers are read, so "1:21.432" never yields 21.432 or 1.
//  3. kind=number: pass if any parsed number equals the expected value exactly (integers) or within 1e-9.
//  4. kind=time: pass if any parsed time/number, in seconds, is within 0.5 ms of the expected seconds. A value >= 1e6 is
//     also tried as nanoseconds (/1e9). So "1:21.432", "81.432", "81.432 s" and "81432000000" all match; "1:21.43" does not.
//  5. kind=name: pass if any alias appears as a whole word/phrase, case- and accent-insensitive.
//  6. Verdict "pass" only if EVERY expected value matches; "fail" if any is absent. Answers starting "Gave up"/"Stopped" fail.
//  7. kind=refusal (unanswerable): refusal phrase present and no forbidden driver name -> pass; no refusal but a driver name
//     -> fail; refusal AND a driver name, or neither -> "check manually". This is the only source of "check manually".
const SPACES = /[   -   　]/g;
export function normalise(s) {
  return String(s ?? "").normalize("NFKC").replace(SPACES, " ").replace(/[‐-―−]/g, "-");
}
const fold = (s) => normalise(s).normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();

// -> { numbers: number[], times: number[] (seconds) }
export function parseNumbers(answer) {
  let t = normalise(answer);
  const times = [];
  t = t.replace(/(?<![\d.:])(\d{1,2}):(\d{2}):(\d{2}(?:\.\d+)?)(?![\d:])/g, (_, h, m, s) => { times.push(+h * 3600 + +m * 60 + +s); return " "; });
  t = t.replace(/(?<![\d.:])(\d{1,3}):(\d{2}(?:\.\d+)?)(?![\d:])/g, (_, m, s) => { times.push(+m * 60 + +s); return " "; });
  t = t.replace(/(?<=\d) (?=\d{3}(?!\d))/g, (m, off, str) => (/(?<![\d,.])\d{1,3}$/.test(str.slice(0, off)) ? "" : m)); // "13 514" -> "13514"
  const numbers = [];
  for (const m of t.matchAll(/(?<![\d.])(\d{1,3}(?:,\d{3})+|\d+)(\.\d+)?/g)) numbers.push(Number(m[1].replace(/,/g, "") + (m[2] ?? "")));
  return { numbers, times };
}

const REFUSAL = /not (available|in the data|present|covered|included)|no data|(don't|do not|doesn't|does not|didn't) (have|contain|include|cover)|cannot|can't|unable|only (cover|contain|include)|2024 (season )?only|outside (of )?(the )?(2024|data)|no (information|record)/i;

export function score(q, answer) {
  const ans = String(answer ?? "");
  const parsed = parseNumbers(ans);
  const folded = fold(ans);
  const checks = [];
  let manual = null;
  for (const e of q.expected_values) {
    if (e.kind === "number") {
      const hit = parsed.numbers.find((n) => Math.abs(n - e.value) < 1e-9);
      checks.push({ label: e.label, kind: e.kind, expected: e.value, ok: hit !== undefined, matched: hit ?? null });
    } else if (e.kind === "time") {
      const cands = [...parsed.times, ...parsed.numbers, ...parsed.numbers.filter((n) => n >= 1e6).map((n) => n / 1e9)];
      const hit = cands.find((n) => Math.abs(n - e.seconds) <= 0.0005);
      checks.push({ label: e.label, kind: e.kind, expected: `${e.display} = ${e.seconds}s`, ok: hit !== undefined, matched: hit ?? null });
    } else if (e.kind === "name") {
      const hit = e.any.find((a) => new RegExp(`(?<![\\p{L}\\p{N}])${fold(a).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?![\\p{L}\\p{N}])`, "u").test(folded));
      checks.push({ label: e.label, kind: e.kind, expected: e.any, ok: hit !== undefined, matched: hit ?? null });
    } else if (e.kind === "refusal") {
      const refuses = REFUSAL.test(normalise(ans));
      const named = e.forbidden_names.filter((n) => new RegExp(`(?<![\\p{L}\\p{N}])${fold(n)}(?![\\p{L}\\p{N}])`, "u").test(folded));
      const ok = refuses && !named.length;
      if (!refuses && named.length) { /* fail */ } else if (!ok) manual = refuses ? "refused but also named a driver" : "no refusal phrase and no driver named";
      checks.push({ label: e.label, kind: e.kind, expected: "refusal, no driver named", ok, refuses, named_drivers: named });
    }
  }
  let verdict, reason;
  if (/^(Gave up|Stopped)/.test(ans)) { verdict = "fail"; reason = `run did not finish: ${ans.slice(0, 120)}`; }
  else if (manual && checks.every((c) => c.ok || c.kind === "refusal")) { verdict = "check manually"; reason = manual; }
  else if (checks.every((c) => c.ok)) { verdict = "pass"; reason = "all expected values found"; }
  else {
    verdict = "fail";
    reason = "missing: " + checks.filter((c) => !c.ok).map((c) => c.kind === "refusal" ? (c.named_drivers.length ? `named ${c.named_drivers.join("/")} without refusing` : "no refusal") : `${c.label} (${Array.isArray(c.expected) ? c.expected.join("/") : c.expected})`).join("; ");
  }
  return { verdict, reason, checks, parsed_numbers: parsed.numbers, parsed_times_seconds: parsed.times };
}
