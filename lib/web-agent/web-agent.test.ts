import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { isWebAgentAvailable } from "./availability.ts";
import {
  approvalDescriptionFor,
  approvalTitleFor,
  requestApproval,
  resolveApproval,
  stepNeedsApproval,
} from "./approvals.ts";
import { isAllowedWebUrl, validateWebPlan } from "./planner.ts";
import { isAllowedWebUrl as isAllowedWebUrlFromLeaf } from "./urls.ts";
import type { WebStep } from "./types.ts";

test("allowed URLs are public http(s) pages only", () => {
  assert.equal(isAllowedWebUrl("https://example.com"), true);
  assert.equal(isAllowedWebUrl("http://example.com/page?q=1"), true);
  assert.equal(isAllowedWebUrl("file:///etc/passwd"), false);
  assert.equal(isAllowedWebUrl("javascript:alert(1)"), false);
  assert.equal(isAllowedWebUrl("http://localhost:3000"), false);
  assert.equal(isAllowedWebUrl("http://127.0.0.1:8080"), false);
  assert.equal(isAllowedWebUrl("http://192.168.1.10"), false);
  assert.equal(isAllowedWebUrl("http://10.0.0.5"), false);
  assert.equal(isAllowedWebUrl("https://user:pass@example.com"), false);
  assert.equal(isAllowedWebUrl("not a url"), false);
  assert.equal(isAllowedWebUrl(""), false);
  assert.equal(isAllowedWebUrl(undefined), false);
});

test("a valid plan passes validation", () => {
  const plan = validateWebPlan({
    message: "Open example.com and read it.",
    steps: [
      { tool: "navigate", input: { url: "https://example.com" } },
      { tool: "read_page", input: {} },
      { tool: "report", input: { note: "Done." } },
    ],
  });

  assert.equal(plan.steps.length, 3);
  assert.equal(plan.steps[0]?.tool, "navigate");
});

test("flat steps without an input wrapper are accepted", () => {
  const plan = validateWebPlan({
    message: "Open it.",
    steps: [{ tool: "navigate", url: "https://example.com" }],
  });

  assert.equal(plan.steps[0]?.input.url, "https://example.com");
});

test("plans with shell tools are rejected", () => {
  assert.throws(
    () =>
      validateWebPlan({
        message: "Run something.",
        steps: [{ tool: "exec", input: { command: "ls" } }],
      }),
    /unsupported tool/
  );

  assert.throws(
    () =>
      validateWebPlan({
        message: "Sneaky.",
        steps: [
          {
            tool: "navigate",
            input: { url: "https://example.com", exec: "rm -rf /" },
          },
        ],
      }),
    /forbidden action/
  );
});

test("plans are rejected for bad URLs, password fields, and too many steps", () => {
  assert.throws(
    () =>
      validateWebPlan({
        message: "Bad URL.",
        steps: [{ tool: "navigate", input: { url: "http://localhost:3000" } }],
      }),
    /blocked or invalid URL/
  );

  assert.throws(
    () =>
      validateWebPlan({
        message: "Password.",
        steps: [
          {
            tool: "type",
            input: { selector: "input[type=password]", text: "secret" },
          },
        ],
      }),
    /password field/
  );

  assert.throws(
    () =>
      validateWebPlan({
        message: "Too long.",
        steps: Array.from({ length: 11 }, () => ({
          tool: "wait",
          input: { ms: 100 },
        })),
      }),
    /too many steps/
  );

  assert.throws(
    () =>
      validateWebPlan({
        message: "No steps.",
        steps: [],
      }),
    /no steps/
  );
});

test("wait steps cap at 10 seconds", () => {
  assert.throws(
    () =>
      validateWebPlan({
        message: "Long wait.",
        steps: [{ tool: "wait", input: { ms: 60_000 } }],
      }),
    /ms between 0 and 10000/
  );
});

test("risky clicks always need approval, even without the flag", () => {
  const sendStep: WebStep = {
    tool: "click",
    input: { selector: "button[type=submit]" },
  };
  const readStep: WebStep = { tool: "read_page", input: {} };
  const flaggedStep: WebStep = {
    tool: "navigate",
    input: { url: "https://example.com" },
    requiresApproval: true,
  };

  assert.equal(stepNeedsApproval(sendStep), true);
  assert.equal(stepNeedsApproval(readStep), false);
  assert.equal(stepNeedsApproval(flaggedStep), true);
  assert.match(approvalTitleFor(sendStep, 2), /Step 3/);
  assert.match(approvalDescriptionFor(sendStep), /Approve only/);
});

test("approval requests resolve, expire unknown ids, and time out", async () => {
  const request = {
    id: "approval-1",
    runId: "run-1",
    stepIndex: 0,
    title: "Step 1: Click",
    description: "Approve?",
  };

  const pending = requestApproval(request, 50);
  assert.equal(resolveApproval("run-1", "nope", "allowed"), false);
  assert.equal(resolveApproval("run-1", "approval-1", "denied"), true);
  assert.equal(await pending, "denied");

  const timedOut = requestApproval({ ...request, id: "approval-2" }, 50);
  assert.equal(await timedOut, "timeout");
  assert.equal(resolveApproval("run-1", "approval-2", "allowed"), false);
});

test("availability leaf answers 503-honestly on Vercel without playwright", () => {
  // availability.ts / urls.ts import only node builtins — this test
  // must pass with playwright uninstalled (the regression the 500
  // fix protects: the guard used to live behind the playwright import).
  const previous = process.env.VERCEL;
  process.env.VERCEL = "1";
  try {
    const result = isWebAgentAvailable();
    assert.equal(result.available, false);
    assert.match(
      result.reason ?? "",
      /runs on your own computer — it is not available on the hosted deployment/
    );
  } finally {
    if (previous === undefined) {
      delete process.env.VERCEL;
    } else {
      process.env.VERCEL = previous;
    }
  }

  assert.equal(isWebAgentAvailable().available, true);
  assert.equal(isAllowedWebUrlFromLeaf("https://example.com"), true);
  assert.equal(isAllowedWebUrlFromLeaf("http://localhost:3000"), false);
});

test("task routes statically import leaves only — no runner/planner/browser", () => {
  // A static import of the runner (or planner/browser) would drag the
  // playwright chain back into the route module load path on Vercel.
  // Dynamic `await import(...)` lines are fine — only static `import`
  // lines are checked.
  const staticImport =
    /^\s*import\s+[^;]*from\s+["']@\/lib\/web-agent\/(runner|planner|browser)["']/m;
  for (const route of [
    "../../app/api/web-agent/route.ts",
    "../../app/api/web-agent/stream/route.ts",
  ]) {
    const source = readFileSync(new URL(route, import.meta.url), "utf8");
    assert.doesNotMatch(
      source,
      staticImport,
      `${route} must not statically import runner/planner/browser`
    );
  }
});
