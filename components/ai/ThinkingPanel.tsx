"use client";

import { Loader2, Sparkles } from "lucide-react";

const steps = [
  "Analyzing your prompt",
  "Planning application architecture",
  "Generating frontend",
  "Generating backend",
  "Preparing deployment",
];

export default function ThinkingPanel() {
  return (
    <div className="mt-6 rounded-2xl border border-zinc-800 bg-[#111111] p-5">
      <div className="mb-5 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#D4AF37]/20 bg-[#D4AF37]/10">
          <Sparkles className="h-5 w-5 text-[#D4AF37]" />
        </div>

        <div>
          <h3 className="text-base font-semibold text-white">
            AI is thinking...
          </h3>
          <p className="mt-1 text-sm text-zinc-500">
            Working on your request
          </p>
        </div>
      </div>

      <div className="space-y-2">
        {steps.map((step, index) => (
          <div
            key={step}
            className="flex items-center gap-3 rounded-xl bg-[#0D0D0D] px-4 py-3"
          >
            {index === 0 ? (
              <Loader2 className="h-4 w-4 shrink-0 animate-spin text-[#D4AF37]" />
            ) : (
              <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-zinc-600" />
            )}

            <span
              className={`text-sm ${
                index === 0 ? "text-zinc-200" : "text-zinc-500"
              }`}
            >
              {step}
              {index === 0 && (
                <span className="animate-pulse">...</span>
              )}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}