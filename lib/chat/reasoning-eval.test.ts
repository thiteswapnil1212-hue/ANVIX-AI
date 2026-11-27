import test from "node:test";
import assert from "node:assert/strict";

import {
  extractFinalNumber,
  scoreAnswer,
  type EvalQuestion,
} from "./reasoning-eval.ts";
import { REASONING_EVAL_QUESTIONS } from "./reasoning-eval-questions.ts";

function numberQuestion(value: number): EvalQuestion {
  return {
    id: "test",
    prompt: "test",
    expected: String(value),
    match: { kind: "number", value },
  };
}

test("extractFinalNumber takes the last number, not the working", () => {
  assert.equal(
    extractFinalNumber("Total distance 150 km over 2 hours, so 150 / 2 = 75 km/h."),
    75
  );
  assert.equal(extractFinalNumber("Rs 1,000 after discount is Rs 720."), 720);
  assert.equal(extractFinalNumber("No numbers here."), null);
});

test("a correct final answer passes even with working shown", () => {
  const score = scoreAnswer(
    numberQuestion(75),
    "Distance = 60 + 90 = 150 km. Time = 45 + 75 = 120 min = 2 h. Average = 150 / 2 = 75 km/h."
  );
  assert.equal(score.pass, true);
});

test("a wrong final number fails even when the working mentions the right one", () => {
  // Classic trap answer: the working contains 75 but the verdict is 100.
  const score = scoreAnswer(
    numberQuestion(75),
    "150 km in 2 hours is 75 km/h, but with traffic it is 100 km/h."
  );
  assert.equal(score.pass, false);
});

test("an endpoint error marker fails, never scores the text", () => {
  const score = scoreAnswer(
    numberQuestion(42),
    "[An error occurred while generating the response.]"
  );
  assert.equal(score.pass, false);
  assert.match(score.detail, /endpoint error/);
});

test("empty replies fail", () => {
  assert.equal(scoreAnswer(numberQuestion(9), "   ").pass, false);
});

test("contains matching requires every phrase", () => {
  const question: EvalQuestion = {
    id: "test",
    prompt: "test",
    expected: "all months",
    match: { kind: "contains", phrases: ["every month", "28 days"] },
  };
  assert.equal(
    scoreAnswer(question, "Every month has at least 28 days.").pass,
    true
  );
  assert.equal(
    scoreAnswer(question, "Every month has days.").pass,
    false
  );
});

test("the eval set has 12 questions with unique ids", () => {
  assert.equal(REASONING_EVAL_QUESTIONS.length, 12);
  const ids = new Set(REASONING_EVAL_QUESTIONS.map((q) => q.id));
  assert.equal(ids.size, 12);
  // The three live-baseline seeds are in the set.
  for (const seed of ["train-avg-speed", "sheep-left", "shirt-discount"]) {
    assert.ok(ids.has(seed), `missing seed question ${seed}`);
  }
  for (const q of REASONING_EVAL_QUESTIONS) {
    assert.ok(q.prompt.length > 0);
    assert.ok(q.expected.length > 0);
  }
});
