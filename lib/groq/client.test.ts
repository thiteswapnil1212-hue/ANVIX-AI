import test from "node:test";
import assert from "node:assert/strict";

import {
  GroqError,
  streamGroqChatCompletion,
} from "./client.ts";
import { GROQ_API_URL, GROQ_REASONING_MODEL_ID } from "./config.ts";

/** Build a fake streaming SSE Response from raw chunk strings. */
function sseResponse(chunks: string[], status = 200): Response {
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const encoder = new TextEncoder();
      for (const chunk of chunks) controller.enqueue(encoder.encode(chunk));
      controller.close();
    },
  });
  return new Response(stream, {
    status,
    headers: { "Content-Type": "text/event-stream" },
  });
}

function sseData(delta: Record<string, unknown>): string {
  return `data: ${JSON.stringify({ choices: [{ delta }] })}\n`;
}

function collect() {
  const thinking: string[] = [];
  const text: string[] = [];
  return {
    thinking,
    text,
    callbacks: {
      onThinking: (t: string) => thinking.push(t),
      onText: (t: string) => text.push(t),
    },
  };
}

test("client posts to the Groq OpenAI-compatible endpoint with the R1 distill", async () => {
  let seenUrl = "";
  let seenInit: RequestInit | undefined;
  const fetchImpl = (async (url: string, init?: RequestInit) => {
    seenUrl = url;
    seenInit = init;
    return sseResponse([sseData({ content: "hi" }), "data: [DONE]\n"]);
  }) as typeof fetch;

  const { callbacks } = collect();
  await streamGroqChatCompletion({
    apiKey: "gsk-test",
    systemInstruction: "Behave.",
    prompt: "Hello",
    fetchImpl,
    ...callbacks,
  });

  assert.equal(seenUrl, `${GROQ_API_URL}/chat/completions`);
  assert.equal(seenInit?.method, "POST");
  const headers = seenInit?.headers as Record<string, string>;
  assert.equal(headers.Authorization, "Bearer gsk-test");
  const body = JSON.parse(String(seenInit?.body)) as Record<string, unknown>;
  assert.equal(body.model, GROQ_REASONING_MODEL_ID);
  assert.equal(body.stream, true);
  assert.deepEqual(body.messages, [
    { role: "system", content: "Behave." },
    { role: "user", content: "Hello" },
  ]);
});

test("client strips think tags from the answer and routes them to thinking", async () => {
  const fetchImpl = (async () =>
    sseResponse([
      sseData({ content: "<think>First I check the maths.</think>" }),
      sseData({ content: "The answer is 42." }),
      "data: [DONE]\n",
    ])) as typeof fetch;

  const { thinking, text, callbacks } = collect();
  await streamGroqChatCompletion({
    apiKey: "gsk-test",
    systemInstruction: "",
    prompt: "What is 17 + 25?",
    fetchImpl,
    ...callbacks,
  });

  assert.deepEqual(thinking, ["First I check the maths."]);
  assert.deepEqual(text, ["The answer is 42."]);
});

test("client routes reasoning_content deltas to thinking", async () => {
  const fetchImpl = (async () =>
    sseResponse([
      sseData({ reasoning_content: "Let me think." }),
      sseData({ content: "42" }),
      "data: [DONE]\n",
    ])) as typeof fetch;

  const { thinking, text, callbacks } = collect();
  await streamGroqChatCompletion({
    apiKey: "gsk-test",
    systemInstruction: "",
    prompt: "x",
    fetchImpl,
    ...callbacks,
  });

  assert.deepEqual(thinking, ["Let me think."]);
  assert.deepEqual(text, ["42"]);
});

test("client never leaks a think tag split across SSE chunks", async () => {
  const fetchImpl = (async () =>
    sseResponse([
      sseData({ content: "<thi" }),
      sseData({ content: "nk>reasoning here</thi" }),
      sseData({ content: "nk>final." }),
      "data: [DONE]\n",
    ])) as typeof fetch;

  const { thinking, text, callbacks } = collect();
  await streamGroqChatCompletion({
    apiKey: "gsk-test",
    systemInstruction: "",
    prompt: "x",
    fetchImpl,
    ...callbacks,
  });

  assert.deepEqual(thinking, ["reasoning here"]);
  assert.deepEqual(text, ["final."]);
  assert.ok(!text.join("").includes("<think"));
});

test("client throws GroqError with the status on a non-OK response", async () => {
  const fetchImpl = (async () =>
    new Response("rate limited", { status: 429 })) as typeof fetch;

  const { callbacks } = collect();
  await assert.rejects(
    () =>
      streamGroqChatCompletion({
        apiKey: "gsk-test",
        systemInstruction: "",
        prompt: "x",
        fetchImpl,
        ...callbacks,
      }),
    (error: unknown) => {
      assert.ok(error instanceof GroqError);
      assert.equal((error as GroqError).status, 429);
      return true;
    }
  );
});

test("client skips malformed SSE lines and stops at [DONE]", async () => {
  const fetchImpl = (async () =>
    sseResponse([
      "data: {not json\n",
      sseData({ content: "kept" }),
      "data: [DONE]\n",
      sseData({ content: "dropped" }),
    ])) as typeof fetch;

  const { text, callbacks } = collect();
  await streamGroqChatCompletion({
    apiKey: "gsk-test",
    systemInstruction: "",
    prompt: "x",
    fetchImpl,
    ...callbacks,
  });

  assert.deepEqual(text, ["kept"]);
});
