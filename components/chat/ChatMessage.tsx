
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  Bot,
  User,
  Copy,
  Check,
  RotateCcw,
  Sparkles,
} from "lucide-react";

type ChatMessageProps = {
  role: "user" | "assistant";
  content: string;
  onRegenerate?: () => void;
};

export default function ChatMessage({
  role,
  content,
  onRegenerate,
}: ChatMessageProps) {
  const isUser = role === "user";
  const isAssistant = !isUser;

  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState(false);

  const copyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null
  );

  const isThinkingPlaceholder =
    isAssistant &&
    content.trim().toLowerCase() === "thinking...";

  const isEmptyAssistant =
    isAssistant && !content.trim();

  const hideMessage =
    isThinkingPlaceholder || isEmptyAssistant;

  const clearCopyTimeout = useCallback(() => {
    if (copyTimeoutRef.current) {
      clearTimeout(copyTimeoutRef.current);
      copyTimeoutRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      clearCopyTimeout();
    };
  }, [clearCopyTimeout]);

  const handleCopy = useCallback(async () => {
    if (!content.trim()) return;

    clearCopyTimeout();
    setCopied(false);
    setCopyError(false);

    try {
      if (!navigator.clipboard?.writeText) {
        throw new Error("Clipboard API is unavailable");
      }

      await navigator.clipboard.writeText(content);

      setCopied(true);

      copyTimeoutRef.current = setTimeout(() => {
        setCopied(false);
        copyTimeoutRef.current = null;
      }, 1500);
    } catch (error) {
      console.error("Unable to copy message:", error);
      setCopyError(true);

      copyTimeoutRef.current = setTimeout(() => {
        setCopyError(false);
        copyTimeoutRef.current = null;
      }, 2000);
    }
  }, [content, clearCopyTimeout]);

  // Hooks remain above this conditional to follow React's Rules of Hooks.
  if (hideMessage) {
    return null;
  }

  return (
    <article
      className="
        group/message w-full
        border-b border-white/[0.045]
        bg-transparent
        transition-colors duration-200
        hover:bg-white/[0.008]
      "
    >
      <div
        className="
          mx-auto flex w-full max-w-3xl
          items-start gap-3.5
          px-4 py-5
          sm:gap-4 sm:px-6 sm:py-6
        "
      >
        {/* AVATAR */}
        <div
          className={`
            mt-0.5 flex h-8 w-8 shrink-0
            items-center justify-center
            rounded-xl border
            ${
              isUser
                ? `
                  border-white/[0.10]
                  bg-white/[0.035]
                `
                : `
                  border-[#D4AF37]/20
                  bg-[#D4AF37]/[0.07]
                  shadow-[0_0_18px_rgba(212,175,55,0.05)]
                `
            }
          `}
          aria-hidden="true"
        >
          {isUser ? (
            <User
              className="h-4 w-4 text-zinc-400"
              strokeWidth={1.8}
            />
          ) : (
            <Sparkles
              className="h-4 w-4 text-[#D4AF37]"
              strokeWidth={1.8}
            />
          )}
        </div>

        {/* MESSAGE BODY */}
        <div className="min-w-0 flex-1">
          {/* HEADER */}
          <div className="mb-2 flex min-h-5 items-center gap-2">
            <span className="text-[13px] font-semibold text-zinc-200">
              {isUser ? "You" : "ANVIX AI"}
            </span>

            {isAssistant && (
              <>
                <span
                  className="
                    h-1 w-1 rounded-full
                    bg-zinc-700
                  "
                  aria-hidden="true"
                />

                <span
                  className="
                    text-[10px] font-medium
                    uppercase tracking-[0.12em]
                    text-[#D4AF37]/75
                  "
                >
                  Assistant
                </span>
              </>
            )}
          </div>

          {/* CONTENT */}
          <div
            className={`
              min-w-0 break-words
              [overflow-wrap:anywhere]
              text-[14px] leading-[1.8]
              sm:text-[15px]
              ${
                isUser
                  ? `
                    whitespace-pre-wrap
                    text-zinc-300
                    selection:bg-[#D4AF37]/20
                  `
                  : `
                    text-zinc-300
                    selection:bg-[#D4AF37]/20
                  `
              }
            `}
          >
            {isAssistant ? (
              <div
                className="
                  markdown-content min-w-0

                  [&>*:first-child]:mt-0
                  [&>*:last-child]:mb-0

                  [&_h1]:mb-3
                  [&_h1]:mt-5
                  [&_h1]:text-xl
                  [&_h1]:font-bold
                  [&_h1]:leading-tight
                  [&_h1]:text-white

                  [&_h2]:mb-3
                  [&_h2]:mt-5
                  [&_h2]:text-lg
                  [&_h2]:font-bold
                  [&_h2]:leading-tight
                  [&_h2]:text-white

                  [&_h3]:mb-2
                  [&_h3]:mt-4
                  [&_h3]:text-base
                  [&_h3]:font-semibold
                  [&_h3]:text-white

                  [&_p]:my-3

                  [&_strong]:font-semibold
                  [&_strong]:text-white

                  [&_em]:italic

                  [&_ul]:my-3
                  [&_ul]:list-disc
                  [&_ul]:pl-6

                  [&_ol]:my-3
                  [&_ol]:list-decimal
                  [&_ol]:pl-6

                  [&_li]:my-1
                  [&_li]:pl-1
                  [&_li::marker]:text-[#D4AF37]

                  [&_blockquote]:my-3
                  [&_blockquote]:border-l-2
                  [&_blockquote]:border-[#D4AF37]/50
                  [&_blockquote]:pl-4
                  [&_blockquote]:text-zinc-400

                  [&_a]:break-words
                  [&_a]:text-[#D4AF37]
                  [&_a]:underline
                  [&_a]:underline-offset-4
                  [&_a:hover]:text-yellow-300

                  [&_hr]:my-5
                  [&_hr]:border-white/10

                  [&_table]:my-4
                  [&_table]:w-full
                  [&_table]:border-collapse

                  [&_th]:border
                  [&_th]:border-white/10
                  [&_th]:bg-white/[0.04]
                  [&_th]:px-3
                  [&_th]:py-2
                  [&_th]:text-left
                  [&_th]:font-semibold

                  [&_td]:border
                  [&_td]:border-white/10
                  [&_td]:px-3
                  [&_td]:py-2

                  [&_code]:rounded
                  [&_code]:bg-white/[0.08]
                  [&_code]:px-1.5
                  [&_code]:py-0.5
                  [&_code]:font-mono
                  [&_code]:text-[0.9em]
                  [&_code]:text-[#E9C96B]

                  [&_pre]:my-4
                  [&_pre]:max-w-full
                  [&_pre]:overflow-x-auto
                  [&_pre]:rounded-xl
                  [&_pre]:border
                  [&_pre]:border-white/10
                  [&_pre]:bg-[#09090B]
                  [&_pre]:p-3
                  sm:[&_pre]:p-4

                  [&_pre_code]:bg-transparent
                  [&_pre_code]:p-0
                  [&_pre_code]:text-zinc-200
                "
              >
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  skipHtml
                  components={{
                    a: ({ children, ...props }) => (
                      <a
                        {...props}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {children}
                      </a>
                    ),
                  }}
                >
                  {content}
                </ReactMarkdown>
              </div>
            ) : (
              content
            )}
          </div>

          {/* MESSAGE ACTIONS */}
          {isAssistant && content.trim() !== "" && (
            <div
              className="
                mt-3 flex min-h-8
                items-center gap-1
                opacity-100
                transition-opacity duration-150
                sm:opacity-0
                sm:group-hover/message:opacity-100
                sm:group-focus-within/message:opacity-100
              "
            >
              {/* COPY */}
              <button
                type="button"
                onClick={handleCopy}
                aria-label={
                  copied
                    ? "Copied response"
                    : copyError
                      ? "Copy failed"
                      : "Copy response"
                }
                title={
                  copied
                    ? "Copied"
                    : copyError
                      ? "Copy failed"
                      : "Copy"
                }
                className="
                  inline-flex h-8 items-center
                  justify-center gap-1.5
                  rounded-lg border
                  border-transparent px-2
                  text-zinc-500
                  transition-colors
                  hover:border-white/[0.06]
                  hover:bg-white/[0.045]
                  hover:text-zinc-200
                  focus-visible:outline-none
                  focus-visible:ring-1
                  focus-visible:ring-[#D4AF37]/60
                "
              >
                {copied ? (
                  <Check
                    className="h-3.5 w-3.5 text-emerald-400"
                    strokeWidth={1.8}
                    aria-hidden="true"
                  />
                ) : (
                  <Copy
                    className={`
                      h-3.5 w-3.5
                      ${
                        copyError
                          ? "text-red-400"
                          : ""
                      }
                    `}
                    strokeWidth={1.8}
                    aria-hidden="true"
                  />
                )}

                <span className="text-[11px]">
                  {copied
                    ? "Copied"
                    : copyError
                      ? "Try again"
                      : "Copy"}
                </span>
              </button>

              {/* REGENERATE */}
              {onRegenerate && (
                <button
                  type="button"
                  onClick={onRegenerate}
                  aria-label="Regenerate response"
                  title="Regenerate response"
                  className="
                    inline-flex h-8 items-center
                    justify-center gap-1.5
                    rounded-lg border
                    border-transparent px-2
                    text-zinc-500
                    transition-colors
                    hover:border-white/[0.06]
                    hover:bg-white/[0.045]
                    hover:text-zinc-200
                    focus-visible:outline-none
                    focus-visible:ring-1
                    focus-visible:ring-[#D4AF37]/60
                  "
                >
                  <RotateCcw
                    className="h-3.5 w-3.5"
                    strokeWidth={1.8}
                    aria-hidden="true"
                  />

                  <span className="text-[11px]">
                    Regenerate
                  </span>
                </button>
              )}

              {/* COPY ERROR FEEDBACK */}
              {copyError && (
                <span
                  role="status"
                  className="ml-1 text-[10px] text-red-400"
                >
                  Could not copy
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </article>
  );
}