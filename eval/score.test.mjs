// node --test eval/score.test.mjs
import test from "node:test"; import assert from "node:assert/strict"; import { readFileSync } from "node:fs";
import { score, parseNumbers } from "./score.mjs";
const Q = Object.fromEntries(JSON.parse(readFileSync(new URL("./questions.json", import.meta.url))).map((q) => [q.id, q]));
const v = (id, a) => score(Q[id], a).verdict;
test("top_compound: wrong count fails, right count passes", () => {
  assert.equal(v("top_compound", "The most common compound was **HARD**, with **13,514 laps**."), "fail");
  assert.equal(v("top_compound", "HARD - 13,767 laps."), "pass");
  assert.equal(v("top_compound", "HARD was used most."), "fail");
});
test("wins_team: narrow no-break spaces", () => {
  assert.equal(v("wins_team", "Red Bull Racing won the most races in 2024, with **9 victories**."), "pass");
  assert.equal(v("wins_team", "Red Bull Racing – 9 race wins in 2024."), "pass");
  assert.equal(v("wins_team", "McLaren won 6."), "fail");
  assert.equal(v("wins_team", "Red Bull won 19 races."), "fail");
});
test("times", () => {
  assert.equal(v("fastest_monza", "Norris, 1:21.432"), "pass");
  assert.equal(v("fastest_monza", "NOR set 81.432 seconds"), "pass");
  assert.equal(v("fastest_monza", "NOR 81432000000 ns"), "pass");
  assert.equal(v("fastest_monza", "Norris 1:21.512"), "fail");
  assert.equal(v("fastest_monza", "Hamilton 1:21.432"), "fail");
});
test("number parsing", () => {
  assert.deepEqual(parseNumbers("13 767 laps, 1,234.5 and 1:21.432").numbers, [13767, 1234.5]);
  assert.deepEqual(parseNumbers("1:21.432").times, [81.432]);
});
test("unanswerable", () => {
  assert.equal(v("unanswerable", "The data does not contain 2023."), "pass");
  assert.equal(v("unanswerable", "Max Verstappen won."), "fail");
  assert.equal(v("unanswerable", "I cannot say; 2024 only, though Verstappen won there."), "check manually");
});
