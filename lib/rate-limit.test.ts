import test from "node:test";
import assert from "node:assert/strict";

import {
  callerRateLimitKey,
  countRecentRequests,
  enforceRateLimit,
  getClientIp,
  rateLimit,
  resolveRateLimitKey,
} from "./rate-limit.ts";

function requestWith(headers: Record<string, string>): Request {
  return new Request("http://localhost/api/chat", { headers });
}

test("sliding window allows requests up to the limit, then rejects with retry-after", () => {
  const key = "t1:ip:1.2.3.4";

  assert.deepEqual(rateLimit(key, 3, 60_000, 0), {
    ok: true,
    retryAfterSeconds: 0,
  });
  assert.deepEqual(rateLimit(key, 3, 60_000, 1_000), {
    ok: true,
    retryAfterSeconds: 0,
  });
  assert.deepEqual(rateLimit(key, 3, 60_000, 2_000), {
    ok: true,
    retryAfterSeconds: 0,
  });

  // Fourth request inside the window: rejected. The oldest request was
  // at t=0, so the wait is the rest of its 60s window.
  assert.deepEqual(rateLimit(key, 3, 60_000, 3_000), {
    ok: false,
    retryAfterSeconds: 57,
  });
});

test("sliding window refills gradually as old requests fall out", () => {
  const key = "t2:ip:1.2.3.4";

  assert.equal(rateLimit(key, 2, 60_000, 0).ok, true);
  assert.equal(rateLimit(key, 2, 60_000, 1_000).ok, true);
  assert.equal(rateLimit(key, 2, 60_000, 2_000).ok, false);

  // At t=61s the t=0 request has fallen out of the window.
  assert.equal(rateLimit(key, 2, 60_000, 61_000).ok, true);
  // The t=1s request has fallen out too, so a second request fits...
  assert.equal(rateLimit(key, 2, 60_000, 61_500).ok, true);
  // ...but a third inside the same window does not.
  assert.equal(rateLimit(key, 2, 60_000, 62_000).ok, false);
});

test("different keys have independent buckets", () => {
  assert.equal(rateLimit("t3:ip:1.1.1.1", 1, 60_000, 0).ok, true);
  assert.equal(rateLimit("t3:ip:1.1.1.1", 1, 60_000, 0).ok, false);
  assert.equal(rateLimit("t3:ip:2.2.2.2", 1, 60_000, 0).ok, true);
  assert.equal(rateLimit("t3:user:abc", 1, 60_000, 0).ok, true);
});

test("getClientIp prefers the first x-forwarded-for entry, then x-real-ip", () => {
  assert.equal(
    getClientIp(
      requestWith({ "x-forwarded-for": "203.0.113.1, 198.51.100.2" })
    ),
    "203.0.113.1"
  );
  assert.equal(
    getClientIp(requestWith({ "x-real-ip": "198.51.100.9" })),
    "198.51.100.9"
  );
  assert.equal(getClientIp(requestWith({})), "unknown");
});

test("resolveRateLimitKey keys a signed-in user by id", async () => {
  const key = await resolveRateLimitKey(
    requestWith({
      authorization: "Bearer valid-token",
      "x-forwarded-for": "203.0.113.1",
    }),
    "chat",
    { verifyToken: async () => "user-123" }
  );
  assert.equal(key, "chat:user:user-123");
});

test("resolveRateLimitKey falls back to IP when the token does not verify", async () => {
  const key = await resolveRateLimitKey(
    requestWith({
      authorization: "Bearer expired-token",
      "x-forwarded-for": "203.0.113.1",
    }),
    "chat",
    { verifyToken: async () => null }
  );
  assert.equal(key, "chat:ip:203.0.113.1");
});

test("resolveRateLimitKey falls back to IP for guests with no token", async () => {
  const key = await resolveRateLimitKey(
    requestWith({ "x-forwarded-for": "203.0.113.1" }),
    "chat"
  );
  assert.equal(key, "chat:ip:203.0.113.1");
});

test("enforceRateLimit returns null under the limit and JSON 429 with Retry-After over it", async () => {
  const scope = "t8";
  const guest = () =>
    requestWith({ "x-forwarded-for": "203.0.113.7" });

  assert.equal(
    await enforceRateLimit(guest(), scope, 1, 1_000),
    null
  );

  const limited = await enforceRateLimit(guest(), scope, 1, 1_000);
  assert.ok(limited, "second request must be limited");
  assert.equal(limited?.status, 429);
  assert.equal(limited?.headers.get("Retry-After"), "1");
  assert.equal(
    limited?.headers.get("Content-Type"),
    "application/json"
  );

  const body = (await limited?.json()) as {
    error: string;
    retryAfterSeconds: number;
  };
  assert.match(body.error, /Too many requests/);
  assert.equal(body.retryAfterSeconds, 1);
});

test("enforceRateLimit keys by user id across IPs when the token verifies", async () => {
  const scope = "t9";
  const options = { verifyToken: async () => "user-999" };

  const fromHome = () =>
    requestWith({
      authorization: "Bearer valid-token",
      "x-forwarded-for": "203.0.113.1",
    });
  const fromCollege = () =>
    requestWith({
      authorization: "Bearer valid-token",
      "x-forwarded-for": "198.51.100.5",
    });

  assert.equal(
    await enforceRateLimit(fromHome(), scope, 1, 60_000, options),
    null
  );

  // Same user, different IP: still the same bucket, so still limited.
  const limited = await enforceRateLimit(
    fromCollege(),
    scope,
    1,
    60_000,
    options
  );
  assert.ok(limited, "same user from another IP must share one bucket");
  assert.equal(limited?.status, 429);
});

test("callerRateLimitKey builds user and IP keys in one place", () => {
  assert.equal(callerRateLimitKey("chat", "user-1", "1.2.3.4"), "chat:user:user-1");
  assert.equal(callerRateLimitKey("chat", null, "1.2.3.4"), "chat:ip:1.2.3.4");
});

test("countRecentRequests reads the limiter windows for the quota meter", () => {
  const key = "meter-test:user:u9";
  rateLimit(key, 100, 86_400_000, 1_000);
  rateLimit(key, 100, 86_400_000, 2_000);
  rateLimit("meter-test:user:other", 100, 86_400_000, 3_000);

  // Both of u9's requests are inside a 24h window from t=5_000.
  assert.equal(countRecentRequests(key, 86_400_000, 5_000), 2);
  // A 1s window from t=5_000 sees neither.
  assert.equal(countRecentRequests(key, 1_000, 5_000), 0);
  // A scope prefix counts every caller in that scope.
  assert.equal(countRecentRequests("meter-test:", 86_400_000, 5_000), 3);
});
