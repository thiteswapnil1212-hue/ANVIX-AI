import test from "node:test";
import assert from "node:assert/strict";

import {
  runAgenticLoop,
  type LoopGenerate,
  type LoopGenerateResult,
} from "./agentic-loop-runner.ts";

function fakeSignal(): AbortSignal {
  return new AbortController().signal;
}

function planJson(steps: unknown): string {
  return JSON.stringify({
    direct: false,
    summary: "Test plan.",
    steps,
  });
}

test("a direct plan returns direct with no step calls", async () => {
  let calls = 0;
  const generate: LoopGenerate = async () => {
    calls++;
    return { text: '{"direct": true}', sources: [] };
  };
  const result = await runAgenticLoop({
    prompt: "what is 2+2?",
    webAvailable: true,
    generate,
    signal: fakeSignal(),
  });
  assert.equal(result.outcome, "direct");
  assert.equal(calls, 1);
});

test("plan + search + compute + verify returns a done brief", async () => {
  const thinking: string[] = [];
  const seen: string[] = [];
  const generate: LoopGenerate = async (input) => {
    seen.push(input.tools);
    if (input.tools === "none" && !input.prompt.includes("verifier")) {
      return {
        text: planJson([
          { kind: "search", query: "gold price", label: "gold price" },
          { kind: "compute", query: "10g total", label: "total" },
        ]),
        sources: [],
      };
    }
    if (input.tools === "grounding") {
      return {
        text: "Gold $2,600/oz.",
        sources: [{ title: "Reuters", uri: "https://example.com/gold" }],
      };
    }
    if (input.tools === "code") {
      return {
        text: "The total is $835.20.",
        sources: [],
        code: {
          code: "print(2600/31.1*10)",
          language: "PYTHON",
          output: "835.20\n",
          outcome: "OUTCOME_OK",
        },
      };
    }
    return {
      text: '{"ok": true, "brief": "Gold $2,600/oz (Reuters). 10g = $835.20 (computed)."}',
      sources: [],
    };
  };
  const result = await runAgenticLoop({
    prompt: "what is 10g of gold worth?",
    webAvailable: true,
    generate,
    signal: fakeSignal(),
    onThinking: (text) => thinking.push(text),
  });
  assert.equal(result.outcome, "done");
  if (result.outcome === "done") {
    assert.match(result.brief, /835\.20/);
    assert.equal(result.stepsUsed, 2);
    assert.deepEqual(result.sources, [
      { title: "Reuters", uri: "https://example.com/gold" },
    ]);
  }
  assert.deepEqual(seen, ["none", "grounding", "code", "none"]);
  assert.match(thinking[0], /Plan \(2 steps\)/);
  assert.match(thinking[1], /Step 1\/2: Searching the web/);
  assert.match(thinking[2], /Step 2\/2: Running Python/);
  assert.match(thinking[3], /Verifying/);
});

test("an unparseable plan falls back without running steps", async () => {
  let calls = 0;
  const generate: LoopGenerate = async () => {
    calls++;
    return { text: "I will just answer directly.", sources: [] };
  };
  const result = await runAgenticLoop({
    prompt: "hi",
    webAvailable: true,
    generate,
    signal: fakeSignal(),
  });
  assert.equal(result.outcome, "fallback");
  if (result.outcome === "fallback") {
    assert.equal(result.reason, "plan-unparseable");
  }
  assert.equal(calls, 1);
});

test("a failing step falls back and never calls verify", async () => {
  const seen: string[] = [];
  const generate: LoopGenerate = async (input) => {
    seen.push(input.tools);
    if (input.tools === "none" && !input.prompt.includes("verifier")) {
      return {
        text: planJson([
          { kind: "search", query: "x", label: "x" },
          { kind: "compute", query: "y", label: "y" },
        ]),
        sources: [],
      };
    }
    throw new Error("429 quota");
  };
  const result = await runAgenticLoop({
    prompt: "q",
    webAvailable: true,
    generate,
    signal: fakeSignal(),
  });
  assert.equal(result.outcome, "fallback");
  if (result.outcome === "fallback") {
    assert.equal(result.reason, "step-failed:search");
  }
  // Plan + one failed step; verify never ran.
  assert.deepEqual(seen, ["none", "grounding"]);
});

test("a compute step that never executed code falls back", async () => {
  const generate: LoopGenerate = async (input) => {
    if (input.tools === "none" && !input.prompt.includes("verifier")) {
      return {
        text: planJson([{ kind: "compute", query: "2+2", label: "sum" }]),
        sources: [],
      };
    }
    // The model answered in prose without running code.
    return { text: "It is 4.", sources: [] };
  };
  const result = await runAgenticLoop({
    prompt: "q",
    webAvailable: true,
    generate,
    signal: fakeSignal(),
  });
  assert.equal(result.outcome, "fallback");
  if (result.outcome === "fallback") {
    assert.equal(result.reason, "compute-not-executed");
  }
});

test("a rejected verify discards the findings", async () => {
  const generate: LoopGenerate = async (input) => {
    if (input.tools === "none" && !input.prompt.includes("verifier")) {
      return {
        text: planJson([{ kind: "search", query: "x", label: "x" }]),
        sources: [],
      };
    }
    if (input.tools === "grounding") {
      return { text: "Fact.", sources: [] };
    }
    return {
      text: '{"ok": false, "issue": "sources disagree"}',
      sources: [],
    };
  };
  const result = await runAgenticLoop({
    prompt: "q",
    webAvailable: true,
    generate,
    signal: fakeSignal(),
  });
  assert.equal(result.outcome, "fallback");
  if (result.outcome === "fallback") {
    assert.match(result.reason, /verify-rejected:sources disagree/);
  }
});

test("a compute-only loop skips the model verify and returns a done brief", async () => {
  // Loop-verify-groq-fix (2026-11-28): the verify MODEL rejected
  // the correct Python result for this exact question live, so a
  // compute-only loop must never call it — the finding is verified
  // by construction and the brief is assembled deterministically.
  const seen: string[] = [];
  const generate: LoopGenerate = async (input) => {
    seen.push(input.tools);
    if (input.tools === "none") {
      return {
        text: planJson([
          {
            kind: "compute",
            query: "987654321 * 123456789",
            label: "exact_multiplication",
          },
        ]),
        sources: [],
      };
    }
    return {
      text: "The product is 121932631112635269.",
      sources: [],
      code: {
        code: "print(987654321 * 123456789)",
        language: "PYTHON",
        output: "121932631112635269\n",
        outcome: "OUTCOME_OK",
      },
    };
  };
  const result = await runAgenticLoop({
    prompt: "Multiply 987654321 by 123456789 exactly.",
    webAvailable: true,
    generate,
    signal: fakeSignal(),
  });
  assert.equal(result.outcome, "done");
  if (result.outcome === "done") {
    assert.match(result.brief, /121932631112635269/);
    assert.match(result.brief, /OUTCOME_OK/);
    assert.equal(result.stepsUsed, 1);
  }
  // Plan + compute step only: no second "none" call for a model verify.
  assert.deepEqual(seen, ["none", "code"]);
});

test("a compute finding on unrelated numbers falls back without a model verify", async () => {
  const seen: string[] = [];
  const generate: LoopGenerate = async (input) => {
    seen.push(input.tools);
    if (input.tools === "none") {
      return {
        text: planJson([
          {
            kind: "compute",
            query: "987654321 * 123456789",
            label: "exact_multiplication",
          },
        ]),
        sources: [],
      };
    }
    return {
      text: "The product is 24642.",
      sources: [],
      code: {
        code: "print(111 * 222)",
        language: "PYTHON",
        output: "24642\n",
        outcome: "OUTCOME_OK",
      },
    };
  };
  const result = await runAgenticLoop({
    prompt: "Multiply 987654321 by 123456789 exactly.",
    webAvailable: true,
    generate,
    signal: fakeSignal(),
  });
  assert.equal(result.outcome, "fallback");
  if (result.outcome === "fallback") {
    assert.match(
      result.reason,
      /compute-unverified:code did not use the question's numbers/
    );
  }
  assert.deepEqual(seen, ["none", "code"]);
});

test("a mixed loop verifies search by model and keeps compute out of the verify call", async () => {
  let verifyPrompt = "";
  const generate: LoopGenerate = async (input) => {
    if (input.tools === "none" && !input.prompt.includes("verifier")) {
      return {
        text: planJson([
          { kind: "search", query: "gold price", label: "gold price" },
          { kind: "compute", query: "10g total", label: "total" },
        ]),
        sources: [],
      };
    }
    if (input.tools === "grounding") {
      return {
        text: "Gold $2,600/oz.",
        sources: [{ title: "Reuters", uri: "https://example.com/gold" }],
      };
    }
    if (input.tools === "code") {
      return {
        text: "The total is $835.20.",
        sources: [],
        code: {
          code: "print(2600/31.1*10)",
          language: "PYTHON",
          output: "835.20\n",
          outcome: "OUTCOME_OK",
        },
      };
    }
    verifyPrompt = input.prompt;
    return {
      text: '{"ok": true, "brief": "Gold $2,600/oz (Reuters)."}',
      sources: [],
    };
  };
  const result = await runAgenticLoop({
    prompt: "what is 10g of gold worth?",
    webAvailable: true,
    generate,
    signal: fakeSignal(),
  });
  assert.equal(result.outcome, "done");
  if (result.outcome === "done") {
    // Search brief from the model verify + compute finding appended.
    assert.match(result.brief, /Gold \$2,600\/oz \(Reuters\)/);
    assert.match(result.brief, /835\.20/);
    assert.equal(result.stepsUsed, 2);
  }
  // The model verify saw the search finding, never the compute one —
  // a model must not re-derive arithmetic it cannot check.
  assert.match(verifyPrompt, /Gold \$2,600\/oz/);
  assert.ok(!verifyPrompt.includes("835.20"));
});

test("budget exhaustion stops the loop before the next step", async () => {
  let nowMs = 0;
  const generate: LoopGenerate = async (input) => {
    // Each call burns 30 s of fake time.
    nowMs += 30_000;
    if (input.tools === "none" && !input.prompt.includes("verifier")) {
      return {
        text: planJson([
          { kind: "search", query: "a", label: "a" },
          { kind: "search", query: "b", label: "b" },
        ]),
        sources: [],
      };
    }
    return { text: "Fact.", sources: [] };
  };
  const result = await runAgenticLoop({
    prompt: "q",
    webAvailable: true,
    generate,
    signal: fakeSignal(),
    now: () => nowMs,
    budgetMs: 40_000,
  });
  // Plan (30 s) + step 1 (30 s) = 60 s > 40 s budget: step 2 never runs.
  assert.equal(result.outcome, "fallback");
  if (result.outcome === "fallback") {
    assert.equal(result.reason, "budget-exceeded");
  }
});

test("a hung generation times out and falls back", async () => {
  const generate: LoopGenerate = () =>
    new Promise<LoopGenerateResult>(() => {
      // Never resolves.
    });
  const result = await runAgenticLoop({
    prompt: "q",
    webAvailable: true,
    generate,
    signal: fakeSignal(),
    stepTimeoutMs: 20,
  });
  assert.equal(result.outcome, "fallback");
  if (result.outcome === "fallback") {
    assert.equal(result.reason, "plan-call-failed");
  }
});
