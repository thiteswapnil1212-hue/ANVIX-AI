import test from "node:test";
import assert from "node:assert/strict";

import { friendlyAuthError } from "./auth-errors.ts";

test("wrong password maps to a plain-words mismatch message", () => {
  assert.equal(
    friendlyAuthError({ message: "Invalid login credentials" }),
    "That email and password don't match. Check them and try again."
  );
});

test("unconfirmed email tells the user to check the inbox", () => {
  assert.equal(
    friendlyAuthError(new Error("Email not confirmed")),
    "This email isn't confirmed yet — check your inbox for the confirmation link, then try again."
  );
});

test("already-registered email points at sign-in", () => {
  assert.equal(
    friendlyAuthError({ message: "User already registered" }),
    "An account with this email already exists. Try signing in instead."
  );
});

test("rate limiting asks the user to wait", () => {
  assert.equal(
    friendlyAuthError({ message: "Too many requests" }),
    "Too many attempts — please wait a minute and try again."
  );
});

test("expired link asks for a fresh one", () => {
  assert.equal(
    friendlyAuthError({
      message: "Email link is invalid or has expired",
    }),
    "That link has expired. Request a fresh one and try again."
  );
});

test("weak password asks for a stronger one", () => {
  assert.equal(
    friendlyAuthError({
      message: "Password should be at least 6 characters",
    }),
    "Choose a stronger password (at least 8 characters)."
  );
});

test("network failure points at the connection", () => {
  assert.equal(
    friendlyAuthError({ message: "Failed to fetch" }),
    "Couldn't reach the auth service. Check your connection and try again."
  );
});

test("unknown errors pass through unchanged", () => {
  assert.equal(
    friendlyAuthError({ message: "Something exotic happened" }),
    "Something exotic happened"
  );
});

test("missing or empty errors still yield a usable message", () => {
  assert.equal(
    friendlyAuthError(undefined),
    "Something went wrong. Please try again."
  );
  assert.equal(
    friendlyAuthError({ message: "   " }),
    "Something went wrong. Please try again."
  );
  assert.equal(
    friendlyAuthError(""),
    "Something went wrong. Please try again."
  );
});
