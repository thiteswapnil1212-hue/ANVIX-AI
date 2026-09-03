"use client";

import {
  Check,
  Circle,
  Loader2,
  Sparkles,
} from "lucide-react";

interface GenerateProgressProps {
  currentStep?: number;
}

const steps = [
  {
    title: "Understanding your idea",
    description: "Analyzing your product requirements",
  },
  {
    title: "Planning architecture",
    description: "Preparing the application structure",
  },
  {
    title: "Building workspace",
    description: "Generating your initial workspace",
  },
  {
    title: "Finalizing experience",
    description: "Polishing the generated application",
  },
];

export default function GenerateProgress({
  currentStep = 2,
}: GenerateProgressProps) {
  const safeStep = Math.min(
    Math.max(currentStep, 0),
    steps.length
  );

  return (
    <section
      aria-live="polite"
      aria-labelledby="generation-progress-title"
      className="
        relative
        overflow-hidden
        rounded-3xl
        border
        border-[#D4AF37]/15
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
          -right-32
          -top-32
          h-64
          w-64
          rounded-full
          bg-[#D4AF37]/[0.06]
          blur-[90px]
        "
      />

      <div className="relative p-5 sm:p-6">

        {/* Header */}
        <div className="flex items-start gap-4">
          <div
            className="
              flex
              h-11
              w-11
              shrink-0
              items-center
              justify-center
              rounded-xl
              border
              border-[#D4AF37]/20
              bg-[#D4AF37]/[0.08]
            "
          >
            <Sparkles
              className="h-5 w-5 text-[#D4AF37]"
              strokeWidth={1.8}
              aria-hidden="true"
            />
          </div>

          <div className="min-w-0">
            <h2
              id="generation-progress-title"
              className="text-sm font-semibold text-white"
            >
              ANVIX is building your workspace
            </h2>

            <p className="mt-1 text-xs leading-5 text-zinc-600">
              We're turning your idea and configuration into
              a structured application.
            </p>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mt-6">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-[10px] font-medium text-zinc-500">
              Generation progress
            </span>

            <span className="text-[10px] font-medium text-[#D4AF37]">
              {Math.round(
                (safeStep / steps.length) * 100
              )}
              %
            </span>
          </div>

          <div
            className="
              h-1
              overflow-hidden
              rounded-full
              bg-zinc-800
            "
          >
            <div
              className="
                h-full
                rounded-full
                bg-[#D4AF37]
                transition-all
                duration-500
              "
              style={{
                width: `${
                  (safeStep / steps.length) * 100
                }%`,
              }}
            />
          </div>
        </div>

        {/* Steps */}
        <div className="mt-6 space-y-3">
          {steps.map((step, index) => {
            const isComplete = index < safeStep - 1;
            const isCurrent = index === safeStep - 1;

            return (
              <div
                key={step.title}
                className="
                  flex
                  items-center
                  gap-3
                  rounded-xl
                  border
                  border-zinc-800/70
                  bg-[#0D0D0F]/70
                  px-3
                  py-3
                "
              >
                {/* Step indicator */}
                <div
                  className={`
                    flex
                    h-8
                    w-8
                    shrink-0
                    items-center
                    justify-center
                    rounded-lg
                    border

                    ${
                      isComplete
                        ? `
                          border-emerald-500/20
                          bg-emerald-500/[0.08]
                        `
                        : isCurrent
                          ? `
                            border-[#D4AF37]/20
                            bg-[#D4AF37]/[0.08]
                          `
                          : `
                            border-zinc-800
                            bg-zinc-900/50
                          `
                    }
                  `}
                >
                  {isComplete ? (
                    <Check
                      className="h-3.5 w-3.5 text-emerald-400"
                      strokeWidth={2.5}
                      aria-hidden="true"
                    />
                  ) : isCurrent ? (
                    <Loader2
                      className="
                        h-3.5
                        w-3.5
                        animate-spin
                        text-[#D4AF37]
                      "
                      strokeWidth={2}
                      aria-hidden="true"
                    />
                  ) : (
                    <Circle
                      className="h-3 w-3 text-zinc-700"
                      strokeWidth={1.8}
                      aria-hidden="true"
                    />
                  )}
                </div>

                {/* Step content */}
                <div className="min-w-0 flex-1">
                  <p
                    className={`
                      text-xs
                      font-medium
                      ${
                        isComplete || isCurrent
                          ? "text-zinc-300"
                          : "text-zinc-600"
                      }
                    `}
                  >
                    {step.title}
                  </p>

                  <p className="mt-0.5 text-[10px] text-zinc-700">
                    {step.description}
                  </p>
                </div>

                {/* Status */}
                <div className="shrink-0">
                  {isComplete && (
                    <span className="text-[9px] font-medium text-emerald-400/70">
                      Done
                    </span>
                  )}

                  {isCurrent && (
                    <span className="text-[9px] font-medium text-[#D4AF37]">
                      Working
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div
          className="
            mt-5
            flex
            items-center
            gap-2
            rounded-xl
            border
            border-zinc-800/60
            bg-[#0D0D0F]/50
            px-3
            py-2.5
          "
        >
          <Sparkles
            className="h-3 w-3 text-[#D4AF37]/70"
            aria-hidden="true"
          />

          <p className="text-[10px] text-zinc-700">
            This usually takes a few moments. Please don't
            close the page.
          </p>
        </div>
      </div>
    </section>
  );
}