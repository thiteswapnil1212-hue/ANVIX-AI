import test from "node:test";
import assert from "node:assert/strict";

import {
  aggregateTodayUsage,
  buildQuotaMeter,
  buildQuotaMeters,
  callerIdentity,
  flushUsageBuckets,
  getStagingSnapshot,
  hourStartIso,
  recordUsage,
  resetUsageStaging,
  unflushedTodayCounts,
  utcDayIso,
} from "./meter.ts";

test("hourStartIso truncates to the UTC hour and utcDayIso to the day", () => {
  const d = new Date("2026-11-22T14:37:22.123Z");
  assert.equal(hourStartIso(d), "2026-11-22T14:00:00.000Z");
  assert.equal(utcDayIso(d), "2026-11-22");
});

test("callerIdentity strips the scope off a rate-limit key", () => {
  assert.equal(callerIdentity("chat:user:abc-123"), "user:abc-123");
  assert.equal(callerIdentity("build:ip:1.2.3.4"), "ip:1.2.3.4");
});

test("recordUsage buckets per caller, scope and hour", () => {
  resetUsageStaging();
  const t1 = new Date("2026-11-22T14:10:00Z");
  const t2 = new Date("2026-11-22T15:05:00Z");

  recordUsage("chat", "user:u1", t1);
  recordUsage("chat", "user:u1", t1);
  recordUsage("chat", "user:u1", t2);
  recordUsage("build", "user:u1", t1);
  recordUsage("chat", "user:u2", t1);

  assert.equal(getStagingSnapshot().length, 4);
  assert.deepEqual(unflushedTodayCounts("user:u1", "2026-11-22"), {
    chat: 3,
    build: 1,
    agent: 0,
    generate: 0,
  });
  assert.deepEqual(unflushedTodayCounts("user:u2", "2026-11-22"), {
    chat: 1,
    build: 0,
    agent: 0,
    generate: 0,
  });
  // Another day sees nothing.
  assert.deepEqual(unflushedTodayCounts("user:u1", "2026-11-21"), {
    chat: 0,
    build: 0,
    agent: 0,
    generate: 0,
  });
  resetUsageStaging();
});

test("aggregateTodayUsage merges DB rows with unflushed staging, ignoring other days and scopes", () => {
  resetUsageStaging();
  recordUsage("chat", "user:u1", new Date("2026-11-22T14:10:00Z"));

  const rows = [
    { scope: "chat", hour_start: "2026-11-22T09:00:00.000Z", request_count: 40 },
    { scope: "chat", hour_start: "2026-11-22T10:00:00.000Z", request_count: 5 },
    // Yesterday: ignored.
    { scope: "chat", hour_start: "2026-11-21T10:00:00.000Z", request_count: 999 },
    // Unknown scope: ignored.
    { scope: "tts", hour_start: "2026-11-22T10:00:00.000Z", request_count: 7 },
    { scope: "build", hour_start: "2026-11-22T11:00:00.000Z", request_count: 3 },
  ];

  assert.deepEqual(aggregateTodayUsage(rows, "user:u1", "2026-11-22"), {
    // 40 + 5 from the DB, + 1 unflushed staging count.
    chat: 46,
    build: 3,
    agent: 0,
    generate: 0,
  });
  resetUsageStaging();
});

test("buildQuotaMeter computes remaining, percent and over-limit", () => {
  assert.deepEqual(buildQuotaMeter("chat", 25), {
    scope: "chat",
    used: 25,
    limit: 100,
    remaining: 75,
    percentUsed: 25,
    overLimit: false,
  });
  assert.deepEqual(buildQuotaMeter("build", 10), {
    scope: "build",
    used: 10,
    limit: 10,
    remaining: 0,
    percentUsed: 100,
    overLimit: true,
  });
  // Over the limit: percent caps at 100, remaining at 0.
  const over = buildQuotaMeter("agent", 30);
  assert.equal(over.percentUsed, 100);
  assert.equal(over.remaining, 0);
  assert.equal(over.overLimit, true);

  assert.equal(buildQuotaMeters({ chat: 1, build: 0, agent: 0, generate: 0 }).length, 4);
});

test("flushUsageBuckets writes each dirty bucket once, then skips (throttled)", async () => {
  resetUsageStaging();
  recordUsage("chat", "user:u1", new Date("2026-11-22T14:10:00Z"));
  recordUsage("chat", "user:u1", new Date("2026-11-22T14:20:00Z"));
  recordUsage("build", "user:u1", new Date("2026-11-22T14:10:00Z"));

  const written: Array<{ scope: string; count: number }> = [];
  const flushOne = async (row: { scope: string; count: number }) => {
    written.push({ scope: row.scope, count: row.count });
    return true;
  };

  const first = await flushUsageBuckets(flushOne, 1_000_000);
  assert.equal(first.flushedBuckets, 2);
  assert.deepEqual(written, [
    { scope: "chat", count: 2 },
    { scope: "build", count: 1 },
  ]);

  // Second flush inside the 60s window: skipped, nothing rewritten.
  const second = await flushUsageBuckets(flushOne, 1_000_000 + 10_000);
  assert.equal(second.skipped, true);
  assert.equal(written.length, 2);

  // After the window, a flush finds nothing dirty.
  const third = await flushUsageBuckets(flushOne, 1_000_000 + 61_000);
  assert.equal(third.flushedBuckets, 0);
  assert.equal(written.length, 2);
  resetUsageStaging();
});

test("flushUsageBuckets backs off for 10 minutes after a failed bucket", async () => {
  resetUsageStaging();
  recordUsage("chat", "user:u1", new Date("2026-11-22T14:10:00Z"));

  const failing = async () => false;
  const first = await flushUsageBuckets(failing, 2_000_000);
  assert.equal(first.flushedBuckets, 0);

  // Inside the backoff: skipped without calling the sink again.
  let calls = 0;
  const counting = async () => {
    calls += 1;
    return true;
  };
  const second = await flushUsageBuckets(counting, 2_000_000 + 60_000);
  assert.equal(second.skipped, true);
  assert.equal(calls, 0);

  // After the backoff: the bucket flushes.
  const third = await flushUsageBuckets(counting, 2_000_000 + 10 * 60_000 + 1);
  assert.equal(third.flushedBuckets, 1);
  assert.equal(calls, 1);
  resetUsageStaging();
});

test("flushUsageBuckets never throws when the sink throws", async () => {
  resetUsageStaging();
  recordUsage("chat", "user:u1", new Date("2026-11-22T14:10:00Z"));
  const throwing = async () => {
    throw new Error("DB down");
  };
  const result = await flushUsageBuckets(throwing, 3_000_000);
  assert.equal(result.flushedBuckets, 0);
  resetUsageStaging();
});
