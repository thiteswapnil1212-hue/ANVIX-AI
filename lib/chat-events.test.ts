import test from "node:test";
import assert from "node:assert/strict";

import {
  encodeChatEvent,
  parseChatEventLine,
  parseChatEvents,
} from "./chat-events.ts";

test("encodeChatEvent writes one JSON object per line", () => {
  assert.equal(
    encodeChatEvent({ t: "text", text: "hi" }),
    '{"t":"text","text":"hi"}\n'
  );
  assert.equal(encodeChatEvent({ t: "done" }), '{"t":"done"}\n');
});

test("parseChatEventLine accepts every event type", () => {
  assert.deepEqual(parseChatEventLine('{"t":"thinking","text":"hmm"}'), {
    t: "thinking",
    text: "hmm",
  });
  assert.deepEqual(parseChatEventLine('{"t":"text","text":"hi"}'), {
    t: "text",
    text: "hi",
  });
  assert.deepEqual(
    parseChatEventLine(
      '{"t":"sources","sources":[{"title":"A","uri":"https://example.com"}]}'
    ),
    {
      t: "sources",
      sources: [{ title: "A", uri: "https://example.com" }],
    }
  );
  assert.deepEqual(parseChatEventLine('{"t":"error","message":"boom"}'), {
    t: "error",
    message: "boom",
  });
  assert.deepEqual(parseChatEventLine('{"t":"done"}'), { t: "done" });
});

test("parseChatEventLine rejects blank, malformed and unknown lines", () => {
  assert.equal(parseChatEventLine(""), null);
  assert.equal(parseChatEventLine("   "), null);
  assert.equal(parseChatEventLine("not json"), null);
  assert.equal(parseChatEventLine('{"t":"nope"}'), null);
  assert.equal(parseChatEventLine('{"t":"text"}'), null);
  assert.equal(parseChatEventLine('{"text":"hi"}'), null);
  // Plain-text chunks (the old protocol) are not events.
  assert.equal(parseChatEventLine("Hello, this is plain text."), null);
});

test("parseChatEvents keeps the incomplete tail as remainder", () => {
  const first = parseChatEvents(
    '{"t":"thinking","text":"a"}\n{"t":"text","text":"b"}\n{"t":"tex'
  );

  assert.deepEqual(first.events, [
    { t: "thinking", text: "a" },
    { t: "text", text: "b" },
  ]);
  assert.equal(first.remainder, '{"t":"tex');

  const second = parseChatEvents(`${first.remainder}t","text":"c"}\n`);
  assert.deepEqual(second.events, [{ t: "text", text: "c" }]);
  assert.equal(second.remainder, "");
});

test("parseChatEvents skips malformed lines without losing the rest", () => {
  const parsed = parseChatEvents(
    '{"t":"text","text":"ok"}\n{broken\n{"t":"done"}\n'
  );

  assert.deepEqual(parsed.events, [
    { t: "text", text: "ok" },
    { t: "done" },
  ]);
  assert.equal(parsed.remainder, "");
});
