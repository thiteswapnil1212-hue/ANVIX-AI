
"use client";

import { useEffect, useRef, useState } from "react";
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

  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState(false);

  const copyTimeoutRef = useRef<ReturnType<
    typeof setTimeout
  > | null>(null);

  useEffect(() => {
    return () => {
      if (copyTimeoutRef.current) {
        clearTimeout(copyTimeoutRef.current);
      }
    };
  }, []);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content);

      setCopied(true);
      setCopyError(false);

      if (copyTimeoutRef.current) {
        clearTimeout(copyTimeoutRef.current);
      }

      copyTimeoutRef.current = setTimeout(() => {
        setCopied(false);
        copyTimeoutRef.current = null;
      }, 1500);
    } catch (error) {
      console.error("Failed to copy message:", error);
      setCopyError(true);

      if (copyTimeoutRef.current) {
        clearTimeout(copyTimeoutRef.current);
      }

      copyTimeoutRef.current = setTimeout(() => {
        setCopyError(false);
        copyTimeoutRef.current = null;
      }, 2000);
    }
  };

  return (
    <article
      className={`group flex w-full items-start gap-3 ${
        isAssistant ? "justify-start" : "justify-end"
      }`}
    >
      {/* ASSISTANT AVATAR */}
      {isAssistant && (
        <div
          className="
            mt-1
            flex h-8 w-8 shrink-0
            items-center justify-center
            rounded-xl
            border border-[#D4AF37]/25
            bg-[#D4AF37]/[0.08]
            shadow-[0_0_20px_rgba(212,175,55,0.06)]
          "
          aria-hidden="true"
        >
          <Sparkles
            className="h-4 w-4 text-[#D4AF37]"
            strokeWidth={1.8}
          />
        </div>
      )}

      {/* MESSAGE CONTENT */}
      <div
        className={`
          relative min-w-0
          ${
            isAssistant
              ? "max-w-[92%] sm:max-w-[80%]"
              : "max-w-[88%] sm:max-w-[75%]"
          }
        `}
      >
        {/* ASSISTANT LABEL */}
        {isAssistant && (
          <div className="mb-2 flex items-center gap-2 px-1">
            <span
              className="
                text-[10px] font-semibold
                uppercase tracking-[0.18em]
                text-[#D4AF37]
              "
            >
              ANVIX AI
            </span>

            <span className="h-1 w-1 rounded-full bg-zinc-700" />

            <span className="text-[10px] text-zinc-500">
              Assistant
            </span>
          </div>
        )}

        {/* MESSAGE BUBBLE */}
        <div
          className={`
            relative rounded-2xl
            border
            px-4 py-3
            shadow-[0_8px_30px_rgba(0,0,0,0.14)]
            transition-colors duration-200
            sm:px-5 sm:py-4
            ${
              isAssistant
                ? `
                  rounded-tl-md
                  border-white/[0.09]
                  bg-[#151518]/95
                  text-zinc-200
                  hover:border-white/[0.14]
                `
                : `
                  rounded-tr-md
                  border-[#D4AF37]/20
                  bg-[#292821]/95
                  text-zinc-100
                  hover:border-[#D4AF37]/35
                `
            }
          `}
        >
          {/* MESSAGE TEXT */}
          <div
            className={`
              min-w-0
              whitespace-pre-wrap
              break-words
              [overflow-wrap:anywhere]
              text-[14px]
              leading-[1.8]
              sm:text-[15px]
              ${
                isAssistant
                  ? "selection:bg-[#D4AF37]/25"
                  : "selection:bg-zinc-500/30"
              }
            `}
          >
            {content}
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
                isAssistant ? "right-2" : "left-2"
              }
              -bottom-9
              flex h-7 w-7
              items-center justify-center
              rounded-lg
              border border-white/[0.08]
              bg-[#18181B]
              shadow-lg
              transition-all duration-200
              opacity-100
              sm:opacity-0
              sm:group-hover:opacity-100
              sm:group-focus-within:opacity-100
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
                className={`h-3.5 w-3.5 ${
                  copyError
                    ? "text-red-400"
                    : "text-zinc-400"
                }`}
                aria-hidden="true"
              />
            )}
          </button>
        </div>

        {/* COPY FEEDBACK */}
        {(copied || copyError) && (
          <p
            role="status"
            className={`
              mt-2 px-1 text-[11px]
              ${
                copied
                  ? "text-emerald-400"
                  : "text-red-400"
              }
            `}
          >
            {copied ? "Copied to clipboard" : "Unable to copy message"}
          </p>
        )}
      </div>

      {/* USER AVATAR */}
      {!isAssistant && (
        <div
          className="
            mt-1
            flex h-8 w-8 shrink-0
            items-center justify-center
            rounded-xl
            border border-white/[0.10]
            bg-[#202023]
            text-zinc-400
          "
          aria-hidden="true"
        >
          <UserRound
            className="h-4 w-4"
            strokeWidth={1.8}
          />
        </div>
      )}
    </article>
  );
}