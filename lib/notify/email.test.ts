import test from "node:test";
import assert from "node:assert/strict";

import {
  digestEmailText,
  parseEmailInput,
  resetEmailText,
  welcomeEmailText,
} from "./email.ts";

test("welcomeEmailText greets the user by name", () => {
  const { subject, text } = welcomeEmailText("Swapnil");
  assert.equal(subject, "Welcome to ANVIX AI");
  assert.ok(text.includes("Hi Swapnil,"));
});

test("resetEmailText includes the reset URL", () => {
  const { subject, text } = resetEmailText("https://anvix.example/reset?x=1");
  assert.equal(subject, "Reset your ANVIX password");
  assert.ok(text.includes("https://anvix.example/reset?x=1"));
});

test("digestEmailText lists items and caps at 50 with a remainder count", () => {
  const items = Array.from({ length: 55 }, (_, i) => `item ${i + 1}`);
  const { text } = digestEmailText("Swapnil", items);
  assert.ok(text.includes("• item 1"));
  assert.ok(text.includes("• item 50"));
  assert.ok(!text.includes("• item 51"));
  assert.ok(text.includes("…and 5 more"));
});

test("digestEmailText handles an empty digest", () => {
  const { text } = digestEmailText("Swapnil", []);
  assert.ok(text.includes("Nothing new since your last digest."));
});

test("parseEmailInput accepts a valid email and rejects bad ones", () => {
  assert.equal(
    parseEmailInput({
      to: "user@example.com",
      subject: "Hi",
      text: "Hello",
      kind: "welcome",
    }).ok,
    true
  );
  assert.equal(
    parseEmailInput({
      to: "not-an-email",
      subject: "Hi",
      text: "Hello",
      kind: "welcome",
    }).ok,
    false
  );
  assert.equal(
    parseEmailInput({
      to: "user@example.com",
      subject: "Hi",
      text: "Hello",
      kind: "marketing",
    }).ok,
    false
  );
  assert.equal(
    parseEmailInput({
      to: "user@example.com",
      subject: " ",
      text: "Hello",
      kind: "welcome",
    }).ok,
    false
  );
});
