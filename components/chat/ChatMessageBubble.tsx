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
        className={`max-w-[80%] rounded-3xl border px-4 py-3 text-sm leading-7 ${
          isAssistant
            ? "border-zinc-800 bg-[#111111] text-zinc-300"
            : "border-[#D4AF37]/20 bg-[#D4AF37]/10 text-white"
        }`}
      >
        {isAssistant ? (
          <div className="mb-2 flex items-center gap-2 text-[#D4AF37]">
            <Sparkles className="h-4 w-4" />
            <span className="text-xs font-semibold uppercase tracking-[0.2em]">Anvix AI</span>
          </div>
        ) : null}
        <p>{content}</p>
      </div>
    </div>
  );
}
