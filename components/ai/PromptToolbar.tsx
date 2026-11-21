
"use client";

import {
  Paperclip,
  Bot,
  LayoutTemplate,
  ArrowRight,
  LoaderCircle,
  Sparkles,
  ChevronDown,
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
    "group inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.025] px-3.5 py-2.5 text-sm font-medium text-zinc-300 transition-all duration-200 hover:border-[#D4AF37]/40 hover:bg-[#D4AF37]/[0.06] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D4AF37] active:scale-[0.98]";

  return (
    <div className="relative mt-5 overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0B0B0C] p-3 shadow-[0_12px_40px_rgba(0,0,0,0.2)] sm:p-4">
      {/* Subtle gold accent */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-[#D4AF37]/50 to-transparent"
      />

      <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        {/* Tool actions */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onAttach}
            className={buttonClass}
            aria-label="Attach a file"
            title="Attach a file"
          >
            <Paperclip
              size={16}
              className="transition-transform duration-200 group-hover:-rotate-12"
            />
            <span>Attach</span>
          </button>

          <button
            type="button"
            onClick={onModelSelect}
            className={buttonClass}
            aria-label="Choose AI model"
            title="Choose AI model"
          >
            <span className="flex h-6 w-6 items-center justify-center rounded-lg border border-[#D4AF37]/20 bg-[#D4AF37]/10">
              <Bot size={15} className="text-[#D4AF37]" />
            </span>

            <span>GPT-5</span>
            <ChevronDown
              size={14}
              className="text-zinc-500 transition-transform duration-200 group-hover:text-[#D4AF37]"
            />
          </button>

          <button
            type="button"
            onClick={onTemplates}
            className={buttonClass}
            aria-label="Browse prompt templates"
            title="Browse prompt templates"
          >
            <LayoutTemplate
              size={16}
              className="transition-transform duration-200 group-hover:-translate-y-0.5"
            />
            <span>Templates</span>
          </button>
        </div>

        {/* Divider on mobile */}
        <div
          aria-hidden="true"
          className="h-px w-full bg-white/[0.06] sm:hidden"
        />

        {/* Generate action */}
        <button
          type="button"
          onClick={onGenerate}
          disabled={isGenerating}
          aria-live="polite"
          className="group relative inline-flex min-h-12 w-full items-center justify-center gap-2.5 overflow-hidden rounded-xl bg-[#D4AF37] px-5 py-3 text-sm font-bold text-black shadow-[0_4px_20px_rgba(212,175,55,0.12)] transition-all duration-200 hover:bg-[#E5C45B] hover:shadow-[0_6px_26px_rgba(212,175,55,0.2)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D4AF37] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0B0B0C] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 disabled:shadow-none sm:w-auto sm:min-w-[150px]"
        >
          {!isGenerating && (
            <span
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent transition-transform duration-700 group-hover:translate-x-full"
            />
          )}

          <span className="relative inline-flex items-center gap-2">
            {isGenerating ? (
              <>
                <LoaderCircle size={17} className="animate-spin" />
                Generating
              </>
            ) : (
              <>
                <Sparkles size={16} />
                Generate
                <ArrowRight
                  size={17}
                  className="transition-transform duration-200 group-hover:translate-x-1"
                />
              </>
            )}
          </span>
        </button>
      </div>

      {/* Footer hint */}
      <div className="mt-3 hidden items-center justify-between border-t border-white/[0.06] pt-3 sm:flex">
        <p className="text-xs text-zinc-600">
          Build something amazing with ANVIX AI
        </p>

        <div className="flex items-center gap-1.5 text-xs text-zinc-600">
          <Sparkles size={12} className="text-[#D4AF37]/70" />
          <span>AI-powered generation</span>
        </div>
      </div>
    </div>
  );
}