import { Sparkles } from "lucide-react";

interface ChatMessageBubbleProps {
  role: "assistant" | "user";
  content: string;
}

export default function ChatMessageBubble({ role, content }: ChatMessageBubbleProps) {
  const isAssistant = role === "assistant";

  return (
    <div className={`flex ${isAssistant ? "justify-start" : "justify-end"}`}>
      <div
        className={`max-w-[82%] rounded-[18px] border px-4 py-4 text-sm leading-7 ${
          isAssistant
            ? "border-[#3F3F46] bg-[#111111] text-zinc-200"
            : "border-[#3F3F46] bg-[#1F1F23] text-white"
        }`}
      >
        {isAssistant ? (
          <div className="mb-3 flex items-center gap-2 text-[#D4AF37]">
            <Sparkles className="h-4 w-4" />
            <span className="text-[11px] font-semibold uppercase tracking-[0.24em]">
              ANVIX AI
            </span>
          </div>
        ) : null}
        <p className="whitespace-pre-wrap">{content}</p>
      </div>
    </div>
  );
}
