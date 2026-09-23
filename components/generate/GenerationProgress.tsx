
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
    description: "Preparing your workspace for review",
  },
];

export default function GenerateProgress({
  currentStep = 1,
  completed = false,
}: GenerateProgressProps) {
  // Keep the step within the supported range.
  const numericStep = Number.isFinite(currentStep)
    ? Math.floor(currentStep)
    : 1;

  const safeStep = Math.min(
    Math.max(numericStep, 0),
    steps.length
  );

  const progress = completed
    ? 100
    : Math.round((safeStep / steps.length) * 100);

  const activeStep = completed
    ? "All steps completed"
    : safeStep === 0
      ? "Preparing to start"
      : steps[safeStep - 1].title;

  return (
    <section
      aria-labelledby="generation-progress-title"
      className="
        relative isolate overflow-hidden
        rounded-3xl border border-[#D4AF37]/15
        bg-[#111113]/95
        shadow-[0_24px_80px_-40px_rgba(0,0,0,0.8)]
      "
    >
      {/* Ambient glow */}
      <div
        aria-hidden="true"
        className="
          pointer-events-none absolute -right-32 -top-32
          -z-10 h-64 w-64 rounded-full
          bg-[#D4AF37]/[0.06] blur-[90px]
        "
      />

      {/* Top highlight */}
      <div
        aria-hidden="true"
        className="
          pointer-events-none absolute inset-x-0 top-0 h-px
          bg-gradient-to-r from-transparent
          via-[#D4AF37]/35 to-transparent
        "
      />

      <div className="relative p-5 sm:p-6 lg:p-7">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-start gap-4">
            <div
              aria-hidden="true"
              className="
                flex h-11 w-11 shrink-0 items-center justify-center
                rounded-xl border border-[#D4AF37]/20
                bg-[#D4AF37]/[0.08]
                shadow-[0_0_24px_rgba(212,175,55,0.06)]
              "
            >
              {completed ? (
                <Check
                  className="h-5 w-5 text-emerald-400"
                  strokeWidth={2}
                />
              ) : (
                <Sparkles
                  className="h-5 w-5 text-[#D4AF37]"
                  strokeWidth={1.8}
                />
              )}
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

              <p className="mt-1 text-xs leading-5 text-zinc-500">
                {completed
                  ? "Your workspace is ready for you to review."
                  : "Your idea is being turned into a structured workspace."}
              </p>
            </div>
          </div>

          {/* Progress badge */}
          <div
            className={`
              flex shrink-0 items-center gap-2
              self-start rounded-full border
              px-3 py-1.5 sm:self-center
              ${
                completed
                  ? "border-emerald-500/20 bg-emerald-500/[0.06]"
                  : "border-[#D4AF37]/20 bg-[#D4AF37]/[0.04]"
              }
            `}
          >
            {completed ? (
              <Check
                className="h-3.5 w-3.5 text-emerald-400"
                aria-hidden="true"
              />
            ) : (
              <span
                aria-hidden="true"
                className="
                  h-1.5 w-1.5 rounded-full
                  bg-[#D4AF37] motion-safe:animate-pulse
                "
              />
            )}

            <span
              className={`text-[11px] font-semibold tabular-nums ${
                completed ? "text-emerald-400" : "text-[#D4AF37]"
              }`}
            >
              {progress}%
            </span>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mt-6">
          <div
            role="progressbar"
            aria-label="Workspace generation progress"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={progress}
            aria-valuetext={`${progress}% complete`}
            className="h-1.5 overflow-hidden rounded-full bg-zinc-800"
          >
            <div
              className="
                h-full rounded-full
                bg-gradient-to-r
                from-[#B89425] via-[#D4AF37] to-[#F0D675]
                transition-[width] duration-500 ease-out
                motion-reduce:transition-none
              "
              style={{ width: `${progress}%` }}
            />
          </div>

          <div className="mt-2 flex items-center justify-between gap-3">
            <span className="truncate text-[10px] text-zinc-600">
              {activeStep}
            </span>

            <span className="shrink-0 text-[10px] text-zinc-600">
              {completed
                ? "Complete"
                : `Step ${safeStep} of ${steps.length}`}
            </span>
          </div>
        </div>

        {/* Step list */}
        <ol className="mt-6 grid gap-2.5 lg:grid-cols-2">
          {steps.map((step, index) => {
            const stepNumber = index + 1;

            const isComplete =
              completed || stepNumber < safeStep;

            const isCurrent =
              !completed && stepNumber === safeStep;

            const isUpcoming =
              !isComplete && !isCurrent;

            return (
              <li
                key={step.title}
                aria-current={isCurrent ? "step" : undefined}
                className={`
                  relative flex min-w-0 items-center gap-3
                  rounded-xl border px-3.5 py-3.5
                  transition-colors duration-200
                  motion-reduce:transition-none
                  ${
                    isComplete
                      ? "border-emerald-500/15 bg-emerald-500/[0.035]"
                      : isCurrent
                        ? "border-[#D4AF37]/25 bg-[#D4AF37]/[0.055]"
                        : "border-white/[0.05] bg-[#0D0D0F]/70"
                  }
                `}
              >
                {/* Step icon */}
                <div
                  aria-hidden="true"
                  className={`
                    flex h-9 w-9 shrink-0 items-center justify-center
                    rounded-xl border
                    ${
                      isComplete
                        ? "border-emerald-500/20 bg-emerald-500/[0.08]"
                        : isCurrent
                          ? "border-[#D4AF37]/25 bg-[#D4AF37]/[0.08]"
                          : "border-zinc-800 bg-zinc-900/70"
                    }
                  `}
                >
                  {isComplete ? (
                    <Check
                      className="h-4 w-4 text-emerald-400"
                      strokeWidth={2.5}
                    />
                  ) : isCurrent ? (
                    <Loader2
                      className="h-4 w-4 text-[#D4AF37] motion-safe:animate-spin"
                      strokeWidth={2}
                    />
                  ) : (
                    <Circle
                      className="h-3.5 w-3.5 text-zinc-700"
                      strokeWidth={1.8}
                    />
                  )}
                </div>

                {/* Step text */}
                <div className="min-w-0 flex-1">
                  <div className="flex min-w-0 items-center justify-between gap-2">
                    <p
                      className={`
                        truncate text-xs font-medium
                        ${
                          isComplete
                            ? "text-zinc-300"
                            : isCurrent
                              ? "text-white"
                              : "text-zinc-500"
                        }
                      `}
                    >
                      {step.title}
                    </p>

                    <span
                      className={`
                        shrink-0 text-[9px] font-medium
                        ${
                          isComplete
                            ? "text-emerald-400/80"
                            : isCurrent
                              ? "text-[#D4AF37]"
                              : "text-zinc-700"
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
                      mt-1 truncate text-[10px]
                      ${
                        isCurrent
                          ? "text-zinc-500"
                          : "text-zinc-600"
                      }
                    `}
                  >
                    {step.description}
                  </p>
                </div>
              </li>
            );
          })}
        </ol>

        {/* Footer status */}
        <div
          className="
            mt-5 flex items-start gap-2.5
            rounded-xl border border-white/[0.06]
            bg-black/20 px-3.5 py-3
          "
        >
          <Sparkles
            aria-hidden="true"
            className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#D4AF37]/70"
          />

          <p className="text-[10px] leading-5 text-zinc-500">
            {completed
              ? "Generation is complete. You can now review and refine your workspace."
              : "Progress reflects the current step provided by your generation flow."}
          </p>
        </div>

        {/* Screen-reader announcement */}
        <p className="sr-only" role="status" aria-live="polite">
          {completed
            ? "Workspace generation complete."
            : safeStep === 0
              ? "Workspace generation is preparing to start."
              : `Step ${safeStep} of ${steps.length}: ${activeStep}.`}
        </p>
      </div>
    </section>
  );
}