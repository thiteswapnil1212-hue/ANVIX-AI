import test from "node:test";
import assert from "node:assert/strict";

import {
  parsePushPayload,
  parsePushSubscription,
} from "./web-push.ts";

test("parsePushPayload accepts a valid payload and defaults the tag", () => {
  const result = parsePushPayload({
    title: "Build ready",
    body: "Your app finished generating.",
    url: "/workspace/123",
  });
  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.payload.title, "Build ready");
    assert.equal(result.payload.tag, "anvix-default");
  }
});

test("parsePushPayload rejects an external url (push phishing guard)", () => {
  const result = parsePushPayload({
    title: "Hi",
    body: "Click me",
    url: "https://evil.example.com",
  });
  assert.equal(result.ok, false);
});

test("parsePushPayload rejects empty title/body and overlong fields", () => {
  assert.equal(
    parsePushPayload({ title: " ", body: "x", url: "/dashboard" }).ok,
    false
  );
  assert.equal(
    parsePushPayload({ title: "x", body: " ", url: "/dashboard" }).ok,
    false
  );
  assert.equal(
    parsePushPayload({
      title: "x".repeat(121),
      body: "y",
      url: "/dashboard",
    }).ok,
    false
  );
  assert.equal(
    parsePushPayload({
      title: "x",
      body: "y".repeat(501),
      url: "/dashboard",
    }).ok,
    false
  );
});

test("parsePushSubscription accepts a well-formed subscription", () => {
  const result = parsePushSubscription({
    endpoint: "https://fcm.googleapis.com/fcm/send/abc",
    keys: { p256dh: "key1", auth: "key2" },
  });
  assert.equal(result.ok, true);
});

test("parsePushSubscription rejects http endpoints and missing keys", () => {
  assert.equal(
    parsePushSubscription({
      endpoint: "http://push.example.com/x",
      keys: { p256dh: "a", auth: "b" },
    }).ok,
    false
  );
  assert.equal(
    parsePushSubscription({
      endpoint: "https://push.example.com/x",
      keys: { p256dh: "a" },
    }).ok,
    false
  );
  assert.equal(parsePushSubscription(null).ok, false);
});
