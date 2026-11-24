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

test("preview collapses newlines and extra whitespace", () => {
  assert.equal(
    cleanPreviewText("  first line\n\n   second   line  "),
    "first line second line"
  );
});
