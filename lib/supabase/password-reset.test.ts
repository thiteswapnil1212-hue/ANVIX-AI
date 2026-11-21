import test from "node:test";
import assert from "node:assert/strict";

import {
  updatePassword,
  validateNewPassword,
  type PasswordUpdateClient,
} from "./password-reset.ts";

const fakeClient = (
  error: { message: string } | null
): PasswordUpdateClient => ({
  auth: {
    updateUser: async () => ({ error }),
  },
});

test("validateNewPassword rejects a short password", () => {
  assert.equal(
    validateNewPassword("short", "short"),
    "Choose a new password of at least 8 characters."
  );
});

test("validateNewPassword rejects mismatched confirmation", () => {
  assert.equal(
    validateNewPassword("new-password-1", "new-password-2"),
    "The two passwords don't match. Check them and try again."
  );
});

test("validateNewPassword accepts a matching pair of 8+ characters", () => {
  assert.equal(validateNewPassword("new-password-1", "new-password-1"), null);
});

test("updatePassword returns null on success", async () => {
  assert.equal(
    await updatePassword(fakeClient(null), "new-password-1"),
    null
  );
});

test("updatePassword maps a same-password error to plain words", async () => {
  assert.equal(
    await updatePassword(
      fakeClient({ message: "New password should be different" }),
      "new-password-1"
    ),
    "Choose a password that's different from your current one."
  );
});

test("updatePassword returns a usable message when updateUser throws", async () => {
  const throwing: PasswordUpdateClient = {
    auth: {
      updateUser: async () => {
        throw new Error("network down");
      },
    },
  };
  assert.equal(
    await updatePassword(throwing, "new-password-1"),
    "Something went wrong while contacting the auth service. Please try again."
  );
});
