"use client";

import {
  ArrowRight,
  Keyboard,
  Sparkles,
} from "lucide-react";

interface PromptBuilderProps {
  value: string;
  maxChars: number;
  onChange: (value: string) => void;
  onGenerate: () => void;
  onKeyDown: (
    event: React.KeyboardEvent<HTMLTextAreaElement>
  ) => void;
  isSubmitting?: boolean;
  canGenerate?: boolean;
}

export default function PromptBuilder({
  value,
  maxChars,
  onChange,
  onGenerate,
  onKeyDown,
  isSubmitting = false,
  canGenerate = false,
}: PromptBuilderProps) {
  const remainingChars = maxChars - value.length;
  const hasPrompt = value.trim().length > 0;

  return (
    <section
      aria-labelledby="prompt-builder-title"
      className="
        relative
        overflow-hidden
        rounded-3xl
        border
        border-zinc-800/80
        bg-[#111113]
        shadow-2xl
        shadow-black/20
      "
    >
      {/* Ambient glow */}
      <div
        aria-hidden="true"
        className="
          pointer-events-none
          absolute
          -right-40
          -top-40
          h-80
          w-80
          rounded-full
          bg-[#D4AF37]/[0.045]
          blur-[100px]
        "
      />

      {/* Header */}
      <div
        className="
          relative
          flex
          flex-col
          gap-4
          border-b
          border-zinc-800/70
          px-5
          py-5
          sm:flex-row
          sm:items-center
          sm:justify-between
          sm:px-7
        "
      >
        <div>
          <div className="flex items-center gap-2">
            <div
              className="
                flex
                h-7
                w-7
                items-center
                justify-center
                rounded-lg
                bg-[#D4AF37]/[0.08]
              "
            >
              <Sparkles
                className="h-3.5 w-3.5 text-[#D4AF37]"
                strokeWidth={1.8}
                aria-hidden="true"
              />
            </div>

            <h2
              id="prompt-builder-title"
              className="text-sm font-semibold text-white"
            >
              Describe your idea
            </h2>
          </div>

          <p className="mt-2 text-xs text-zinc-600">
            Tell ANVIX what you want to build. Be as specific as
            you want.
          </p>
        </div>

        {/* Keyboard shortcut */}
        <div
          className="
            hidden
            items-center
            gap-2
            rounded-full
            border
            border-zinc-800
            bg-[#0D0D0F]
            px-3
            py-1.5
            sm:flex
          "
        >
          <Keyboard
            className="h-3.5 w-3.5 text-zinc-600"
            aria-hidden="true"
          />

          <span className="text-[10px] text-zinc-600">
            Ctrl/Cmd + Enter
          </span>
        </div>
      </div>

      {/* Prompt editor */}
      <div className="relative p-5 sm:p-7">
        <div
          className={`
            overflow-hidden
            rounded-2xl
            border
            bg-[#0B0B0D]
            transition-all
            duration-200

            ${
              hasPrompt
                ? `
                  border-[#D4AF37]/35
                  shadow-[0_0_35px_rgba(212,175,55,0.045)]
                `
                : "border-zinc-800"
            }
          `}
        >
          <textarea
            id="generate-prompt"
            name="prompt"
            value={value}
            onChange={(event) =>
              onChange(
                event.target.value.slice(0, maxChars)
              )
            }
            onKeyDown={onKeyDown}
            rows={10}
            maxLength={maxChars}
            disabled={isSubmitting}
            placeholder="Example: Build a premium AI workspace for design teams with multi-project views, team collaboration, analytics, authentication, billing, and a clean dark interface..."
            aria-label="Describe your application"
            className="
              min-h-[240px]
              w-full
              resize-y
              bg-transparent
              px-5
              py-5
              text-sm
              leading-7
              text-white
              outline-none
              placeholder:text-zinc-700
              disabled:cursor-not-allowed
              disabled:opacity-60
              sm:min-h-[260px]
              sm:text-base
            "
          />

          {/* Editor footer */}
          <div
            className="
              flex
              flex-col
              gap-2
              border-t
              border-zinc-800/70
              px-4
              py-3
              sm:flex-row
              sm:items-center
              sm:justify-between
            "
          >
            <div className="flex items-center gap-2">
              <span
                className={`
                  h-1.5
                  w-1.5
                  rounded-full
                  ${
                    hasPrompt
                      ? "bg-[#D4AF37]"
                      : "bg-zinc-700"
                  }
                `}
                aria-hidden="true"
              />

              <span className="text-[10px] text-zinc-600">
                {hasPrompt
                  ? "Prompt ready"
                  : "Start describing your idea"}
              </span>
            </div>

            <span
              className={`
                text-[10px]
                ${
                  remainingChars < 200
                    ? "text-[#D4AF37]"
                    : "text-zinc-700"
                }
              `}
            >
              {value.length.toLocaleString()} /{" "}
              {maxChars.toLocaleString()}
            </span>
          </div>
        </div>

        {/* Action area */}
        <div
          className="
            mt-5
            flex
            flex-col
            gap-4
            sm:flex-row
            sm:items-center
            sm:justify-between
          "
        >
          <div>
            <p className="text-xs text-zinc-600">
              Describe the product, users, features and
              experience you have in mind.
            </p>

            <p className="mt-1 text-[10px] text-zinc-700">
              You can refine the generated workspace later.
            </p>
          </div>

          <button
            type="button"
            onClick={onGenerate}
            disabled={!canGenerate}
            className="
              group
              inline-flex
              w-full
              shrink-0
              items-center
              justify-center
              gap-2
              rounded-xl
              bg-[#D4AF37]
              px-5
              py-3
              text-sm
              font-semibold
              text-black
              shadow-lg
              shadow-[#D4AF37]/10
              transition-all
              duration-200
              hover:bg-[#E2C259]
              hover:shadow-[0_10px_30px_rgba(212,175,55,0.16)]
              active:scale-[0.98]
              disabled:cursor-not-allowed
              disabled:opacity-35
              disabled:shadow-none
              sm:w-auto
            "
          >
            {isSubmitting ? (
              <>
                <span
                  className="
                    h-4
                    w-4
                    animate-spin
                    rounded-full
                    border-2
                    border-black/30
                    border-t-black
                  "
                  aria-hidden="true"
                />

                Generating...
              </>
            ) : (
              <>
                <Sparkles
                  className="h-4 w-4"
                  strokeWidth={2}
                  aria-hidden="true"
                />

                Generate app

                <ArrowRight
                  className="
                    h-4
                    w-4
                    transition-transform
                    duration-200
                    group-hover:translate-x-0.5
                  "
                  aria-hidden="true"
                />
              </>
            )}
          </button>
        </div>
      </div>
    </section>
  );
}