"use client";

import { motion } from "framer-motion";
import {
  ArrowRight,
  CheckCircle2,
  Clock3,
  Cpu,
  Layers3,
  Sparkles,
} from "lucide-react";
import type { GenerationResult } from "@/lib/api/generate";

interface GenerationResultCardProps {
  result: GenerationResult;
}

export default function GenerationResultCard({
  result,
}: GenerationResultCardProps) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 16, scale: 0.99 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className="mt-6 overflow-hidden rounded-3xl border border-white/[0.08] bg-[#0B0B0B] shadow-[0_20px_70px_rgba(0,0,0,0.35)]"
      aria-live="polite"
    >
      {/* Header */}
      <div className="border-b border-white/[0.06] p-5 sm:p-6">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[#D4AF37]/20 bg-[#D4AF37]/[0.08] px-3 py-1.5 text-xs font-medium text-[#D4AF37]">
              <Sparkles className="h-3.5 w-3.5" />
              Blueprint ready
            </div>

            <h3 className="max-w-3xl text-xl font-semibold tracking-tight text-white sm:text-2xl">
              {result.summary}
            </h3>

            <p className="mt-2 text-sm text-zinc-500">
              AI-generated implementation blueprint
            </p>
          </div>

          {/* Confidence */}
          <div className="shrink-0 rounded-2xl border border-white/[0.07] bg-white/[0.025] px-4 py-3 sm:min-w-[130px]">
            <div className="flex items-center justify-between gap-4">
              <span className="text-xs text-zinc-500">Confidence</span>
              <Cpu className="h-3.5 w-3.5 text-[#D4AF37]" />
            </div>

            <p className="mt-1 text-lg font-semibold text-[#D4AF37]">
              {result.confidence}
            </p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid gap-px bg-white/[0.05] lg:grid-cols-[1.25fr_0.75fr]">
        {/* Response */}
        <div className="bg-[#0B0B0B] p-5 sm:p-6">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/[0.05]">
              <Sparkles className="h-3.5 w-3.5 text-[#D4AF37]" />
            </div>

            <p className="text-xs font-medium uppercase tracking-[0.18em] text-zinc-500">
              Response
            </p>
          </div>

          <p className="mt-5 max-w-2xl text-[15px] leading-7 text-zinc-300">
            {result.response}
          </p>
        </div>

        {/* Details */}
        <div className="space-y-px bg-white/[0.05]">
          {/* Stack */}
          <div className="bg-[#0B0B0B] p-5 sm:p-6">
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-zinc-500">
              Technology Stack
            </p>

            <div className="mt-4 flex flex-wrap gap-2">
              {result.stack.map((item) => (
                <span
                  key={item}
                  className="rounded-lg border border-white/[0.07] bg-white/[0.035] px-2.5 py-1.5 text-xs font-medium text-zinc-300 transition-colors hover:border-[#D4AF37]/25 hover:text-[#D4AF37]"
                >
                  {item}
                </span>
              ))}
            </div>
          </div>

          {/* Delivery */}
          <div className="bg-[#0B0B0B] p-5 sm:p-6">
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-zinc-500">
              Delivery
            </p>

            <div className="mt-4 space-y-3">
              <div className="flex items-center gap-3">
                <Clock3 className="h-4 w-4 shrink-0 text-[#D4AF37]" />

                <div className="min-w-0">
                  <p className="text-xs text-zinc-500">Estimated build</p>

                  <p className="mt-0.5 text-sm text-zinc-300">
                    {result.estimatedTime}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-[#D4AF37]" />

                <div className="min-w-0">
                  <p className="text-xs text-zinc-500">Model</p>

                  <p className="mt-0.5 truncate text-sm text-zinc-300">
                    {result.model}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modules */}
      <div className="border-t border-white/[0.06] p-5 sm:p-6">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <Layers3 className="h-4 w-4 text-[#D4AF37]" />

              <p className="text-xs font-medium uppercase tracking-[0.18em] text-zinc-500">
                Modules
              </p>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {result.modules.map((module, index) => (
                <div
                  key={module}
                  className="flex items-center gap-2 rounded-xl border border-white/[0.07] bg-white/[0.025] px-3 py-2"
                >
                  <span className="text-[10px] font-semibold text-[#D4AF37]">
                    {String(index + 1).padStart(2, "0")}
                  </span>

                  <span className="text-sm text-zinc-300">{module}</span>
                </div>
              ))}
            </div>
          </div>

          {/* CTA */}
          <button
            type="button"
            className="group inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-[#D4AF37] px-5 py-2.5 text-sm font-semibold text-black transition-all duration-200 hover:bg-[#E2C259] hover:shadow-[0_8px_30px_rgba(212,175,55,0.15)] focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/50 focus:ring-offset-2 focus:ring-offset-[#0B0B0B]"
          >
            Continue

            <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
          </button>
        </div>
      </div>
    </motion.section>
  );
}