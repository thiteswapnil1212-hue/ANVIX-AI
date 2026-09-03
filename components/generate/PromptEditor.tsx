"use client";

import {
  Code2,
  CornerDownLeft,
  FileCode2,
  Sparkles,
} from "lucide-react";

interface PromptEditorProps {
  value: string;
  onChange: (value: string) => void;
  maxChars?: number;
  disabled?: boolean;
  placeholder?: string;
  onKeyDown?: (
    event: React.KeyboardEvent<HTMLTextAreaElement>
  ) => void;
}

const DEFAULT_MAX_CHARS = 2200;

export default function PromptEditor({
  value,
  onChange,
  maxChars = DEFAULT_MAX_CHARS,
  disabled = false,
  placeholder = `Describe the application you want to build...

Example:
Build a premium AI workspace for design teams with authentication, project management, collaboration, analytics, and a clean dark interface.

Include the main user flows, important features, and the overall experience you want.`,
  onKeyDown,
}: PromptEditorProps) {
  const characterCount = value.length;
  const remainingChars = Math.max(maxChars - characterCount, 0);

  const usagePercentage = Math.min(
    (characterCount / maxChars) * 100,
    100
  );

  const isNearLimit = remainingChars < 200;
  const hasContent = value.trim().length > 0;

  return (
    <div className="relative overflow-hidden rounded-2xl border border-zinc-800 bg-[#0B0B0D] transition-all duration-200 focus-within:border-[#D4AF37]/35 focus-within:shadow-[0_0_40px_rgba(212,175,55,0.045)]">
      {/* Editor header */}
      <div className="flex items-center justify-between border-b border-zinc-800/70 px-4 py-2.5">
        <div className="flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded-md bg-zinc-800/70">
            <Code2
              className="h-3.5 w-3.5 text-zinc-500"
              strokeWidth={1.7}
              aria-hidden="true"
            />
          </div>

          <span className="text-[10px] font-medium uppercase tracking-[0.12em] text-zinc-600">
            Build prompt
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span
            className={`text-[10px] ${
              isNearLimit
                ? "text-[#D4AF37]"
                : "text-zinc-700"
            }`}
          >
            {characterCount.toLocaleString()} /{" "}
            {maxChars.toLocaleString()}
          </span>
        </div>
      </div>

      {/* Main editor */}
      <div className="relative">
        {/* Decorative editor icon */}
        <div
          aria-hidden="true"
          className="
            pointer-events-none
            absolute
            left-5
            top-5
            z-10
            flex
            h-7
            w-7
            items-center
            justify-center
            rounded-lg
            border
            border-[#D4AF37]/10
            bg-[#D4AF37]/[0.04]
          "
        >
          <Sparkles
            className="h-3.5 w-3.5 text-[#D4AF37]/70"
            strokeWidth={1.7}
          />
        </div>

        <textarea
          id="generate-prompt-editor"
          name="generate-prompt"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={onKeyDown}
          maxLength={maxChars}
          disabled={disabled}
          spellCheck
          autoComplete="off"
          aria-label="Describe the application you want to build"
          className="
            min-h-[260px]
            w-full
            resize-y
            bg-transparent
            px-5
            pb-5
            pt-5
            pl-16
            text-sm
            leading-7
            text-zinc-200
            outline-none
            placeholder:text-zinc-700
            disabled:cursor-not-allowed
            disabled:opacity-50
            sm:min-h-[290px]
            sm:text-[15px]
          "
          placeholder={placeholder}
        />

        {/* Empty editor hint */}
        {!hasContent && !disabled && (
          <div
            aria-hidden="true"
            className="
              pointer-events-none
              absolute
              bottom-5
              left-16
              flex
              items-center
              gap-2
              text-[10px]
              text-zinc-700
            "
          >
            <FileCode2
              className="h-3.5 w-3.5"
              strokeWidth={1.5}
            />

            <span>
              The more context you provide, the better the build.
            </span>
          </div>
        )}
      </div>

      {/* Editor footer */}
      <div className="flex flex-col gap-2 border-t border-zinc-800/70 px-4 py-2.5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <div
            className={`h-1.5 w-1.5 rounded-full ${
              hasContent
                ? "bg-emerald-400"
                : "bg-zinc-700"
            }`}
            aria-hidden="true"
          />

          <span className="text-[10px] text-zinc-600">
            {hasContent
              ? "Prompt ready"
              : "Waiting for your instructions"}
          </span>
        </div>

        <div className="flex items-center gap-2 text-[10px] text-zinc-700">
          <CornerDownLeft
            className="h-3 w-3"
            strokeWidth={1.6}
            aria-hidden="true"
          />

          <span>
            Ctrl / Cmd + Enter to generate
          </span>
        </div>
      </div>

      {/* Character progress */}
      <div
        aria-hidden="true"
        className="absolute inset-x-0 bottom-0 h-px bg-zinc-900"
      >
        <div
          className="
            h-full
            bg-[#D4AF37]/60
            transition-[width]
            duration-300
          "
          style={{
            width: `${usagePercentage}%`,
          }}
        />
      </div>
    </div>
  );
}