"use client";

import { motion } from "framer-motion";
import { ArrowRight, CheckCircle2, Sparkles } from "lucide-react";
import type { GenerationResult } from "@/lib/api/generate";

interface GenerationResultCardProps {
  result: GenerationResult;
}

export default function GenerationResultCard({ result }: GenerationResultCardProps) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="mt-6 rounded-3xl border border-[#D4AF37]/20 bg-[#0D0D0D]/90 p-6 shadow-2xl shadow-[#D4AF37]/10"
      aria-live="polite"
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-[#D4AF37]/20 bg-[#D4AF37]/10 px-3 py-1 text-sm text-[#D4AF37]">
            <Sparkles className="h-4 w-4" />
            Blueprint ready
          </div>
          <h3 className="text-xl font-semibold text-white">{result.summary}</h3>
        </div>

        <div className="rounded-2xl border border-zinc-800 bg-[#111111] px-4 py-3 text-sm text-zinc-300">
          <p className="text-zinc-500">Confidence</p>
          <p className="mt-1 font-semibold text-[#D4AF37]">{result.confidence}</p>
        </div>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-2xl border border-zinc-800 bg-[#111111] p-5">
          <p className="text-sm uppercase tracking-[0.2em] text-zinc-500">Response</p>
          <p className="mt-3 leading-7 text-zinc-300">{result.response}</p>
        </div>

        <div className="space-y-4">
          <div className="rounded-2xl border border-zinc-800 bg-[#111111] p-5">
            <p className="text-sm uppercase tracking-[0.2em] text-zinc-500">Stack</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {result.stack.map((item) => (
                <span
                  key={item}
                  className="rounded-full border border-[#D4AF37]/20 bg-[#D4AF37]/10 px-3 py-1 text-sm text-[#D4AF37]"
                >
                  {item}
                </span>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-zinc-800 bg-[#111111] p-5">
            <p className="text-sm uppercase tracking-[0.2em] text-zinc-500">Delivery</p>
            <ul className="mt-3 space-y-2 text-sm text-zinc-300">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-[#D4AF37]" />
                {result.estimatedTime} build window
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-[#D4AF37]" />
                {result.model} ready for handoff
              </li>
            </ul>
          </div>
        </div>
      </div>

      <div className="mt-6 rounded-2xl border border-zinc-800 bg-[#111111] p-5">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm uppercase tracking-[0.2em] text-zinc-500">Modules</p>
            <p className="mt-2 text-zinc-300">{result.modules.join(" • ")}</p>
          </div>
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-full bg-[#D4AF37] px-4 py-2 text-sm font-semibold text-black transition hover:bg-[#E2C259]"
          >
            Continue
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </motion.section>
  );
}
