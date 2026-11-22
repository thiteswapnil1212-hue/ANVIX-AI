import test from "node:test";
import assert from "node:assert/strict";
import {
  buildGoogleAuthUrl,
  exchangeAuthCode,
  getGoogleOAuthConfig,
  refreshAccessToken,
  signOAuthState,
  verifyOAuthState,
  GOOGLE_CALENDAR_SCOPES,
  type GoogleOAuthConfig,
} from "./oauth.ts";

const KEY = Buffer.from("c".repeat(32), "utf8");
const CONFIG: GoogleOAuthConfig = {
  clientId: "test-client-id.apps.googleusercontent.com",
  clientSecret: "test-secret",
};

test("calendar scopes are sensitive only — no Gmail scope is requested", () => {
  assert.deepEqual([...GOOGLE_CALENDAR_SCOPES], [
    "https://www.googleapis.com/auth/calendar.readonly",
    "https://www.googleapis.com/auth/calendar.events",
  ]);
  for (const scope of GOOGLE_CALENDAR_SCOPES) {
    assert.ok(!scope.includes("gmail"), scope);
    assert.ok(!scope.includes("drive"), scope);
  }
});

test("getGoogleOAuthConfig returns null without env vars", () => {
  const id = process.env.GOOGLE_OAUTH_CLIENT_ID;
  const secret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;
  delete process.env.GOOGLE_OAUTH_CLIENT_ID;
  delete process.env.GOOGLE_OAUTH_CLIENT_SECRET;
  try {
    assert.equal(getGoogleOAuthConfig(), null);
  } finally {
    if (id !== undefined) process.env.GOOGLE_OAUTH_CLIENT_ID = id;
    if (secret !== undefined)
      process.env.GOOGLE_OAUTH_CLIENT_SECRET = secret;
  }
});

test("buildGoogleAuthUrl requests offline access + consent (refresh token)", () => {
  const url = new URL(
    buildGoogleAuthUrl(CONFIG, "https://example.com/callback", "state-123")
  );
  assert.equal(url.hostname, "accounts.google.com");
  assert.equal(url.searchParams.get("client_id"), CONFIG.clientId);
  assert.equal(url.searchParams.get("response_type"), "code");
  assert.equal(url.searchParams.get("access_type"), "offline");
  assert.equal(url.searchParams.get("prompt"), "consent");
  assert.equal(url.searchParams.get("state"), "state-123");
  assert.ok(
    url.searchParams.get("scope")?.includes("calendar.readonly")
  );
  // The client secret must never appear in the browser-facing URL.
  assert.ok(!url.toString().includes(CONFIG.clientSecret));
});

test("sign/verify OAuth state round-trips and rejects tampering + expiry", () => {
  const now = 1_700_000_000_000;
  const state = signOAuthState("user-42", KEY, now);
  assert.equal(verifyOAuthState(state, KEY, now + 60_000), "user-42");
  assert.equal(verifyOAuthState(state, KEY, now + 11 * 60_1000), null);
  assert.equal(verifyOAuthState(state + "x", KEY, now), null);
  assert.equal(verifyOAuthState("garbage", KEY, now), null);
  assert.equal(verifyOAuthState(state, null, now), null);
  // A different key must not verify.
  const other = Buffer.from("d".repeat(32), "utf8");
  assert.equal(verifyOAuthState(state, other, now), null);
});

function fakeTokenFetch(body: Record<string, unknown>, ok = true) {
  return (async () => {
    return new Response(JSON.stringify(body), {
      status: ok ? 200 : 400,
      headers: { "Content-Type": "application/json" },
    });
  }) as unknown as typeof fetch;
}

test("exchangeAuthCode parses tokens and handles errors", async () => {
  const now = 1_700_000_000_000;
  const tokens = await exchangeAuthCode(
    CONFIG,
    "auth-code",
    "https://example.com/callback",
    fakeTokenFetch({
      access_token: "ya29.access",
      refresh_token: "1//refresh",
      expires_in: 3600,
      scope: "calendar",
    }),
    now
  );
  assert.equal(tokens?.accessToken, "ya29.access");
  assert.equal(tokens?.refreshToken, "1//refresh");
  assert.equal(tokens?.expiresAt, now + 3_600_000);

  const failed = await exchangeAuthCode(
    CONFIG,
    "bad-code",
    "https://example.com/callback",
    fakeTokenFetch({ error: "invalid_grant" }, false),
    now
  );
  assert.equal(failed, null);
});

test("refreshAccessToken keeps the old refresh token", async () => {
  const now = 1_700_000_000_000;
  const tokens = await refreshAccessToken(
    CONFIG,
    "1//old-refresh",
    fakeTokenFetch({ access_token: "ya29.new", expires_in: 1800 }),
    now
  );
  assert.equal(tokens?.accessToken, "ya29.new");
  assert.equal(tokens?.refreshToken, "1//old-refresh");
  assert.equal(tokens?.expiresAt, now + 1_800_000);
});
