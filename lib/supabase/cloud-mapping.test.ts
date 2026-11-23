import test from "node:test";
import assert from "node:assert/strict";

import {
  MAX_CLOUD_MESSAGE_SOURCES,
  isMissingColumnError,
  mapMessageRow,
  mapProfileRow,
  toMessageInsertRow,
  type MessageRow,
} from "./cloud-mapping.ts";

const BASE_ROW: MessageRow = {
  id: "m1",
  conversation_id: "c1",
  role: "assistant",
  content: "Hello",
  created_at: "2026-11-22T00:00:00Z",
};

test("mapMessageRow keeps a legacy row (no new columns) intact", () => {
  assert.deepEqual(mapMessageRow(BASE_ROW), {
    id: "m1",
    role: "assistant",
    content: "Hello",
    createdAt: "2026-11-22T00:00:00Z",
  });
});

test("mapMessageRow maps thinking, sources, attachments, mode", () => {
  assert.deepEqual(
    mapMessageRow({
      ...BASE_ROW,
      thinking: "Let me think…",
      sources: [
        { title: "Example", uri: "https://example.com" },
        { title: "No uri" },
        "not an object",
      ],
      attachments: [
        { name: "notes.pdf", mimeType: "application/pdf" },
        { name: "no-type" },
      ],
      mode: "smart",
    }),
    {
      id: "m1",
      role: "assistant",
      content: "Hello",
      createdAt: "2026-11-22T00:00:00Z",
      thinking: "Let me think…",
      sources: [{ title: "Example", uri: "https://example.com" }],
      attachments: [{ name: "notes.pdf", mimeType: "application/pdf" }],
      mode: "smart",
    }
  );
});

test("mapMessageRow caps sources at 20 and drops non-array sources", () => {
  const many = Array.from({ length: 25 }, (_, i) => ({
    title: `S${i}`,
    uri: `https://example.com/${i}`,
  }));
  const mapped = mapMessageRow({ ...BASE_ROW, sources: many });
  assert.equal(mapped.sources?.length, MAX_CLOUD_MESSAGE_SOURCES);
  assert.equal(mapMessageRow({ ...BASE_ROW, sources: "nope" }).sources, undefined);
  assert.equal(
    mapMessageRow({ ...BASE_ROW, attachments: { name: "x" } }).attachments,
    undefined
  );
});

test("toMessageInsertRow omits absent fields so DB defaults apply", () => {
  assert.deepEqual(
    toMessageInsertRow(
      { id: "m1", role: "user", content: "hi", createdAt: "2026-11-22T00:00:00Z" },
      "c1",
      "u1"
    ),
    {
      id: "m1",
      conversation_id: "c1",
      user_id: "u1",
      role: "user",
      content: "hi",
      created_at: "2026-11-22T00:00:00Z",
    }
  );
  const withExtras = toMessageInsertRow(
    {
      id: "m2",
      role: "assistant",
      content: "hi",
      createdAt: "2026-11-22T00:00:00Z",
      thinking: "t",
      sources: [{ title: "E", uri: "https://example.com" }],
      mode: "deep",
    },
    "c1",
    "u1"
  );
  assert.equal(withExtras.thinking, "t");
  assert.equal(withExtras.mode, "deep");
  assert.deepEqual(withExtras.sources, [
    { title: "E", uri: "https://example.com" },
  ]);
});

test("mapProfileRow maps new profile fields and tolerates legacy rows", () => {
  assert.deepEqual(mapProfileRow({ email: "a@b.c", display_name: "A" }), {
    email: "a@b.c",
    displayName: "A",
  });
  assert.deepEqual(
    mapProfileRow({
      email: "a@b.c",
      display_name: "A",
      custom_instructions: "Be concise.",
      default_chat_mode: "deep",
      default_thinking: "fast",
    }),
    {
      email: "a@b.c",
      displayName: "A",
      customInstructions: "Be concise.",
      defaultChatMode: "deep",
      defaultThinking: "fast",
    }
  );
});

test("isMissingColumnError matches PGRST204 and column messages only", () => {
  assert.equal(isMissingColumnError({ code: "PGRST204" }), true);
  assert.equal(
    isMissingColumnError({
      message: 'column "thinking" does not exist',
    }),
    true
  );
  assert.equal(isMissingColumnError({ code: "42501" }), false);
  assert.equal(isMissingColumnError(new Error("network down")), false);
  assert.equal(isMissingColumnError(null), false);
});
