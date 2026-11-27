import test from "node:test";
import assert from "node:assert/strict";

import {
  SESSION_USAGE_KEY,
  mergeSessionUsage,
  readSessionUsage,
  recordSessionUsage,
  zeroSessionUsage,
  type SessionUsageStore,
} from "./session-usage.ts";
import { buildQuotaMeters } from "./meter.ts";

function memoryStore(): SessionUsageStore & { data: Map<string, string> } {
  const data = new Map<string, string>();
  return {
    data,
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => {
      data.set(key, value);
    },
  };
}

const DAY_ONE = new Date("2026-11-27T10:00:00Z");
const DAY_TWO = new Date("2026-11-28T01:00:00Z");

test("empty store reads as all zeros", () => {
  const store = memoryStore();
  assert.deepEqual(readSessionUsage(store, DAY_ONE), zeroSessionUsage());
});

test("recordSessionUsage counts per scope and persists", () => {
  const store = memoryStore();
  recordSessionUsage("chat", store, DAY_ONE);
  recordSessionUsage("chat", store, DAY_ONE);
  recordSessionUsage("generate", store, DAY_ONE);
  assert.deepEqual(readSessionUsage(store, DAY_ONE), {
    chat: 2,
    build: 0,
    agent: 0,
    generate: 1,
  });
  // Stored under the day, as plain JSON counts — no prompts or IPs.
  const stored = JSON.parse(
    store.data.get(SESSION_USAGE_KEY) as string
  ) as unknown;
  assert.deepEqual(stored, {
    day: "2026-11-27",
    counts: { chat: 2, build: 0, agent: 0, generate: 1 },
  });
});

test("counts reset when the UTC day rolls over", () => {
  const store = memoryStore();
  recordSessionUsage("chat", store, DAY_ONE);
  assert.deepEqual(readSessionUsage(store, DAY_TWO), zeroSessionUsage());
  recordSessionUsage("chat", store, DAY_TWO);
  assert.deepEqual(readSessionUsage(store, DAY_TWO), {
    chat: 1,
    build: 0,
    agent: 0,
    generate: 0,
  });
});

test("corrupt stored JSON reads as zeros, never throws", () => {
  const store = memoryStore();
  store.setItem(SESSION_USAGE_KEY, "{not json");
  assert.deepEqual(readSessionUsage(store, DAY_ONE), zeroSessionUsage());
  // And recording still works afterwards.
  recordSessionUsage("chat", store, DAY_ONE);
  assert.equal(readSessionUsage(store, DAY_ONE).chat, 1);
});

test("null store reads as zeros and records as a no-op", () => {
  assert.deepEqual(readSessionUsage(null, DAY_ONE), zeroSessionUsage());
  recordSessionUsage("chat", null, DAY_ONE);
});

test("mergeSessionUsage takes the higher count per scope, never a sum", () => {
  const server = buildQuotaMeters({ chat: 0, build: 3, agent: 0, generate: 0 });
  const merged = mergeSessionUsage(server, {
    chat: 5,
    build: 1,
    agent: 0,
    generate: 2,
  });
  assert.equal(merged.sessionIncluded, true);
  const byScope = new Map(merged.meters.map((m) => [m.scope, m.used]));
  assert.equal(byScope.get("chat"), 5);
  assert.equal(byScope.get("build"), 3);
  assert.equal(byScope.get("agent"), 0);
  assert.equal(byScope.get("generate"), 2);
});

test("mergeSessionUsage reports false when the session adds nothing", () => {
  const server = buildQuotaMeters({ chat: 4, build: 0, agent: 0, generate: 0 });
  const merged = mergeSessionUsage(server, zeroSessionUsage());
  assert.equal(merged.sessionIncluded, false);
  assert.equal(merged.meters[0]?.used, 4);
});
