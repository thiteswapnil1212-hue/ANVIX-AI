"use client";

import { Loader2 } from "lucide-react";

const steps = [
  "Analyzing your prompt...",
  "Planning application architecture...",
  "Generating frontend...",
  "Generating backend...",
  "Preparing deployment...",
];

export default function ThinkingPanel() {
  return (
    <div className="mt-8 rounded-3xl border border-zinc-800 bg-[#111111]/80 p-6 backdrop-blur-xl">

      <div className="mb-6 flex items-center gap-3">
        <Loader2 className="h-5 w-5 animate-spin text-[#D4AF37]" />
        <h3 className="text-lg font-semibold text-white">
          AI is thinking...
        </h3>
      </div>

      <div className="space-y-4">
        {steps.map((step) => (
          <div
            key={step}
            className="flex items-center gap-3 rounded-xl border border-zinc-800 bg-[#0D0D0D] p-4"
          >
            <div className="h-2.5 w-2.5 rounded-full bg-[#D4AF37]" />
            <span className="text-zinc-300">{step}</span>
          </div>
        ))}
      </div>
    </div>
  );
}