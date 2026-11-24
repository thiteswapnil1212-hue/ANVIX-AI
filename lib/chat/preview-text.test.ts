import test from "node:test";
import assert from "node:assert/strict";

import { cleanPreviewText } from "./preview-text.ts";

test("preview strips an artifact fence and its HTML document", () => {
  const raw = [
    "Here is your calculator:",
    '```artifact:html title="Tiny Calculator"',
    "<!DOCTYPE html>",
    '<html lang="en"><head><meta charset="utf-8"></head>',
    "<body><p>hi</p></body></html>",
    "```",
  ].join("\n");

  assert.equal(cleanPreviewText(raw), "Here is your calculator:");
});

test("preview of pure markup is empty so the caller can fall back", () => {
  assert.equal(
    cleanPreviewText(
      '```artifact:html title="Tiny Calculator" <!DOCTYPE html> <html lang="en"> <head> <meta charset="U'
    ),
    ""
  );
});

test("preview keeps readable text and strips markdown", () => {
  assert.equal(
    cleanPreviewText("**Bold** answer with [a link](https://example.com)"),
    "Bold answer with a link"
  );
});

test("preview drops a truncated tag fragment and the interruption note", () => {
  // The exact reported case: the stream was cut off mid-<meta> tag,
  // so no ">" exists after it, and the client appended the
  // interruption note. Nothing readable remains.
  const raw = [
    '```artifact:html title="Tiny Calculator"',
    "<!DOCTYPE html>",
    '<html lang="en"><head><meta charset="utf-8">',
    '<meta name="viewport" content="width=device-width, ',
    "",
    "[Response interrupted. Please try again.]",
  ].join("\n");
  assert.equal(cleanPreviewText(raw), "");
});

test("preview keeps readable text and drops only the interruption note", () => {
  assert.equal(
    cleanPreviewText(
      "Here is your answer\n\n[Response interrupted. Please try again.]"
    ),
    "Here is your answer"
  );
});

test("preview strips an old stored raw tag fragment", () => {
  // A preview stored before cleaning existed (e.g. "<meta na").
  assert.equal(cleanPreviewText("<meta na"), "");
});

test("preview keeps a bare less-than in ordinary text", () => {
  assert.equal(cleanPreviewText("a < b and cost < $5"), "a < b and cost < $5");
});

test("preview collapses newlines and extra whitespace", () => {
  assert.equal(
    cleanPreviewText("  first line\n\n   second   line  "),
    "first line second line"
  );
});
