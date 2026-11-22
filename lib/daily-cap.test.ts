import test from "node:test";
import assert from "node:assert/strict";

import {
  consumeDaily,
  dailyRemaining,
  enforceDailyCap,
  utcDay,
} from "./daily-cap.ts";

function requestWith(headers: Record<string, string>): Request {
  return new Request("http://localhost/api/image", { headers });
}

test("utcDay is the UTC calendar date", () => {
  assert.equal(utcDay(Date.parse("2026-11-22T23:30:00Z")), "2026-11-22");
  assert.equal(utcDay(Date.parse("2026-11-23T00:30:00Z")), "2026-11-23");
});

test("daily cap allows up to the limit, then rejects", () => {
  const key = "cap1";
  const t = Date.parse("2026-11-22T10:00:00Z");

  assert.deepEqual(consumeDaily(key, 2, t), {
    ok: true,
    remaining: 1,
    resetsAt: "2026-11-22T23:59:59.999Z",
  });
  assert.deepEqual(consumeDaily(key, 2, t + 1000), {
    ok: true,
    remaining: 0,
    resetsAt: "2026-11-22T23:59:59.999Z",
  });
  assert.deepEqual(consumeDaily(key, 2, t + 2000), {
    ok: false,
    remaining: 0,
    resetsAt: "2026-11-22T23:59:59.999Z",
  });
});

test("daily cap refills on the next UTC day", () => {
  const key = "cap2";
  const day1 = Date.parse("2026-11-22T23:59:00Z");
  const day2 = Date.parse("2026-11-23T00:01:00Z");

  assert.equal(consumeDaily(key, 1, day1).ok, true);
  assert.equal(consumeDaily(key, 1, day1 + 1000).ok, false);
  assert.equal(consumeDaily(key, 1, day2).ok, true);
});

test("different keys have independent daily buckets", () => {
  const t = Date.parse("2026-11-22T10:00:00Z");
  assert.equal(consumeDaily("cap3-a", 1, t).ok, true);
  assert.equal(consumeDaily("cap3-b", 1, t).ok, true);
  assert.equal(dailyRemaining("cap3-a", 1, t), 0);
  assert.equal(dailyRemaining("cap3-b", 1, t), 0);
  assert.equal(dailyRemaining("cap3-c", 1, t), 1);
});

test("enforceDailyCap returns null until the cap, then a 429", async () => {
  const request = requestWith({ "x-forwarded-for": "9.9.9.9" });
  const t = Date.parse("2026-11-22T10:00:00Z");

  assert.equal(
    await enforceDailyCap(request, "test-cap-scope", 1, { nowMs: t }),
    null
  );

  const limited = await enforceDailyCap(request, "test-cap-scope", 1, {
    nowMs: t + 1000,
  });
  assert.ok(limited);
  assert.equal(limited.status, 429);
  const body = (await limited.json()) as { error: string };
  assert.match(body.error, /Daily limit reached/);
});
