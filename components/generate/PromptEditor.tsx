"use client";

import { useMemo } from "react";
import {
  ArrowRight,
  Check,
  Command,
  Loader2,
  Sparkles,
} from "lucide-react";

interface PromptEditorProps {
  value: string;
  maxLength: number;
  isSubmitting: boolean;
  onChange: (value: string) => void;
  onGenerate: () => void;
}

export default function PromptEditor({
  value,
  maxLength,
  isSubmitting,
  onChange,
  onGenerate,
}: PromptEditorProps) {
  const trimmedValue = value.trim();

  const remainingChars = maxLength - value.length;

  const canGenerate = useMemo(
    () => trimmedValue.length > 0 && !isSubmitting,
    [trimmedValue, isSubmitting]
  );

  const characterStatus = useMemo(() => {
    if (remainingChars <= 100) {
      return "text-red-400";
    }

    if (remainingChars <= 300) {
      return "text-[#D4AF37]";
    }

    return "text-zinc-600";
  }, [remainingChars]);

  function handleKeyDown(
    event: React.KeyboardEvent<HTMLTextAreaElement>
  ) {
    if (
      event.key === "Enter" &&
      (event.metaKey || event.ctrlKey)
    ) {
      event.preventDefault();

      if (canGenerate) {
        onGenerate();
      }
    }
  }

  return (
    <section
      aria-labelledby="prompt-editor-title"
      className="
        relative
        overflow-hidden
        rounded-[28px]
        border
        border-zinc-800/80
        bg-[#111113]
        shadow-[0_20px_60px_rgba(0,0,0,0.18)]
      "
    >
      {/* Ambient glow */}
      <div
        aria-hidden="true"
        className="
          pointer-events-none
          absolute
          -right-32
          -top-32
          h-72
          w-72
          rounded-full
          bg-[#D4AF37]/[0.045]
          blur-[100px]
        "
      />

      <div className="relative p-5 sm:p-7">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2.5">
              <div
                className="
                  flex
                  h-8
                  w-8
                  shrink-0
                  items-center
                  justify-center
                  rounded-lg
                  border
                  border-[#D4AF37]/15
                  bg-[#D4AF37]/[0.07]
                "
              >
                <Sparkles
                  className="h-3.5 w-3.5 text-[#D4AF37]"
                  aria-hidden="true"
                />
              </div>

              <h2
                id="prompt-editor-title"
                className="
                  text-sm
                  font-semibold
                  tracking-tight
                  text-white
                "
              >
                Describe your idea
              </h2>
            </div>

            <p className="mt-2 text-xs leading-5 text-zinc-500">
              Tell ANVIX what you want to build. The more context
              you provide, the better the generated workspace.
            </p>
          </div>

          {/* Keyboard shortcut */}
          <div
            className="
              hidden
              shrink-0
              items-center
              gap-2
              rounded-lg
              border
              border-zinc-800
              bg-[#0D0D0F]
              px-2.5
              py-1.5
              sm:flex
            "
            title="Keyboard shortcut"
          >
            <Command
              className="h-3 w-3 text-zinc-600"
              aria-hidden="true"
            />

            <span className="text-[10px] font-medium text-zinc-600">
              Enter
            </span>
          </div>
        </div>

        {/* Editor */}
        <div
          className={`
            relative
            mt-6
            overflow-hidden
            rounded-2xl
            border
            bg-[#0B0B0D]
            transition-all
            duration-200
            ${
              trimmedValue
                ? "border-[#D4AF37]/35 shadow-[0_0_35px_rgba(212,175,55,0.045)]"
                : "border-zinc-800"
            }
          `}
        >
          {/* Editor label */}
          <div
            className="
              flex
              items-center
              justify-between
              border-b
              border-zinc-800/70
              px-4
              py-2.5
            "
          >
            <div className="flex items-center gap-2">
              <span
                className={`
                  h-1.5
                  w-1.5
                  rounded-full
                  ${
                    trimmedValue
                      ? "bg-[#D4AF37] shadow-[0_0_8px_rgba(212,175,55,0.6)]"
                      : "bg-zinc-700"
                  }
                `}
              />

              <span className="text-[10px] font-medium uppercase tracking-[0.12em] text-zinc-600">
                Prompt
              </span>
            </div>

            <span className="text-[10px] text-zinc-700">
              AI Builder
            </span>
          </div>

          <textarea
            id="generate-prompt"
            name="prompt"
            value={value}
            onChange={(event) => onChange(event.target.value)}
            onKeyDown={handleKeyDown}
            maxLength={maxLength}
            rows={10}
            spellCheck
            autoComplete="off"
            aria-label="Describe the application you want to build"
            aria-describedby="prompt-help prompt-counter"
            placeholder={`Build a premium AI workspace for design teams with authentication, multi-project views, collaboration, analytics, and a clean dark interface...

You can describe:
• What the product should do
• Who will use it
• Important features
• Integrations
• Preferred design or experience`}
            className="
              block
              min-h-[260px]
              w-full
              resize-y
              bg-transparent
              px-5
              py-5
              text-sm
              leading-7
              text-zinc-100
              outline-none
              placeholder:text-zinc-700
              focus:outline-none
              sm:min-h-[300px]
              sm:text-[15px]
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
            <div
              id="prompt-help"
              className="flex items-center gap-2"
            >
              <Check
                className={`
                  h-3 w-3
                  ${
                    trimmedValue
                      ? "text-[#D4AF37]"
                      : "text-zinc-700"
                  }
                `}
                strokeWidth={2.5}
                aria-hidden="true"
              />

              <span className="text-[10px] text-zinc-600">
                {trimmedValue
                  ? "Prompt ready for generation"
                  : "Start describing your idea"}
              </span>
            </div>

            <span
              id="prompt-counter"
              className={`text-[10px] ${characterStatus}`}
              aria-live="polite"
            >
              {value.length.toLocaleString()} /{" "}
              {maxLength.toLocaleString()}
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
          <div className="flex items-center gap-2">
            <div
              className="
                flex
                h-7
                w-7
                shrink-0
                items-center
                justify-center
                rounded-lg
                bg-zinc-800/70
              "
            >
              <Sparkles
                className="h-3 w-3 text-zinc-500"
                aria-hidden="true"
              />
            </div>

            <p className="text-[11px] leading-5 text-zinc-600">
              Press{" "}
              <span className="text-zinc-400">
                Ctrl/Cmd + Enter
              </span>{" "}
              to generate
            </p>
          </div>

          <button
            type="button"
            onClick={onGenerate}
            disabled={!canGenerate}
            aria-disabled={!canGenerate}
            className="
              group
              inline-flex
              min-h-11
              w-full
              items-center
              justify-center
              gap-2.5
              rounded-xl
              bg-[#D4AF37]
              px-5
              text-sm
              font-semibold
              text-black
              shadow-[0_8px_25px_rgba(212,175,55,0.10)]
              transition-all
              duration-200
              hover:bg-[#E3C45F]
              hover:shadow-[0_10px_35px_rgba(212,175,55,0.16)]
              active:scale-[0.985]
              disabled:cursor-not-allowed
              disabled:opacity-35
              disabled:shadow-none
              sm:w-auto
            "
          >
            {isSubmitting ? (
              <>
                <Loader2
                  className="h-4 w-4 animate-spin"
                  aria-hidden="true"
                />

                <span>Generating workspace...</span>
              </>
            ) : (
              <>
                <Sparkles
                  className="h-4 w-4"
                  aria-hidden="true"
                />

                <span>Generate workspace</span>

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