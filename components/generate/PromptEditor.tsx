"use client";

import {
  Eraser,
  Keyboard,
  Sparkles,
  WandSparkles,
} from "lucide-react";

interface PromptToolbarProps {
  onEnhance?: () => void;
  onClear?: () => void;
  canEnhance?: boolean;
  canClear?: boolean;
}

export default function PromptToolbar({
  onEnhance,
  onClear,
  canEnhance = true,
  canClear = false,
}: PromptToolbarProps) {
  return (
    <div
      className="
        flex
        flex-col
        gap-3
        border-b
        border-zinc-800/70
        px-4
        py-3
        sm:flex-row
        sm:items-center
        sm:justify-between
      "
    >
      {/* Left side */}
      <div className="flex min-w-0 items-center gap-2">
        {/* AI indicator */}
        <div
          className="
            flex
            h-7
            w-7
            shrink-0
            items-center
            justify-center
            rounded-lg
            border
            border-[#D4AF37]/15
            bg-[#D4AF37]/[0.06]
          "
        >
          <Sparkles
            className="h-3.5 w-3.5 text-[#D4AF37]"
            strokeWidth={1.8}
            aria-hidden="true"
          />
        </div>

        <div className="min-w-0">
          <p className="truncate text-xs font-medium text-zinc-300">
            AI Builder
          </p>

          <p className="hidden text-[10px] text-zinc-600 sm:block">
            Natural language → structured build
          </p>
        </div>
      </div>

      {/* Right actions */}
      <div className="flex items-center gap-1.5">
        {/* Enhance */}
        <button
          type="button"
          onClick={onEnhance}
          disabled={!canEnhance || !onEnhance}
          title="Enhance prompt"
          className="
            group
            inline-flex
            h-8
            items-center
            gap-1.5
            rounded-lg
            border
            border-zinc-800
            bg-[#0D0D0F]
            px-2.5
            text-[11px]
            font-medium
            text-zinc-400
            transition-all
            duration-200
            hover:border-[#D4AF37]/25
            hover:bg-[#D4AF37]/[0.04]
            hover:text-[#D4AF37]
            disabled:cursor-not-allowed
            disabled:opacity-40
          "
        >
          <WandSparkles
            className="
              h-3.5
              w-3.5
              transition-transform
              duration-200
              group-hover:scale-105
            "
            strokeWidth={1.7}
            aria-hidden="true"
          />

          <span className="hidden xs:inline sm:inline">
            Enhance
          </span>
        </button>

        {/* Clear */}
        <button
          type="button"
          onClick={onClear}
          disabled={!canClear || !onClear}
          title="Clear prompt"
          className="
            inline-flex
            h-8
            items-center
            gap-1.5
            rounded-lg
            border
            border-zinc-800
            bg-[#0D0D0F]
            px-2.5
            text-[11px]
            font-medium
            text-zinc-500
            transition-all
            duration-200
            hover:border-zinc-700
            hover:bg-[#151517]
            hover:text-zinc-300
            disabled:cursor-not-allowed
            disabled:opacity-30
          "
        >
          <Eraser
            className="h-3.5 w-3.5"
            strokeWidth={1.7}
            aria-hidden="true"
          />

          <span className="hidden sm:inline">
            Clear
          </span>
        </button>

        {/* Keyboard shortcut */}
        <div
          className="
            ml-1
            hidden
            h-8
            items-center
            gap-1.5
            rounded-lg
            border
            border-zinc-800/80
            bg-[#0B0B0D]
            px-2.5
            text-zinc-600
            md:flex
          "
          title="Keyboard shortcut"
        >
          <Keyboard
            className="h-3 w-3"
            strokeWidth={1.7}
            aria-hidden="true"
          />

          <span className="text-[10px]">
            Ctrl + Enter
          </span>
        </div>
      </div>
    </div>
  );
}