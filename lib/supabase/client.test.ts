import test from "node:test";
import assert from "node:assert/strict";

import { createBrowserClient } from "./client.ts";

test("missing url or key returns null (guest mode)", () => {
  assert.equal(createBrowserClient(undefined, undefined), null);
  assert.equal(
    createBrowserClient("https://example.supabase.co", undefined),
    null
  );
  assert.equal(createBrowserClient(undefined, "dummy-anon-key"), null);
  assert.equal(createBrowserClient("", ""), null);
});

test("malformed url returns null instead of throwing", () => {
  assert.equal(createBrowserClient("not a url", "dummy-anon-key"), null);
});

test("well-formed url and key return a usable client", () => {
  const client = createBrowserClient(
    "https://example.supabase.co",
    "dummy-anon-key"
  );
  assert.notEqual(client, null);
  assert.equal(typeof client?.auth.getSession, "function");
  assert.equal(typeof client?.auth.signOut, "function");
});
