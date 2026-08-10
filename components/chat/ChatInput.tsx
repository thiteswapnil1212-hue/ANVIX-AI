"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowUp, Paperclip } from "lucide-react";

export default function ChatInput() {
  const [value, setValue] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    if (!textareaRef.current) return;
    textareaRef.current.style.height = "auto";
    textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 128)}px`;
  }, [value]);

  const handleSubmit = () => {
    if (!value.trim()) return;
    setValue("");
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="mx-auto w-full max-w-3xl">
      <form
        onSubmit={(event) => {
          event.preventDefault();
          handleSubmit();
        }}
        className="grid gap-3"
      >
        <div className="flex items-end gap-2 rounded-[12px] border border-[#3F3F46] bg-[#18181B] px-3 py-3 shadow-[0_1px_0_rgba(255,255,255,0.03)]">
          <button
            type="button"
            className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-[#3F3F46] text-zinc-400 transition hover:border-[#D4AF37] hover:text-white"
            aria-label="Attach file"
          >
            <Paperclip className="h-5 w-5" />
          </button>

          <textarea
            ref={textareaRef}
            value={value}
            onChange={(event) => setValue(event.target.value)}
            onKeyDown={handleKeyDown}
            rows={1}
            placeholder="Message ANVIX AI..."
            className="min-h-[48px] max-h-[128px] flex-1 resize-none overflow-hidden bg-transparent text-sm leading-6 text-white placeholder:text-zinc-500 focus:outline-none"
            aria-label="Message ANVIX AI"
          />

          <button
            type="submit"
            className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-[#D4AF37] text-black transition hover:bg-[#E5C158] disabled:cursor-not-allowed disabled:opacity-70"
            disabled={!value.trim()}
            aria-label="Send message"
          >
            <ArrowUp className="h-4 w-4" />
          </button>
        </div>
      </form>
    </div>
  );
}
