
"use client";

import { useState } from "react";
import { Bot, User, Copy, Check, RotateCcw } from "lucide-react";

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
  const [copied, setCopied] = useState(false);

  // Hide the placeholder bubble; the typing indicator belongs in MessageList.
  const isThinkingPlaceholder =
    !isUser && content.trim().toLowerCase() === "thinking...";

  if (isThinkingPlaceholder) {
    return null;
  }

  async function handleCopy() {
    if (!content.trim()) return;

    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch (error) {
      console.error("Unable to copy message:", error);
    }
  }

  return (
    <div className="group w-full border-b border-white/[0.055] bg-transparent">
      <div
        className="
          mx-auto flex w-full max-w-3xl gap-3.5
          px-4 py-5 sm:gap-4 sm:px-6 sm:py-6
        "
      >
        {/* Avatar */}
        <div
          className={`
            mt-0.5 flex h-8 w-8 shrink-0 items-center
            justify-center rounded-lg border
            ${
              isUser
                ? "border-white/[0.10] bg-white/[0.035]"
                : "border-[#4D4635]/70 bg-[#18181B]/60"
            }
          `}
        >
          {isUser ? (
            <User
              className="h-4 w-4 text-zinc-400"
              strokeWidth={1.8}
            />
          ) : (
            <Bot
              className="h-4 w-4 text-[#D4AF37]"
              strokeWidth={1.8}
            />
          )}
        </div>

        {/* Message */}
        <div className="min-w-0 flex-1">
          {/* Header */}
          <div className="mb-1.5 flex items-center gap-2">
            <span className="text-sm font-medium text-zinc-200">
              {isUser ? "You" : "ANVIX AI"}
            </span>

            {!isUser && (
              <span
                className="
                  rounded-md border border-[#4D4635]/70
                  px-1.5 py-0.5 text-[9px] font-medium
                  uppercase tracking-[0.08em] text-[#D4AF37]/80
                "
              >
                AI
              </span>
            )}
          </div>

          {/* Content */}
          <div
            className="
              whitespace-pre-wrap break-words
              text-[15px] leading-7 text-zinc-300
              selection:bg-[#D4AF37]/20
            "
          >
            {content}
          </div>

          {/* Actions */}
          {!isUser && content.trim() !== "" && (
            <div
              className="
                mt-3 flex items-center gap-0.5
                opacity-100 transition-opacity duration-150
                sm:opacity-0 sm:group-hover:opacity-100
              "
            >
              <button
                type="button"
                onClick={handleCopy}
                className="
                  rounded-md p-1.5 text-zinc-500
                  transition-colors hover:bg-white/[0.05]
                  hover:text-zinc-200
                "
                aria-label={copied ? "Copied response" : "Copy response"}
                title={copied ? "Copied" : "Copy"}
              >
                {copied ? (
                  <Check
                    className="h-3.5 w-3.5 text-emerald-400"
                    strokeWidth={1.8}
                  />
                ) : (
                  <Copy
                    className="h-3.5 w-3.5"
                    strokeWidth={1.8}
                  />
                )}
              </button>

              {onRegenerate && (
                <button
                  type="button"
                  onClick={onRegenerate}
                  className="
                    rounded-md p-1.5 text-zinc-500
                    transition-colors hover:bg-white/[0.05]
                    hover:text-zinc-200
                  "
                  aria-label="Regenerate response"
                  title="Regenerate response"
                >
                  <RotateCcw
                    className="h-3.5 w-3.5"
                    strokeWidth={1.8}
                  />
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}