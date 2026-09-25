import test from "node:test";
import assert from "node:assert/strict";

import { generateProjectTextWithFallback } from "./route.ts";

function makeValidProject() {
  return {
    project: {
      name: "demo-coffee-shop",
      framework: "nextjs",
      files: [
        {
          path: "package.json",
          content: '{"name":"demo-coffee-shop","private":true}',
          language: "json",
        },
        {
          path: "app/layout.tsx",
          content: "export default function Layout() { return <html><body /></html>; }",
          language: "tsx",
        },
        {
          path: "app/page.tsx",
          content: "export default function Page() { return <main>Coffee shop</main>; }",
          language: "tsx",
        },
        {
          path: "app/globals.css",
          content: "body { margin: 0; }",
          language: "css",
        },
      ],
    },
  };
}

test("falls back to the next model when the first model returns malformed JSON", async () => {
  const calls: string[] = [];

  const modelFactory = (apiKey: string, modelName: string) => {
    calls.push(modelName);
    return {
      generateContent: async () => {
        if (modelName === "gemini-2.5-flash") {
          return {
            response: {
              text: async () => "```json\n{bad json}\n```",
            },
          };
        }

        return {
          response: {
            text: async () => JSON.stringify(makeValidProject()),
          },
        };
      },
    } as any;
  };

  const project = await generateProjectTextWithFallback("test-key", "Build a coffee shop", modelFactory);

  assert.equal(project.name, "demo-coffee-shop");
  assert.deepEqual(calls, ["gemini-2.5-flash", "gemini-2.5-flash-lite"]);
});

test("falls back when the current model has a retryable provider error", async () => {
  const calls: string[] = [];

  const modelFactory = (apiKey: string, modelName: string) => {
    calls.push(modelName);
    return {
      generateContent: async () => {
        if (modelName === "gemini-2.5-flash") {
          const error = new Error("Service unavailable") as Error & { status?: number };
          error.status = 503;
          throw error;
        }

        return {
          response: {
            text: async () => JSON.stringify(makeValidProject()),
          },
        };
      },
    } as any;
  };

  const project = await generateProjectTextWithFallback("test-key", "Build a coffee shop", modelFactory);

  assert.equal(project.framework, "nextjs");
  assert.deepEqual(calls, ["gemini-2.5-flash", "gemini-2.5-flash-lite"]);
});

test("throws if all models fail and preserves permanent-error classification", async () => {
  const calls: string[] = [];

  const modelFactory = (apiKey: string, modelName: string) => {
    calls.push(modelName);
    return {
      generateContent: async () => {
        const error = new Error("Invalid API key") as Error & { status?: number };
        error.status = 401;
        throw error;
      },
    } as any;
  };

  await assert.rejects(
    () => generateProjectTextWithFallback("bad-key", "Build a coffee shop", modelFactory),
    /Invalid API key/
  );

  assert.deepEqual(calls, ["gemini-2.5-flash", "gemini-2.5-flash-lite", "gemini-2.0-flash"]);
});
