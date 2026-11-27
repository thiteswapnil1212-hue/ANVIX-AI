import test from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ReactMarkdown from "react-markdown";

import {
  markdownRehypePlugins,
  markdownRemarkPlugins,
} from "./math.ts";

/**
 * Render markdown through the exact plugin pipeline the chat bubble
 * uses (same remark/rehype arrays, same ReactMarkdown component),
 * without a DOM: renderToStaticMarkup needs none.
 */
function renderMarkdown(content: string): string {
  return renderToStaticMarkup(
    React.createElement(
      ReactMarkdown,
      {
        remarkPlugins: markdownRemarkPlugins,
        rehypePlugins: markdownRehypePlugins,
      },
      content
    )
  );
}

test("inline math renders with KaTeX", () => {
  const html = renderMarkdown("The equation $E = mc^2$ is famous.");
  assert.match(html, /class="katex"/);
  assert.doesNotMatch(html, /\$E = mc\^2\$/);
});

test("display math renders, including \\text, \\rightarrow and subscripts", () => {
  // The exact live case: $$...$$ mid-sentence renders as KaTeX
  // (inline-style span — a display block needs the fence on its own
  // lines), with no raw $$ left visible.
  const html = renderMarkdown(
    "The Simple Equation: $$\\text{Sunlight} + \\text{Water} + \\text{Carbon Dioxide} \\rightarrow \\text{Glucose} + \\text{Oxygen}$$"
  );
  assert.match(html, /class="katex"/);
  assert.match(html, /Sunlight/);
  assert.match(html, /Glucose/);
  assert.doesNotMatch(html, /\$\$/);
});

test("$$ on its own lines renders as a display block", () => {
  // Display math needs the fence form (opening $$ alone on its
  // line); a single-line $$...$$ is inline math.
  const html = renderMarkdown(
    "Before:\n\n$$\nx^2 + y^2 = z^2\n$$\n\nAfter."
  );
  assert.match(html, /katex-display/);
  assert.doesNotMatch(html, /\$\$/);
});

test("subscripts render as math, not literal text", () => {
  const html = renderMarkdown("Water is $H_2O$ and carbon dioxide is $CO_2$.");
  assert.match(html, /class="katex"/);
  assert.doesNotMatch(html, /\$H_2O\$/);
  assert.doesNotMatch(html, /\$CO_2\$/);
});

test("a $ inside a code fence stays literal code", () => {
  const html = renderMarkdown(
    "```bash\necho $HOME\nconst price = `$5`;\n```"
  );
  assert.doesNotMatch(html, /class="katex"/);
  assert.match(html, /\$HOME/);
  assert.match(html, /\$5/);
});

test("a $ inside inline code stays literal", () => {
  const html = renderMarkdown("Run `echo $HOME` to see your home.");
  assert.doesNotMatch(html, /class="katex"/);
  assert.match(html, /\$HOME/);
});

test("a $ in ordinary prose does not break rendering", () => {
  const single = renderMarkdown("It costs $5.");
  assert.doesNotMatch(single, /class="katex"/);
  assert.match(single, /\$5/);
});

test("two $ amounts in one sentence render without throwing", () => {
  // Known limitation of single-$ math (same as GitHub/ChatGPT-style
  // rendering): "$5 and $10" has two $ signs, so remark-math reads
  // "$5 and $" as math and the prose comes out mangled. It must never
  // throw or drop text, but prices in a sentence are not guaranteed
  // literal — use a code span for amounts when that matters.
  const pair = renderMarkdown("It costs $5 and $10 total.");
  assert.match(pair, /total\./);
});

test("malformed math does not throw or break the reply", () => {
  const html = renderMarkdown("Broken: $\\notacommand{ and then some text.");
  assert.match(html, /and then some text/);
});
