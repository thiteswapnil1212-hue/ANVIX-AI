
"use client";

import { Loader2, Sparkles, Check, Circle, Cpu } from "lucide-react";

const steps = [
  "Analyzing your prompt",
  "Planning application architecture",
  "Generating frontend",
  "Generating backend",
  "Preparing deployment",
];

export default function ThinkingPanel() {
  const activeStep = 0;
  const progress = ((activeStep + 1) / steps.length) * 100;

  return (
    <section
      aria-live="polite"
      aria-busy="true"
      className="relative mt-6 overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0B0B0C] p-5 shadow-[0_12px_40px_rgba(0,0,0,0.25)] sm:p-6"
    >
      {/* Ambient gold glow */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-16 -top-20 h-48 w-48 rounded-full bg-[#D4AF37]/[0.07] blur-3xl"
      />

      <div className="relative">
        {/* Header */}
        <div className="flex items-start gap-3.5">
          <div className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[#D4AF37]/25 bg-[#D4AF37]/10">
            <Sparkles className="h-5 w-5 text-[#D4AF37]" />
            <span className="absolute -right-1 -top-1 flex h-3 w-3">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#D4AF37]/50" />
              <span className="relative inline-flex h-3 w-3 rounded-full border-2 border-[#0B0B0C] bg-[#D4AF37]" />
            </span>
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-base font-semibold tracking-tight text-white">
                Building your project
              </h3>

              <span className="inline-flex items-center gap-1 rounded-full border border-[#D4AF37]/20 bg-[#D4AF37]/[0.08] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-[#D4AF37]">
                <Loader2 className="h-3 w-3 animate-spin" />
                In progress
              </span>
            </div>

            <p className="mt-1 text-sm leading-5 text-zinc-500">
              ANVIX AI is working through your request.
            </p>
          </div>
        </div>

        {/* Progress */}
        <div className="mt-6">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-400">
              Workflow progress
            </span>
            <span className="text-xs font-semibold tabular-nums text-[#D4AF37]">
              {progress}%
            </span>
          </div>

          <div
            className="h-1.5 overflow-hidden rounded-full bg-white/[0.07]"
            role="progressbar"
            aria-label="Project generation progress"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={progress}
          >
            <div
              className="h-full rounded-full bg-gradient-to-r from-[#A98522] via-[#D4AF37] to-[#F1D77A] transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Steps */}
        <div className="mt-5 space-y-2">
          {steps.map((step, index) => {
            const isActive = index === activeStep;
            const isComplete = index < activeStep;

            return (
              <div
                key={step}
                className={`flex items-center gap-3 rounded-xl border px-3.5 py-3 transition-colors duration-200 sm:px-4 ${
                  isActive
                    ? "border-[#D4AF37]/20 bg-[#D4AF37]/[0.055]"
                    : "border-transparent bg-white/[0.025]"
                }`}
              >
                {/* Step indicator */}
                <div
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${
                    isComplete
                      ? "bg-emerald-500/10 text-emerald-400"
                      : isActive
                      ? "bg-[#D4AF37]/10 text-[#D4AF37]"
                      : "bg-white/[0.04] text-zinc-600"
                  }`}
                >
                  {isComplete ? (
                    <Check className="h-4 w-4" />
                  ) : isActive ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Circle className="h-3.5 w-3.5" />
                  )}
                </div>

                {/* Step text */}
                <span
                  className={`min-w-0 flex-1 text-sm ${
                    isActive
                      ? "font-medium text-zinc-100"
                      : isComplete
                      ? "text-emerald-400/80"
                      : "text-zinc-500"
                  }`}
                >
                  {step}
                  {isActive && (
                    <span className="inline-block w-5 animate-pulse">
                      ...
                    </span>
                  )}
                </span>

                {isActive && (
                  <span className="hidden text-[10px] font-semibold uppercase tracking-wider text-[#D4AF37] sm:inline">
                    Active
                  </span>
                )}
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="mt-4 flex items-center gap-2 border-t border-white/[0.06] pt-4">
          <Cpu className="h-3.5 w-3.5 shrink-0 text-zinc-600" />
          <p className="text-xs leading-5 text-zinc-600">
            Keep this page open while your project is being generated.
          </p>
        </div>
      </div>
    </section>
  );
}