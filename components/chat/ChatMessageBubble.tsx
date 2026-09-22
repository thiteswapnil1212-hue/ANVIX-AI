
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
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

export default function ChatMessageBubble({
  role,
  content,
}: ChatMessageBubbleProps) {
  const isAssistant = role === "assistant";
  const isEmptyAssistant = isAssistant && !content.trim();

  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState(false);

  const copyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null
  );

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
      }, 1600);
    } catch (error) {
      console.error("Failed to copy message:", error);
      setCopyError(true);

      copyTimeoutRef.current = setTimeout(() => {
        setCopyError(false);
        copyTimeoutRef.current = null;
      }, 2200);
    }
  }, [content, clearCopyTimeout]);

  if (isEmptyAssistant) {
    return null;
  }

  return (
    <article
      className={`
        group/message flex w-full items-start gap-2.5
        sm:gap-3
        ${
          isAssistant
            ? "justify-start"
            : "justify-end"
        }
      `}
    >
      {/* ASSISTANT AVATAR */}
      {isAssistant && (
        <div
          className="
            mt-1 flex h-8 w-8 shrink-0
            items-center justify-center
            rounded-xl border border-[#D4AF37]/25
            bg-gradient-to-br
            from-[#D4AF37]/[0.13]
            to-[#D4AF37]/[0.03]
            shadow-[0_0_18px_rgba(212,175,55,0.06)]
          "
          aria-label="ANVIX AI"
          title="ANVIX AI"
        >
          <Sparkles
            className="h-4 w-4 text-[#D4AF37]"
            strokeWidth={1.8}
            aria-hidden="true"
          />
        </div>
      )}

      {/* MESSAGE CONTENT */}
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
        {/* ASSISTANT HEADER */}
        {isAssistant && (
          <div className="mb-2 flex min-h-4 items-center gap-2 px-1">
            <span
              className="
                text-[10px] font-bold uppercase
                tracking-[0.17em] text-[#D4AF37]
              "
            >
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

        {/* MESSAGE BUBBLE */}
        <div
          className={`
            relative min-w-0 rounded-2xl
            border px-4 py-3
            transition-[border-color,background-color]
            duration-200
            sm:px-5 sm:py-4
            ${
              isAssistant
                ? `
                  rounded-tl-md
                  border-white/[0.07]
                  bg-[#151518]/95
                  text-zinc-200
                  shadow-[0_8px_30px_rgba(0,0,0,0.12)]
                  hover:border-white/[0.12]
                `
                : `
                  rounded-tr-md
                  border-[#D4AF37]/20
                  bg-gradient-to-br
                  from-[#302E25]
                  to-[#24231F]
                  text-zinc-100
                  shadow-[0_8px_30px_rgba(0,0,0,0.10)]
                  hover:border-[#D4AF37]/35
                `
            }
          `}
        >
          {/* MESSAGE TEXT */}
          <div
            className={`
              min-w-0 break-words
              [overflow-wrap:anywhere]
              text-[14px] leading-[1.8]
              sm:text-[15px]
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
                    pre: ({ children, ...props }) => (
                      <pre {...props}>
                        {children}
                      </pre>
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

          {/* COPY BUTTON */}
          <button
            type="button"
            onClick={handleCopy}
            aria-label={
              copied
                ? "Message copied"
                : copyError
                  ? "Copy failed"
                  : "Copy message"
            }
            title={
              copied
                ? "Copied!"
                : copyError
                  ? "Copy failed"
                  : "Copy message"
            }
            className={`
              absolute
              ${
                isAssistant
                  ? "right-2"
                  : "left-2"
              }
              -bottom-9
              flex h-7 w-7
              items-center justify-center
              rounded-lg border
              border-white/[0.08]
              bg-[#18181B]
              shadow-lg
              transition-all duration-200
              opacity-100
              sm:opacity-0
              sm:group-hover/message:opacity-100
              sm:group-focus-within/message:opacity-100
              hover:border-[#D4AF37]/30
              hover:bg-[#222225]
              focus-visible:opacity-100
              focus-visible:outline-none
              focus-visible:ring-2
              focus-visible:ring-[#D4AF37]/60
            `}
          >
            {copied ? (
              <Check
                className="h-3.5 w-3.5 text-emerald-400"
                aria-hidden="true"
              />
            ) : (
              <Copy
                className={`
                  h-3.5 w-3.5
                  ${
                    copyError
                      ? "text-red-400"
                      : "text-zinc-400"
                  }
                `}
                aria-hidden="true"
              />
            )}
          </button>
        </div>

        {/* COPY FEEDBACK */}
        {(copied || copyError) && (
          <p
            role="status"
            aria-live="polite"
            className={`
              mt-2 px-1 text-[11px]
              ${
                copied
                  ? "text-emerald-400"
                  : "text-red-400"
              }
            `}
          >
            {copied
              ? "Copied to clipboard"
              : "Unable to copy message"}
          </p>
        )}
      </div>

      {/* USER AVATAR */}
      {!isAssistant && (
        <div
          className="
            mt-1 flex h-8 w-8 shrink-0
            items-center justify-center
            rounded-xl border border-white/[0.10]
            bg-[#202023] text-zinc-400
          "
          aria-label="You"
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