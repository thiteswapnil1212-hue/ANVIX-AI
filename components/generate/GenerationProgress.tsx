"use client";

import Link from "next/link";
import {
  ArrowRight,
  Check,
  Loader2,
  Sparkles,
} from "lucide-react";

interface GenerateProgressProps {
  currentStep?: number;
  completed?: boolean;
  /** Workspace route for the completion button. Shown only when completed. */
  workspaceHref?: string;
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
] as const;

const TOTAL_STEPS = steps.length;

function clampStep(value: number): number {
  if (!Number.isFinite(value)) {
    return 1;
  }

  return Math.min(
    Math.max(Math.floor(value), 0),
    TOTAL_STEPS
  );
}

export default function GenerateProgress({
  currentStep = 1,
  completed = false,
  workspaceHref,
}: GenerateProgressProps) {
  const safeStep = clampStep(currentStep);

  const progress = completed
    ? 100
    : Math.round((safeStep / TOTAL_STEPS) * 100);

  const currentStepData =
    safeStep > 0
      ? steps[safeStep - 1]
      : undefined;

  const activeStep = completed
    ? "All steps completed"
    : currentStepData?.title ?? "Preparing to start";

  const statusLabel = completed
    ? "Complete"
    : safeStep === 0
      ? "Preparing"
      : `Step ${safeStep} of ${TOTAL_STEPS}`;

  return (
    <section
      aria-labelledby="generation-progress-title"
      className="
        relative
        isolate
        overflow-hidden
        rounded-2xl
        border
        border-white/[0.07]
        bg-[#1F1F20]
        shadow-[0_24px_80px_-40px_rgba(0,0,0,0.8)]
      "
    >
      <div className="relative p-5 sm:p-6 lg:p-7">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-start gap-4">
            <div
              aria-hidden="true"
              className={`
                flex
                h-11
                w-11
                shrink-0
                items-center
                justify-center
                rounded-xl
                border
                ${
                  completed
                    ? "border-emerald-500/20 bg-emerald-500/[0.07]"
                    : "border-[#0074E8]/20 bg-[#0074E8]/[0.08]"
                }
              `}
            >
              {completed ? (
                <Check
                  className="h-5 w-5 text-emerald-400"
                  strokeWidth={2.2}
                />
              ) : (
                <Sparkles
                  className="h-5 w-5 text-[#0074E8]"
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

          {/* Percentage */}
          <div
            className={`
              flex
              shrink-0
              items-center
              gap-2
              self-start
              rounded-full
              border
              px-3
              py-1.5
              sm:self-center
              ${
                completed
                  ? "border-emerald-500/20 bg-emerald-500/[0.06]"
                  : "border-[#0074E8]/20 bg-[#0074E8]/[0.06]"
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
                  h-1.5
                  w-1.5
                  rounded-full
                  bg-[#0074E8]
                  motion-safe:animate-pulse
                "
              />
            )}

            <span
              className={`
                text-[11px]
                font-semibold
                tabular-nums
                ${
                  completed
                    ? "text-emerald-400"
                    : "text-[#0074E8]"
                }
              `}
            >
              {progress}%
            </span>
          </div>
        </div>

        {/* Progress */}
        <div className="mt-6">
          <div
            role="progressbar"
            aria-label="Workspace generation progress"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={progress}
            aria-valuetext={`${progress}% complete`}
            className="
              h-1.5
              overflow-hidden
              rounded-full
              bg-zinc-800
            "
          >
            <div
              className="
                h-full
                rounded-full
                bg-[#0074E8]
                transition-[width]
                duration-500
                ease-out
                motion-reduce:transition-none
              "
              style={{
                width: `${progress}%`,
              }}
            />
          </div>

          <div className="mt-2 flex items-center justify-between gap-3">
            <span className="min-w-0 truncate text-[10px] text-zinc-600">
              {activeStep}
            </span>

            <span className="shrink-0 text-[10px] tabular-nums text-zinc-600">
              {statusLabel}
            </span>
          </div>
        </div>

        {/* Steps */}
        <ol
          className="mt-6 grid gap-2.5 lg:grid-cols-2"
          aria-label="Workspace generation steps"
        >
          {steps.map((step, index) => {
            const stepNumber = index + 1;

            const isComplete =
              completed || stepNumber < safeStep;

            const isCurrent =
              !completed &&
              safeStep > 0 &&
              stepNumber === safeStep;

            return (
              <li
                key={step.title}
                aria-current={
                  isCurrent ? "step" : undefined
                }
                className={`
                  relative
                  flex
                  min-w-0
                  items-center
                  gap-3
                  rounded-xl
                  border
                  px-3.5
                  py-3.5
                  transition-colors
                  duration-200
                  motion-reduce:transition-none
                  ${
                    isComplete
                      ? "border-emerald-500/15 bg-emerald-500/[0.035]"
                      : isCurrent
                        ? "border-[#0074E8]/25 bg-[#0074E8]/[0.05]"
                        : "border-white/[0.05] bg-[#0D0D0F]/70"
                  }
                `}
              >
                {/* Step indicator */}
                <div
                  aria-hidden="true"
                  className={`
                    flex
                    h-9
                    w-9
                    shrink-0
                    items-center
                    justify-center
                    rounded-xl
                    border
                    ${
                      isComplete
                        ? "border-emerald-500/20 bg-emerald-500/[0.08]"
                        : isCurrent
                          ? "border-[#0074E8]/25 bg-[#0074E8]/[0.08]"
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
                      className="
                        h-4
                        w-4
                        text-[#0074E8]
                        motion-safe:animate-spin
                      "
                      strokeWidth={2}
                    />
                  ) : (
                    <span className="text-[10px] font-semibold tabular-nums text-zinc-700">
                      {stepNumber}
                    </span>
                  )}
                </div>

                {/* Step content */}
                <div className="min-w-0 flex-1">
                  <div className="flex min-w-0 items-center justify-between gap-2">
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
                              : "text-zinc-500"
                        }
                      `}
                    >
                      {step.title}
                    </p>

                    <span
                      className={`
                        shrink-0
                        text-[9px]
                        font-medium
                        ${
                          isComplete
                            ? "text-emerald-400/80"
                            : isCurrent
                              ? "text-[#0074E8]"
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
                      mt-1
                      truncate
                      text-[10px]
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

        {/* Footer */}
        <div
          className="
            mt-5
            flex
            items-start
            gap-2.5
            rounded-xl
            border
            border-white/[0.06]
            bg-black/20
            px-3.5
            py-3
          "
        >
          {completed ? (
            <Check
              aria-hidden="true"
              className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-400/80"
              strokeWidth={2.2}
            />
          ) : (
            <Sparkles
              aria-hidden="true"
              className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#0074E8]/70"
            />
          )}

          <p className="text-[10px] leading-5 text-zinc-500">
            {completed
              ? "Generation is complete. You can now review and refine your workspace."
              : safeStep === 0
                ? "ANVIX is preparing the generation pipeline."
                : "Progress reflects the current stage reported by the generation flow."}
          </p>
        </div>

        {/* Completion handoff — visible step into the workspace, in
            addition to the auto-redirect. */}
        {completed && workspaceHref && (
          <div className="mt-5">
            <Link
              href={workspaceHref}
              className="
                inline-flex
                w-full
                items-center
                justify-center
                gap-2
                rounded-xl
                bg-[#0074E8]
                px-5
                py-3
                text-sm
                font-semibold
                text-white
                transition-colors
                hover:bg-[#1A8CFF]
                focus-visible:outline-none
                focus-visible:ring-2
                focus-visible:ring-[#0074E8]/60
                sm:w-auto
              "
            >
              Open in Workspace
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
        )}

        {/* Screen-reader announcement */}
        <p
          className="sr-only"
          role="status"
          aria-live="polite"
        >
          {completed
            ? "Workspace generation complete."
            : safeStep === 0
              ? "Workspace generation is preparing to start."
              : `Step ${safeStep} of ${TOTAL_STEPS}: ${activeStep}.`}
        </p>
      </div>
    </section>
  );
}