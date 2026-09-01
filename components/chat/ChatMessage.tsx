"use client";

import { Bot, User, Copy, RotateCcw } from "lucide-react";

type ChatMessageProps = {
  role: "user" | "assistant";
  content: string;
};

export default function ChatMessage({
  role,
  content,
}: ChatMessageProps) {
  const isUser = role === "user";

  return (
    <div
      className={`group w-full border-b border-white/[0.055] ${
        isUser ? "bg-transparent" : "bg-transparent"
      }`}
    >
      <div
        className="
          mx-auto
          flex
          w-full
          max-w-3xl
          gap-3.5
          px-4
          py-5
          sm:gap-4
          sm:px-6
          sm:py-6
        "
      >
        {/* Avatar */}
        <div
          className={`
            mt-0.5
            flex
            h-8
            w-8
            shrink-0
            items-center
            justify-center
            rounded-lg
            border
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
                  rounded-md
                  border
                  border-[#4D4635]/70
                  px-1.5
                  py-0.5
                  text-[9px]
                  font-medium
                  uppercase
                  tracking-[0.08em]
                  text-[#D4AF37]/80
                "
              >
                AI
              </span>
            )}
          </div>

          {/* Content */}
          <div
            className="
              whitespace-pre-wrap
              text-[15px]
              leading-7
              text-zinc-300
              selection:bg-[#D4AF37]/20
            "
          >
            {content}
          </div>

          {/* Actions */}
          {!isUser && (
            <div
              className="
                mt-3
                flex
                items-center
                gap-0.5
                opacity-0
                transition-opacity
                duration-150
                group-hover:opacity-100
              "
            >
              <button
                type="button"
                className="
                  rounded-md
                  p-1.5
                  text-zinc-600
                  transition-colors
                  duration-150
                  hover:bg-white/[0.05]
                  hover:text-zinc-300
                "
                aria-label="Copy response"
              >
                <Copy
                  className="h-3.5 w-3.5"
                  strokeWidth={1.8}
                />
              </button>

              <button
                type="button"
                className="
                  rounded-md
                  p-1.5
                  text-zinc-600
                  transition-colors
                  duration-150
                  hover:bg-white/[0.05]
                  hover:text-zinc-300
                "
                aria-label="Regenerate response"
              >
                <RotateCcw
                  className="h-3.5 w-3.5"
                  strokeWidth={1.8}
                />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}