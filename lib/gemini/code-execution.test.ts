import test from "node:test";
import assert from "node:assert/strict";

import {
  CODE_EXECUTION_OUTPUT_CAP,
  codeExecutionTool,
  extractCodeExecution,
  formatCodeExecutionFinding,
  isCodeExecutionOk,
} from "./code-execution.ts";

function fakeResponse(parts: unknown[]) {
  return { candidates: [{ content: { parts } }] };
}

test("codeExecutionTool returns the typed built-in tool", () => {
  assert.deepEqual(codeExecutionTool(), [{ codeExecution: {} }]);
});

test("extractCodeExecution reads code + result parts", () => {
  const extracted = extractCodeExecution(
    fakeResponse([
      { text: "Let me compute that." },
      {
        executableCode: {
          language: "PYTHON",
          code: "print(6 * 7)",
        },
      },
      {
        codeExecutionResult: {
          outcome: "OUTCOME_OK",
          output: "42\n",
        },
      },
    ])
  );
  assert.equal(extracted.code, "print(6 * 7)");
  assert.equal(extracted.language, "PYTHON");
  assert.equal(extracted.output, "42\n");
  assert.equal(extracted.outcome, "OUTCOME_OK");
  assert.equal(isCodeExecutionOk(extracted), true);
});

test("a failed execution is not OK", () => {
  const extracted = extractCodeExecution(
    fakeResponse([
      {
        codeExecutionResult: {
          outcome: "OUTCOME_FAILED",
          output: "ZeroDivisionError: division by zero\n",
        },
      },
    ])
  );
  assert.equal(isCodeExecutionOk(extracted), false);
  assert.equal(extracted.outcome, "OUTCOME_FAILED");
});

test("malformed responses extract to empties, never throw", () => {
  for (const bad of [null, undefined, {}, [], { candidates: [] }, "x"]) {
    const extracted = extractCodeExecution(bad);
    assert.equal(extracted.code, "");
    assert.equal(extracted.output, "");
    assert.equal(extracted.outcome, null);
    assert.equal(isCodeExecutionOk(extracted), false);
  }
});

test("formatCodeExecutionFinding caps runaway output", () => {
  const long = "x".repeat(CODE_EXECUTION_OUTPUT_CAP + 500);
  const finding = formatCodeExecutionFinding({
    code: "print('x' * 2000)",
    language: "PYTHON",
    output: long,
    outcome: "OUTCOME_OK",
  });
  assert.match(finding, /OUTCOME_OK/);
  assert.match(finding, /output truncated/);
  assert.ok(finding.length < long.length);
  // The full output must not leak into the brief.
  assert.equal(finding.includes(long), false);
});

test("formatCodeExecutionFinding handles no output", () => {
  const finding = formatCodeExecutionFinding({
    code: "",
    language: "",
    output: "",
    outcome: null,
  });
  assert.match(finding, /no result/);
  assert.match(finding, /no output/);
});
