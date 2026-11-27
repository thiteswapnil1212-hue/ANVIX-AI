import type { ComponentProps } from "react";
import type ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";

/**
 * Shared markdown math configuration for assistant replies.
 *
 * One source of truth for the remark/rehype plugins, so the chat
 * bubble (MarkdownContent) and the render tests below use the exact
 * same pipeline. MarkdownContent passes these straight through to
 * ReactMarkdown; the Thinking block shares the component, so it gets
 * math rendering for free.
 *
 * - Inline `$...$` and display `$$...$$`, including `\text{}`,
 *   `\rightarrow`, subscripts and superscripts.
 * - `$` inside code fences / inline code stays literal: remark-math
 *   never parses inside code, so shell variables and template
 *   literals are untouched.
 * - Model output is untrusted prose: `throwOnError: false` renders a
 *   malformed expression as a visible error instead of throwing and
 *   breaking the whole reply; `strict: false` tolerates the loose
 *   LaTeX models routinely emit; `trust: false` (the default) never
 *   allows `\href` / `\url` / `\includegraphics` from model output.
 * - KaTeX CSS comes from `app/globals.css` (`katex/dist/katex.min.css`,
 *   bundled with its fonts — no external font CDN).
 */
export const markdownRemarkPlugins: ComponentProps<
  typeof ReactMarkdown
>["remarkPlugins"] = [remarkMath, remarkGfm];

export const markdownRehypePlugins: ComponentProps<
  typeof ReactMarkdown
>["rehypePlugins"] = [
  [
    rehypeKatex,
    {
      throwOnError: false,
      strict: false,
      trust: false,
    },
  ],
];
