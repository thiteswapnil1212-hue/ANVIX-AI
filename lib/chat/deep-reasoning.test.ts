import test from "node:test";
import assert from "node:assert/strict";

import {
  DEEP_REASONING_SYSTEM_INSTRUCTION,
  deepReasoningInstructionForMode,
} from "./deep-reasoning.ts";

test("Deep mode gets the structured reasoning instruction", () => {
  const instruction = deepReasoningInstructionForMode("deep");
  assert.equal(instruction, DEEP_REASONING_SYSTEM_INSTRUCTION);
  assert.ok(instruction.length > 0);
});

test("the Deep instruction has plan, solve, check, and answer steps", () => {
  const instruction = DEEP_REASONING_SYSTEM_INSTRUCTION;
  assert.match(instruction, /PLAN/);
  assert.match(instruction, /SOLVE/);
  // CHECK is the bounded self-verification step: re-check the working
  // before finalising, redo a step that fails — inside this generation.
  assert.match(instruction, /CHECK/);
  assert.match(instruction, /re-check each step/);
  assert.match(instruction, /recompute any arithmetic/);
  assert.match(instruction, /redo that step/);
  assert.match(instruction, /ANSWER/);
});

test("the Deep instruction says to keep the reply tight", () => {
  assert.match(DEEP_REASONING_SYSTEM_INSTRUCTION, /no rambling/);
  // Simple questions: final answer first, then the working.
  assert.match(
    DEEP_REASONING_SYSTEM_INSTRUCTION,
    /final answer first/
  );
});

test("Fast and Smart modes get no reasoning instruction", () => {
  assert.equal(deepReasoningInstructionForMode("fast"), "");
  assert.equal(deepReasoningInstructionForMode("smart"), "");
});
