import test from "node:test";
import assert from "node:assert/strict";

import { encryptApiKey } from "./crypto.ts";
import {
  fetchStoredByokKey,
  isValidGeminiKeyFormat,
  resolveApiKeySource,
  resolveCallerApiKey,
  verifyGeminiKey,
} from "./key-resolution.ts";

const SECRET = "test-secret-that-is-long-enough-0123456789";
const OWN_KEY = "AIzaSyOwnKeyForUnitTestsOnly1234567890ab";
const SHARED_KEY = "AIzaSySharedServerKeyForTests0123456789";
const ENCRYPTED_OWN = encryptApiKey(OWN_KEY, SECRET);

function requestWithAuth(token?: string): Request {
  return new Request("http://localhost/api/chat", {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
}

test("resolveApiKeySource prefers the stored key when asked for it", () => {
  assert.deepEqual(
    resolveApiKeySource({
      useOwnKey: true,
      encryptedKey: ENCRYPTED_OWN,
      sharedKey: SHARED_KEY,
      secret: SECRET,
    }),
    { key: OWN_KEY, source: "byok", userId: null }
  );
});

test("resolveApiKeySource falls back to shared when not asked, absent, or undecryptable", () => {
  const base = {
    encryptedKey: ENCRYPTED_OWN,
    sharedKey: SHARED_KEY,
    secret: SECRET,
  };
  // Flag off: stored key is ignored.
  assert.equal(
    resolveApiKeySource({ ...base, useOwnKey: false }).source,
    "shared"
  );
  // No stored key.
  assert.equal(
    resolveApiKeySource({ ...base, useOwnKey: true, encryptedKey: null })
      .source,
    "shared"
  );
  // Stored key undecryptable (secret rotated): shared, not an error.
  assert.deepEqual(
    resolveApiKeySource({
      ...base,
      useOwnKey: true,
      secret: "a-different-long-enough-secret-1",
    }),
    { key: SHARED_KEY, source: "shared", userId: null }
  );
  // BYOK configured but no encryption secret at all: shared.
  assert.equal(
    resolveApiKeySource({ ...base, useOwnKey: true, secret: null }).source,
    "shared"
  );
});

test("resolveApiKeySource reports none when neither key exists", () => {
  assert.deepEqual(
    resolveApiKeySource({
      useOwnKey: false,
      encryptedKey: null,
      sharedKey: undefined,
      secret: SECRET,
    }),
    { key: null, source: "none", userId: null }
  );
});

test("resolveCallerApiKey uses the caller's key only for a verified user who asked", async () => {
  const resolved = await resolveCallerApiKey(requestWithAuth("tok-1"), {
    useOwnKey: true,
    sharedKey: SHARED_KEY,
    secret: SECRET,
    verifyToken: async (token) => (token === "tok-1" ? "user-1" : null),
    fetchStoredKey: async (userId) =>
      userId === "user-1"
        ? { encryptedKey: ENCRYPTED_OWN, keyLast4: "90ab", verifiedAt: null }
        : null,
  });
  assert.deepEqual(resolved, {
    key: OWN_KEY,
    source: "byok",
    userId: "user-1",
  });
});

test("resolveCallerApiKey falls back to shared for guests and for users without a key", async () => {
  const deps = {
    sharedKey: SHARED_KEY,
    secret: SECRET,
    verifyToken: async () => null,
    fetchStoredKey: async () => null,
  };

  // Guest (no token at all): shared, no fetch attempted.
  const guest = await resolveCallerApiKey(requestWithAuth(), {
    ...deps,
    useOwnKey: true,
  });
  assert.deepEqual(guest, {
    key: SHARED_KEY,
    source: "shared",
    userId: null,
  });

  // Signed-in user with no stored key: shared.
  const noKey = await resolveCallerApiKey(requestWithAuth("tok-2"), {
    ...deps,
    useOwnKey: true,
    verifyToken: async () => "user-2",
  });
  assert.deepEqual(noKey, {
    key: SHARED_KEY,
    source: "shared",
    userId: "user-2",
  });
});

test("fetchStoredByokKey returns null when the table/client is missing or errors", async () => {
  // No client (Supabase unconfigured).
  assert.equal(await fetchStoredByokKey("u1", "tok", () => null), null);

  // Query throws (e.g. table not created yet): null, not a throw.
  const throwingClient = {
    from: () => {
      throw new Error("relation does not exist");
    },
  };
  assert.equal(
    await fetchStoredByokKey(
      "u1",
      "tok",
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      () => throwingClient as any
    ),
    null
  );

  // Query returns an error row: null.
  const errorClient = {
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => ({
            data: null,
            error: { code: "PGRST205", message: "table not found" },
          }),
        }),
      }),
    }),
  };
  assert.equal(
    await fetchStoredByokKey(
      "u1",
      "tok",
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      () => errorClient as any
    ),
    null
  );
});

test("fetchStoredByokKey returns the row when present", async () => {
  const okClient = {
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => ({
            data: {
              encrypted_key: ENCRYPTED_OWN,
              key_last4: "90ab",
              verified_at: "2026-11-22T00:00:00Z",
            },
            error: null,
          }),
        }),
      }),
    }),
  };
  assert.deepEqual(
    await fetchStoredByokKey(
      "u1",
      "tok",
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      () => okClient as any
    ),
    {
      encryptedKey: ENCRYPTED_OWN,
      keyLast4: "90ab",
      verifiedAt: "2026-11-22T00:00:00Z",
    }
  );
});

test("isValidGeminiKeyFormat accepts AIza keys and rejects the rest", () => {
  assert.equal(isValidGeminiKeyFormat(OWN_KEY), true);
  assert.equal(isValidGeminiKeyFormat("AIzaShort"), false);
  assert.equal(isValidGeminiKeyFormat("sk-not-a-gemini-key-1234567890"), false);
  assert.equal(isValidGeminiKeyFormat(""), false);
});

test("verifyGeminiKey accepts a 200, rejects a 400, and survives a network failure", async () => {
  const okFetch = (async () => new Response("{}", { status: 200 })) as typeof fetch;
  assert.deepEqual(await verifyGeminiKey(OWN_KEY, okFetch), { valid: true });

  const badFetch = (async () =>
    new Response("{}", { status: 400 })) as typeof fetch;
  const bad = await verifyGeminiKey(OWN_KEY, badFetch);
  assert.equal(bad.valid, false);
  assert.match(bad.error ?? "", /rejected this key/);

  const downFetch = (async () => {
    throw new Error("network down");
  }) as typeof fetch;
  const down = await verifyGeminiKey(OWN_KEY, downFetch);
  assert.equal(down.valid, false);
  assert.match(down.error ?? "", /Could not reach Google/);

  // Bad format never hits the network.
  let called = false;
  const countingFetch = (async () => {
    called = true;
    return new Response("{}", { status: 200 });
  }) as typeof fetch;
  assert.equal((await verifyGeminiKey("nope", countingFetch)).valid, false);
  assert.equal(called, false);
});
