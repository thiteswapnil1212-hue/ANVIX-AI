"use client";

import { useState } from "react";
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

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content);

      setCopied(true);

      window.setTimeout(() => {
        setCopied(false);
      }, 1500);
    } catch (error) {
      console.error("Failed to copy message:", error);
    }
  };

  return (
    <article
      className={`
        group
        flex
        w-full
        gap-3
        ${
          isAssistant
            ? "items-start justify-start"
            : "items-start justify-end"
        }
      `}
    >
      {/* =====================================================
          ASSISTANT AVATAR
      ===================================================== */}
      {isAssistant && (
        <div
          className="
            mt-1
            flex
            h-8
            w-8
            shrink-0
            items-center
            justify-center
            rounded-lg
            border
            border-[#D4AF37]/20
            bg-[#D4AF37]/[0.07]
            shadow-[0_4px_18px_rgba(212,175,55,0.06)]
          "
          aria-hidden="true"
        >
          <Sparkles
            className="h-4 w-4 text-[#D4AF37]"
            strokeWidth={1.8}
          />
        </div>
      )}

      {/* =====================================================
          MESSAGE CONTENT
      ===================================================== */}
      <div
        className={`
          relative
          min-w-0
          ${
            isAssistant
              ? "max-w-[88%] sm:max-w-[78%]"
              : "max-w-[85%] sm:max-w-[72%]"
          }
        `}
      >
        {/* AI HEADER */}
        {isAssistant && (
          <div className="mb-1.5 flex items-center gap-2 px-1">
            <span
              className="
                text-[10px]
                font-semibold
                uppercase
                tracking-[0.16em]
                text-[#D4AF37]
              "
            >
              ANVIX AI
            </span>

            <span className="h-1 w-1 rounded-full bg-zinc-700" />

            <span className="text-[10px] text-zinc-600">
              Assistant
            </span>
          </div>
        )}

        {/* =================================================
            BUBBLE
        ================================================= */}
        <div
          className={`
            relative
            rounded-2xl
            border
            px-4
            py-3.5
            shadow-[0_6px_25px_rgba(0,0,0,0.12)]
            transition-all
            duration-200
            ${
              isAssistant
                ? `
                  rounded-tl-md
                  border-[#2F2F33]
                  bg-[#151518]
                  text-zinc-200
                  hover:border-[#3F3F46]
                `
                : `
                  rounded-tr-md
                  border-[#4A4638]
                  bg-[#292821]
                  text-zinc-100
                  hover:border-[#5A5545]
                `
            }
          `}
        >
          {/* MESSAGE TEXT */}
          <div
            className="
              whitespace-pre-wrap
              break-words
              text-[14px]
              leading-7
              [overflow-wrap:anywhere]
            "
          >
            {content}
          </div>

          {/* =================================================
              COPY BUTTON
          ================================================= */}
          <button
            type="button"
            onClick={handleCopy}
            aria-label={
              copied
                ? "Message copied"
                : "Copy message"
            }
            title={copied ? "Copied" : "Copy message"}
            className={`
              absolute
              ${
                isAssistant
                  ? "right-2"
                  : "left-2"
              }
              -bottom-9
              flex
              h-7
              w-7
              items-center
              justify-center
              rounded-lg
              border
              border-zinc-800
              bg-[#18181B]
              text-zinc-600
              opacity-0
              shadow-lg
              transition-all
              duration-200
              group-hover:opacity-100
              hover:border-zinc-700
              hover:bg-[#222225]
              hover:text-zinc-300
            `}
          >
            {copied ? (
              <Check className="h-3.5 w-3.5 text-emerald-400" />
            ) : (
              <Copy className="h-3.5 w-3.5" />
            )}
          </button>
        </div>
      </div>

      {/* =====================================================
          USER AVATAR
      ===================================================== */}
      {!isAssistant && (
        <div
          className="
            mt-1
            flex
            h-8
            w-8
            shrink-0
            items-center
            justify-center
            rounded-lg
            border
            border-zinc-700
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