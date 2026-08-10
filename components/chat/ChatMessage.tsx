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
      className={`group w-full border-b border-zinc-900/80 ${
        isUser ? "bg-transparent" : "bg-[#0D0D0F]"
      }`}
    >
      <div className="mx-auto flex w-full max-w-3xl gap-4 px-4 py-6 sm:px-6">
        <div
          className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border ${
            isUser
              ? "border-zinc-700 bg-zinc-800"
              : "border-[#4D4635] bg-[#18181B]"
          }`}
        >
          {isUser ? (
            <User className="h-4 w-4 text-zinc-300" />
          ) : (
            <Bot className="h-4 w-4 text-[#D4AF37]" />
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="mb-1 flex items-center gap-2">
            <span className="text-sm font-medium text-white">
              {isUser ? "You" : "ANVIX AI"}
            </span>

            {!isUser && (
              <span className="rounded-md border border-[#4D4635] px-1.5 py-0.5 text-[10px] uppercase tracking-wider text-[#D4AF37]">
                AI
              </span>
            )}
          </div>

          <div className="whitespace-pre-wrap text-[15px] leading-7 text-zinc-300">
            {content}
          </div>

          {!isUser && (
            <div className="mt-4 flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
              <button
                type="button"
                className="rounded-md p-2 text-zinc-500 transition hover:bg-zinc-800 hover:text-zinc-200"
                aria-label="Copy response"
              >
                <Copy className="h-4 w-4" />
              </button>

              <button
                type="button"
                className="rounded-md p-2 text-zinc-500 transition hover:bg-zinc-800 hover:text-zinc-200"
                aria-label="Regenerate response"
              >
                <RotateCcw className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}