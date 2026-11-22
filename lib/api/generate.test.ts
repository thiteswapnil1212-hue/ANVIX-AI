import test from "node:test";
import assert from "node:assert/strict";

import { buildBlueprintResult, generateProject } from "./generate.ts";

// generateProject calls the global fetch and the Supabase auth headers
// helper. Stub both: fetch per test, and the auth-headers module is not
// needed because the Supabase client is null without env vars.
type FetchStub = (
  url: string,
  init?: Record<string, unknown>
) => Promise<Response>;

function stubFetch(handler: FetchStub) {
  const previous = globalThis.fetch;
  globalThis.fetch = handler as typeof fetch;
  return () => {
    globalThis.fetch = previous;
  };
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

test("buildBlueprintResult takes its summary from the reply's first line", () => {
  const result = buildBlueprintResult(
    "Build a CRM for small teams.\n\nIt has contacts, deals and reports.",
    "Gemini 3.5 Flash-Lite"
  );

  assert.equal(result.summary, "Build a CRM for small teams.");
  assert.equal(
    result.response,
    "Build a CRM for small teams.\n\nIt has contacts, deals and reports."
  );
  assert.equal(result.model, "Gemini 3.5 Flash-Lite");
  assert.equal(result.confidence, undefined);
  assert.equal(result.stack, undefined);
  assert.equal(result.modules, undefined);
});

test("buildBlueprintResult truncates a very long first line", () => {
  const result = buildBlueprintResult(
    `${"A".repeat(200)}\nSecond line.`,
    "Gemini 3.5 Flash-Lite"
  );

  assert.ok(result.summary.length <= 141);
  assert.ok(result.summary.endsWith("…"));
});

test("buildBlueprintResult falls back when the reply has no text", () => {
  const result = buildBlueprintResult("   \n  ", "Gemini 3.5 Flash-Lite");
  assert.equal(result.summary, "Product blueprint");
});

test("generateProject returns the parsed JSON blueprint on success", async () => {
  const restore = stubFetch(async () =>
    jsonResponse({
      success: true,
      result: {
        summary: "Build a CRM.",
        response: "Build a CRM.",
        model: "Gemini 3.5 Flash-Lite",
      },
    })
  );

  try {
    const data = await generateProject("Build a CRM");
    assert.equal(data.success, true);
    assert.equal(data.result.summary, "Build a CRM.");
  } finally {
    restore();
  }
});

test("generateProject surfaces the server 429 message with retry seconds", async () => {
  const restore = stubFetch(async () =>
    jsonResponse(
      {
        error: "Too many requests. Please slow down and try again shortly.",
        retryAfterSeconds: 12,
      },
      429
    )
  );

  try {
    await assert.rejects(
      () => generateProject("Build a CRM"),
      /Too many requests.*Try again in 12 seconds/
    );
  } finally {
    restore();
  }
});

test("generateProject surfaces the server error on a 500", async () => {
  const restore = stubFetch(async () =>
    jsonResponse({ error: "Gemini is not configured on this deployment." }, 500)
  );

  try {
    await assert.rejects(
      () => generateProject("Build a CRM"),
      /Gemini is not configured on this deployment/
    );
  } finally {
    restore();
  }
});

test("generateProject falls back to a generic message on a non-JSON error", async () => {
  const restore = stubFetch(
    async () =>
      new Response("<html>Bad Gateway</html>", {
        status: 502,
        headers: { "Content-Type": "text/html" },
      })
  );

  try {
    await assert.rejects(
      () => generateProject("Build a CRM"),
      /Failed to generate project/
    );
  } finally {
    restore();
  }
});
