"use client";

// KaTeX stylesheet, loaded ONLY when a rendered reply actually
// contains maths: MarkdownContent dynamically imports this component
// when it detects `.katex` output in the rendered DOM.
//
// Previously the CSS was imported globally in app/globals.css, so
// every page paid for it — including the ~99% of chats with no maths
// at all. The fonts stay bundled from node_modules (no external font
// CDN); browsers only fetch a font file when `.katex` text renders.
// This component renders nothing — importing it is what loads the
// stylesheet chunk.
import "katex/dist/katex.min.css";

export default function KatexStyles() {
  return null;
}
