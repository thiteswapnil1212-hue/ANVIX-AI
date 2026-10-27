import test from "node:test";
import assert from "node:assert/strict";

import { parseJsonWithRepair, repairJsonText } from "./json-repair.ts";

test("repairJsonText removes a stray double comma", () => {
  const repaired = repairJsonText('{\n  "a": 1,\n  ,\n  "b": 2\n}');
  assert.ok(repaired !== null);
  assert.deepEqual(JSON.parse(repaired), { a: 1, b: 2 });
});

test("repairJsonText removes trailing commas before closing brackets", () => {
  const repaired = repairJsonText('{"a": [1, 2,], "b": {"c": 3,},}');
  assert.ok(repaired !== null);
  assert.deepEqual(JSON.parse(repaired), { a: [1, 2], b: { c: 3 } });
});

test("repairJsonText leaves commas inside strings untouched", () => {
  const text = '{"message": "a,, b,}", "list": ["x, y,"]}';
  const repaired = repairJsonText(text);
  assert.equal(repaired, text);
  assert.deepEqual(JSON.parse(repaired as string), {
    message: "a,, b,}",
    list: ["x, y,"],
  });
});

test("repairJsonText leaves escaped quotes inside strings untouched", () => {
  const text = '{"note": "she said \\"hi,,\\" loudly,"}';
  const repaired = repairJsonText(text);
  assert.equal(repaired, text);
});

test("repairJsonText returns null when the JSON is broken beyond commas", () => {
  assert.equal(repairJsonText('{"a": }'), null);
  assert.equal(repairJsonText("not json at all"), null);
  assert.equal(repairJsonText('{"a": 1,'), null);
});

test("parseJsonWithRepair reports whether a repair happened", () => {
  const clean = parseJsonWithRepair('{"a": 1}');
  assert.deepEqual(clean, { value: { a: 1 }, repaired: false });

  const fixed = parseJsonWithRepair('{"a": 1,}');
  assert.deepEqual(fixed, { value: { a: 1 }, repaired: true });

  assert.equal(parseJsonWithRepair("{broken"), null);
});
