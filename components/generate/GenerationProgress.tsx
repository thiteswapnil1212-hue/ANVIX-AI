"use client";

import {
  Check,
  Circle,
  Loader2,
  Sparkles,
} from "lucide-react";

interface GenerateProgressProps {
  currentStep?: number;
  completed?: boolean;
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
  currentStep = 1,
  completed = false,
}: GenerateProgressProps) {
  const safeStep = Math.min(
    Math.max(currentStep, 0),
    steps.length
  );

  const progress = completed
    ? 100
    : Math.min(
        Math.round((safeStep / steps.length) * 100),
        100
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

      <div
        aria-hidden="true"
        className="
          absolute
          inset-x-0
          top-0
          h-px
          bg-gradient-to-r
          from-transparent
          via-[#D4AF37]/30
          to-transparent
        "
      />

      <div className="relative p-5 sm:p-6 lg:p-7">
        {/* Header */}
        <div
          className="
            flex
            flex-col
            gap-4
            sm:flex-row
            sm:items-center
            sm:justify-between
          "
        >
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
                className="text-sm font-semibold text-white sm:text-base"
              >
                {completed
                  ? "Your workspace is ready"
                  : "ANVIX is building your workspace"}
              </h2>

              <p className="mt-1 text-xs leading-5 text-zinc-600">
                {completed
                  ? "Your initial application has been prepared successfully."
                  : "We're turning your idea and configuration into a structured application."}
              </p>
            </div>
          </div>

          {/* Percentage */}
          <div
            className="
              flex
              shrink-0
              items-center
              gap-2
              self-start
              rounded-full
              border
              border-zinc-800
              bg-[#0D0D0F]
              px-3
              py-1.5
              sm:self-center
            "
          >
            {!completed && (
              <span
                className="
                  h-1.5
                  w-1.5
                  animate-pulse
                  rounded-full
                  bg-[#D4AF37]
                "
                aria-hidden="true"
              />
            )}

            {completed && (
              <Check
                className="h-3 w-3 text-emerald-400"
                strokeWidth={2.5}
                aria-hidden="true"
              />
            )}

            <span
              className={`
                text-[10px]
                font-medium
                ${
                  completed
                    ? "text-emerald-400"
                    : "text-[#D4AF37]"
                }
              `}
            >
              {progress}%
            </span>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mt-6">
          <div
            className="
              h-1
              overflow-hidden
              rounded-full
              bg-zinc-800
            "
            role="progressbar"
            aria-label="Generation progress"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={progress}
          >
            <div
              className="
                h-full
                rounded-full
                bg-[#D4AF37]
                transition-all
                duration-700
                ease-out
              "
              style={{
                width: `${progress}%`,
              }}
            />
          </div>
        </div>

        {/* Steps */}
        <div
          className="
            mt-6
            grid
            gap-2.5
            lg:grid-cols-4
          "
        >
          {steps.map((step, index) => {
            const stepNumber = index + 1;

            const isComplete =
              completed || stepNumber < safeStep;

            const isCurrent =
              !completed && stepNumber === safeStep;

            const isUpcoming =
              !isComplete && !isCurrent;

            return (
              <div
                key={step.title}
                className={`
                  relative
                  flex
                  min-w-0
                  items-center
                  gap-3
                  rounded-xl
                  border
                  px-3
                  py-3
                  transition-all
                  duration-300

                  ${
                    isComplete
                      ? `
                        border-emerald-500/15
                        bg-emerald-500/[0.035]
                      `
                      : isCurrent
                        ? `
                          border-[#D4AF37]/20
                          bg-[#D4AF37]/[0.045]
                          shadow-[0_0_25px_rgba(212,175,55,0.035)]
                        `
                        : `
                          border-zinc-800/70
                          bg-[#0D0D0F]/60
                        `
                  }
                `}
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
                  <div className="flex items-center justify-between gap-2">
                    <p
                      className={`
                        truncate
                        text-xs
                        font-medium

                        ${
                          isComplete
                            ? "text-zinc-300"
                            : isCurrent
                              ? "text-white"
                              : "text-zinc-600"
                        }
                      `}
                    >
                      {step.title}
                    </p>

                    {/* Status */}
                    <span
                      className={`
                        shrink-0
                        text-[9px]
                        font-medium

                        ${
                          isComplete
                            ? "text-emerald-400/70"
                            : isCurrent
                              ? "text-[#D4AF37]"
                              : "text-zinc-800"
                        }
                      `}
                    >
                      {isComplete
                        ? "Done"
                        : isCurrent
                          ? "Working"
                          : "Queued"}
                    </span>
                  </div>

                  <p
                    className={`
                      mt-0.5
                      truncate
                      text-[10px]
                      ${
                        isCurrent
                          ? "text-zinc-600"
                          : "text-zinc-700"
                      }
                    `}
                  >
                    {step.description}
                  </p>
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
            items-start
            gap-2.5
            rounded-xl
            border
            border-zinc-800/60
            bg-[#0D0D0F]/50
            px-3
            py-2.5
          "
        >
          <Sparkles
            className="
              mt-0.5
              h-3
              w-3
              shrink-0
              text-[#D4AF37]/70
            "
            aria-hidden="true"
          />

          <p className="text-[10px] leading-4 text-zinc-700">
            {completed
              ? "Your workspace is ready. You can continue editing and refining it."
              : "ANVIX is preparing your first workspace. You can continue once generation is complete."}
          </p>
        </div>
      </div>
    </section>
  );
}