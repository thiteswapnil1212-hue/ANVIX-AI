
"use client";

import {
  Paperclip,
  Bot,
  LayoutTemplate,
  ArrowRight,
} from "lucide-react";

type PromptToolbarProps = {
  onAttach?: () => void;
  onModelSelect?: () => void;
  onTemplates?: () => void;
  onGenerate?: () => void;
  isGenerating?: boolean;
};

export default function PromptToolbar({
  onAttach,
  onModelSelect,
  onTemplates,
  onGenerate,
  isGenerating = false,
}: PromptToolbarProps) {
  const buttonClass =
    "inline-flex items-center justify-center gap-2 rounded-xl border border-zinc-800 bg-zinc-900/60 px-3.5 py-2.5 text-sm font-medium text-zinc-300 transition-all duration-200 hover:border-[#D4AF37]/50 hover:bg-[#D4AF37]/5 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D4AF37]";

  return (
    <div className="mt-5 flex flex-col gap-3 rounded-2xl border border-zinc-800/80 bg-[#0D0D0D] p-3 sm:flex-row sm:items-center sm:justify-between sm:p-4">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={onAttach}
          className={buttonClass}
        >
          <Paperclip size={16} />
          Attach
        </button>

        <button
          type="button"
          onClick={onModelSelect}
          className={buttonClass}
        >
          <Bot size={16} className="text-[#D4AF37]" />
          GPT-5
        </button>

        <button
          type="button"
          onClick={onTemplates}
          className={buttonClass}
        >
          <LayoutTemplate size={16} />
          Templates
        </button>
      </div>

      <button
        type="button"
        onClick={onGenerate}
        disabled={isGenerating}
        className="group inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#D4AF37] px-5 py-3 text-sm font-semibold text-black transition-all duration-200 hover:bg-[#E5C45B] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D4AF37] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0D0D0D] disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
      >
        {isGenerating ? "Generating..." : "Generate"}

        {!isGenerating && (
          <ArrowRight
            size={17}
            className="transition-transform duration-200 group-hover:translate-x-1"
          />
        )}
      </button>
    </div>
  );
}