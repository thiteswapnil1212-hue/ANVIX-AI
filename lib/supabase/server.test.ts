import test from "node:test";
import assert from "node:assert/strict";

import { createServiceClient } from "./server.ts";

test("missing url or service key returns null", () => {
  assert.equal(createServiceClient(undefined, undefined), null);
  assert.equal(
    createServiceClient("https://example.supabase.co", undefined),
    null
  );
  assert.equal(createServiceClient(undefined, "dummy-service-key"), null);
  assert.equal(createServiceClient("", ""), null);
});

test("malformed url returns null instead of throwing", () => {
  assert.equal(createServiceClient("not a url", "dummy-service-key"), null);
});

test("well-formed url and key return a usable client", () => {
  const client = createServiceClient(
    "https://example.supabase.co",
    "dummy-service-key"
  );
  assert.notEqual(client, null);
  assert.equal(typeof client?.from, "function");
});
