import test from "node:test";
import assert from "node:assert/strict";

import {
  buildShareUrl,
  expiryFromOption,
  generateShareToken,
  isShareExpired,
  isShareLive,
  isShareToken,
  validateCommentBody,
  validateReportReason,
} from "./share.ts";

test("generateShareToken returns a 43-char base64url token, different every time", () => {
  const first = generateShareToken();
  const second = generateShareToken();
  assert.equal(first.length, 43);
  assert.match(first, /^[A-Za-z0-9_-]{43}$/);
  assert.notEqual(first, second);
  assert.equal(isShareToken(first), true);
});

test("isShareToken rejects anything that is not a token", () => {
  assert.equal(isShareToken(""), false);
  assert.equal(isShareToken("short"), false);
  assert.equal(isShareToken("a".repeat(43)), true);
  assert.equal(isShareToken("a".repeat(44)), false);
  assert.equal(isShareToken("a".repeat(42) + "/"), false);
  assert.equal(isShareToken(null), false);
  assert.equal(isShareToken(42), false);
});

test("expiryFromOption gives 7d / 30d / never", () => {
  const now = new Date("2026-11-22T00:00:00.000Z");
  assert.equal(
    expiryFromOption("7d", now),
    new Date("2026-11-29T00:00:00.000Z").toISOString()
  );
  assert.equal(
    expiryFromOption("30d", now),
    new Date("2026-12-22T00:00:00.000Z").toISOString()
  );
  assert.equal(expiryFromOption("never", now), null);
});

test("isShareLive is false when revoked or expired, true otherwise", () => {
  const now = new Date("2026-11-22T00:00:00.000Z");
  const live = { expires_at: null, revoked: false };
  assert.equal(isShareLive(live, now), true);
  assert.equal(
    isShareLive({ expires_at: "2026-11-21T00:00:00.000Z", revoked: false }, now),
    false
  );
  assert.equal(isShareLive({ ...live, revoked: true }, now), false);
  assert.equal(isShareExpired({ expires_at: null }, now), false);
});

test("buildShareUrl joins origin and token without a double slash", () => {
  assert.equal(
    buildShareUrl("https://anvix.example", "tok123"),
    "https://anvix.example/share/tok123"
  );
  assert.equal(
    buildShareUrl("https://anvix.example/", "tok123"),
    "https://anvix.example/share/tok123"
  );
});

test("validateCommentBody rejects empty and over-long comments", () => {
  assert.equal(validateCommentBody(""), "Write a comment first.");
  assert.equal(validateCommentBody("   "), "Write a comment first.");
  assert.equal(validateCommentBody("ok"), null);
  assert.equal(
    validateCommentBody("x".repeat(2001)),
    "Comments are limited to 2000 characters."
  );
  assert.equal(validateCommentBody("x".repeat(2000)), null);
});

test("validateReportReason rejects empty and over-long reasons", () => {
  assert.equal(
    validateReportReason(""),
    "Tell us briefly what is wrong with this link."
  );
  assert.equal(validateReportReason("Spam"), null);
  assert.equal(
    validateReportReason("x".repeat(501)),
    "Keep the reason under 500 characters."
  );
});
