"use client";

import { Paperclip, Bot, LayoutTemplate, ArrowRight } from "lucide-react";

export default function PromptToolbar() {
  return (
    <div className="mt-5 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-zinc-800 bg-[#0D0D0D] p-4">

      <div className="flex flex-wrap items-center gap-3">

        <button className="flex items-center gap-2 rounded-xl border border-zinc-700 px-4 py-2 text-sm text-zinc-300 transition hover:border-[#D4AF37] hover:text-white">
          <Paperclip size={16} />
          Attach
        </button>

        <button className="flex items-center gap-2 rounded-xl border border-zinc-700 px-4 py-2 text-sm text-zinc-300 transition hover:border-[#D4AF37] hover:text-white">
          <Bot size={16} />
          GPT-5
        </button>

        <button className="flex items-center gap-2 rounded-xl border border-zinc-700 px-4 py-2 text-sm text-zinc-300 transition hover:border-[#D4AF37] hover:text-white">
          <LayoutTemplate size={16} />
          Templates
        </button>

      </div>

      <button className="flex items-center gap-2 rounded-xl bg-[#D4AF37] px-6 py-3 font-semibold text-black transition hover:scale-105">
        Generate
        <ArrowRight size={18} />
      </button>

    </div>
  );
}