"use client";

import ReactMarkdown, { type Components } from "react-markdown";

import {
  markdownRehypePlugins,
  markdownRemarkPlugins,
} from "@/lib/markdown/math";

// Split out of ChatMessageBubble (perf): react-markdown + remark-gfm
// (+ micromark) is ~76 KB gzip. The bubble loads this with
// next/dynamic WITHOUT ssr: false, so the server still renders the
// markdown into the first HTML (no pop-in, no layout shift); only
// the library's JS moves to a separate chunk that loads after
// hydration. The Components overrides stay in the bubble (they need
// its CopyButton) and arrive as a prop — they are plain functions,
// not the heavy library.
//
// Math: remark-math + rehype-katex (see lib/markdown/math.ts) render
// $...$ / $$...$$ via KaTeX. $ inside code fences and inline code
// stays literal, and a malformed expression renders as an error,
// never a crash. The Thinking block shares this component, so it
// gets math rendering too.
export default function MarkdownContent({
  content,
  components,
}: {
  content: string;
  components: Components;
}) {
  return (
    <div
      className="
        markdown-content min-w-0
        [&>*:first-child]:mt-0
        [&>*:last-child]:mb-0
        [&_h1]:mb-3 [&_h1]:mt-5
        [&_h1]:text-xl [&_h1]:font-bold
        [&_h1]:leading-tight [&_h1]:text-white
        [&_h2]:mb-3 [&_h2]:mt-5
        [&_h2]:text-lg [&_h2]:font-bold
        [&_h2]:leading-tight [&_h2]:text-white
        [&_h3]:mb-2 [&_h3]:mt-4
        [&_h3]:text-base [&_h3]:font-semibold
        [&_h3]:text-white
        [&_p]:my-3
        [&_strong]:font-semibold [&_strong]:text-white
        [&_em]:italic
        [&_ul]:my-3 [&_ul]:list-disc [&_ul]:pl-6
        [&_ol]:my-3 [&_ol]:list-decimal [&_ol]:pl-6
        [&_li]:my-1 [&_li]:pl-1
        [&_li::marker]:text-[#D4AF37]
        [&_blockquote]:my-3
        [&_blockquote]:border-l-2
        [&_blockquote]:border-[#D4AF37]/50
        [&_blockquote]:pl-4
        [&_blockquote]:text-zinc-400
        [&_hr]:my-5 [&_hr]:border-white/10
        [&_input[type=checkbox]]:mr-2
        [&_input[type=checkbox]]:accent-[#D4AF37]
      "
    >
      <ReactMarkdown
        remarkPlugins={markdownRemarkPlugins}
        rehypePlugins={markdownRehypePlugins}
        skipHtml
        components={components}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
