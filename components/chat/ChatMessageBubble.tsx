
"use client";

import {
  memo,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  Check,
  Copy,
  Sparkles,
  UserRound,
} from "lucide-react";

interface ChatMessageBubbleProps {
  role: "assistant" | "user";
  content: string;
}

function CopyButton({
  text,
  label = "Copy",
  className = "",
}: {
  text: string;
  label?: string;
  className?: string;
}) {
  const [status, setStatus] = useState<"idle" | "copied" | "error">(
    "idle"
  );
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimeoutRef = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  useEffect(() => clearTimeoutRef, [clearTimeoutRef]);

  const handleCopy = useCallback(async () => {
    clearTimeoutRef();
    setStatus("idle");

    try {
      if (!navigator.clipboard?.writeText) {
        throw new Error("Clipboard API unavailable");
      }

      await navigator.clipboard.writeText(text);
      setStatus("copied");
    } catch {
      setStatus("error");
    }

    timeoutRef.current = setTimeout(() => {
      setStatus("idle");
      timeoutRef.current = null;
    }, 1800);
  }, [text, clearTimeoutRef]);

  return (
    <button
      type="button"
      onClick={handleCopy}
      aria-label={
        status === "copied"
          ? `${label} copied`
          : status === "error"
            ? `${label} failed`
            : label
      }
      title={
        status === "copied"
          ? "Copied!"
          : status === "error"
            ? "Copy failed"
            : label
      }
      className={`
        inline-flex min-h-8 items-center justify-center gap-1.5
        rounded-lg border border-white/10 bg-white/[0.04]
        px-2.5 text-xs font-medium text-zinc-400
        transition-colors hover:border-[#D4AF37]/30
        hover:bg-[#D4AF37]/[0.08] hover:text-[#E9C96B]
        focus-visible:outline-none focus-visible:ring-2
        focus-visible:ring-[#D4AF37]/60
        ${className}
      `}
    >
      {status === "copied" ? (
        <Check className="h-3.5 w-3.5 text-emerald-400" />
      ) : (
        <Copy
          className={`h-3.5 w-3.5 ${
            status === "error" ? "text-red-400" : ""
          }`}
        />
      )}
      <span>
        {status === "copied"
          ? "Copied"
          : status === "error"
            ? "Failed"
            : label}
      </span>
    </button>
  );
}

const markdownComponents: Components = {
  a: ({ children, href, ...props }) => {
    const safeHref =
      href &&
      /^(https?:|mailto:|\/|#)/i.test(href) &&
      !/^\/\//.test(href)
        ? href
        : undefined;

    return (
      <a
        {...props}
        href={safeHref}
        target={safeHref?.startsWith("http") ? "_blank" : undefined}
        rel={safeHref?.startsWith("http") ? "noopener noreferrer" : undefined}
        className="
          break-words text-[#D4AF37] underline
          underline-offset-4 transition-colors
          hover:text-yellow-300
        "
      >
        {children}
      </a>
    );
  },

  pre: ({ children, ...props }) => {
    const codeChild = Array.isArray(children)
      ? children.find(
          (child) =>
            child &&
            typeof child === "object" &&
            "props" in child &&
            (child as { props?: { children?: unknown } }).props
        )
      : children;

    const codeProps =
      codeChild &&
      typeof codeChild === "object" &&
      "props" in codeChild
        ? (codeChild as {
            props?: {
              children?: unknown;
              className?: string;
            };
          }).props
        : undefined;

    const codeText =
      typeof codeProps?.children === "string"
        ? codeProps.children
        : Array.isArray(codeProps?.children)
          ? codeProps.children.join("")
          : "";

    const language =
      codeProps?.className?.match(/language-([\w+-]+)/)?.[1];

    return (
      <div className="my-4 min-w-0 overflow-hidden rounded-xl border border-white/10 bg-[#09090B]">
        <div className="
          flex min-h-10 items-center justify-between gap-3
          border-b border-white/[0.07] bg-white/[0.025]
          px-3 py-2
        ">
          <span className="truncate text-[11px] font-medium uppercase tracking-wider text-zinc-500">
            {language || "Code"}
          </span>
          <CopyButton
            text={codeText}
            label="Copy code"
            className="min-h-7 shrink-0 px-2"
          />
        </div>

        <pre
          {...props}
          className="
            m-0 max-w-full overflow-x-auto p-4
            text-[13px] leading-6 text-zinc-200
            [tab-size:2]
          "
        >
          {children}
        </pre>
      </div>
    );
  },

  code: ({ className, children, ...props }) => {
    const isBlock = Boolean(className?.includes("language-"));

    return (
      <code
        {...props}
        className={
          isBlock
            ? `font-mono ${className || ""}`
            : `
              rounded-md border border-white/[0.06]
              bg-white/[0.07] px-1.5 py-0.5
              font-mono text-[0.9em] text-[#E9C96B]
              ${className || ""}
            `
        }
      >
        {children}
      </code>
    );
  },

  table: ({ children, ...props }) => (
    <div className="my-4 max-w-full overflow-x-auto rounded-xl border border-white/10">
      <table
        {...props}
        className="w-full min-w-max border-collapse text-left text-sm"
      >
        {children}
      </table>
    </div>
  ),

  th: ({ children, ...props }) => (
    <th
      {...props}
      className="
        border-b border-white/10 bg-white/[0.04]
        px-3 py-2.5 text-left font-semibold text-zinc-100
      "
    >
      {children}
    </th>
  ),

  td: ({ children, ...props }) => (
    <td
      {...props}
      className="border-b border-white/[0.06] px-3 py-2.5 text-zinc-300"
    >
      {children}
    </td>
  ),

  img: ({ alt }) => (
    <span className="text-xs text-zinc-500">
      [Image{alt ? `: ${alt}` : ""}]
    </span>
  ),
};

function ChatMessageBubble({
  role,
  content,
}: ChatMessageBubbleProps) {
  const isAssistant = role === "assistant";
  const isEmptyAssistant = isAssistant && !content.trim();

  if (isEmptyAssistant) return null;

  return (
    <article
      aria-label={isAssistant ? "Assistant message" : "Your message"}
      className={`
        group/message flex w-full items-start gap-2.5
        sm:gap-3
        ${isAssistant ? "justify-start" : "justify-end"}
      `}
    >
      {isAssistant && (
        <div
          className="
            mt-1 flex h-8 w-8 shrink-0 items-center
            justify-center rounded-xl border
            border-[#D4AF37]/25
            bg-gradient-to-br from-[#D4AF37]/[0.13]
            to-[#D4AF37]/[0.03]
            shadow-[0_0_18px_rgba(212,175,55,0.06)]
          "
          title="ANVIX AI"
        >
          <Sparkles
            className="h-4 w-4 text-[#D4AF37]"
            strokeWidth={1.8}
            aria-hidden="true"
          />
        </div>
      )}

      <div
        className={`
          relative min-w-0
          ${
            isAssistant
              ? "max-w-[calc(100%-2.75rem)] sm:max-w-[82%]"
              : "max-w-[calc(100%-2.75rem)] sm:max-w-[76%]"
          }
        `}
      >
        {isAssistant && (
          <div className="mb-2 flex min-h-4 items-center gap-2 px-1">
            <span className="text-[10px] font-bold uppercase tracking-[0.17em] text-[#D4AF37]">
              ANVIX AI
            </span>
            <span
              className="h-1 w-1 rounded-full bg-zinc-700"
              aria-hidden="true"
            />
            <span className="text-[10px] font-medium text-zinc-500">
              Assistant
            </span>
          </div>
        )}

        <div
          className={`
            relative min-w-0 rounded-2xl border
            px-4 py-3 transition-colors duration-200
            sm:px-5 sm:py-4
            ${
              isAssistant
                ? `
                  rounded-tl-md border-white/[0.07]
                  bg-[#151518]/95 text-zinc-200
                  shadow-[0_8px_30px_rgba(0,0,0,0.12)]
                  hover:border-white/[0.12]
                `
                : `
                  rounded-tr-md border-[#D4AF37]/20
                  bg-gradient-to-br from-[#302E25]
                  to-[#24231F] text-zinc-100
                  shadow-[0_8px_30px_rgba(0,0,0,0.10)]
                  hover:border-[#D4AF37]/35
                `
            }
          `}
        >
          <div
            className={`
              min-w-0 break-words [overflow-wrap:anywhere]
              text-[14px] leading-[1.8] sm:text-[15px]
              ${
                isAssistant
                  ? "selection:bg-[#D4AF37]/25"
                  : "whitespace-pre-wrap selection:bg-zinc-500/30"
              }
            `}
          >
            {isAssistant ? (
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
                  remarkPlugins={[remarkGfm]}
                  skipHtml
                  components={markdownComponents}
                >
                  {content}
                </ReactMarkdown>
              </div>
            ) : (
              content
            )}
          </div>

          <div
            className={`
              mt-3 flex
              ${isAssistant ? "justify-end" : "justify-start"}
            `}
          >
            <CopyButton
              text={content}
              label="Copy message"
              className="
                opacity-100 sm:opacity-0
                sm:group-hover/message:opacity-100
                sm:group-focus-within/message:opacity-100
              "
            />
          </div>
        </div>
      </div>

      {!isAssistant && (
        <div
          className="
            mt-1 flex h-8 w-8 shrink-0 items-center
            justify-center rounded-xl border
            border-white/[0.10] bg-[#202023] text-zinc-400
          "
          title="You"
        >
          <UserRound
            className="h-4 w-4"
            strokeWidth={1.8}
            aria-hidden="true"
          />
        </div>
      )}
    </article>
  );
}

export default memo(ChatMessageBubble);