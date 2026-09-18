
"use client";

import { useState } from "react";
import { Sparkles, Command, ArrowUpRight } from "lucide-react";

import GenerateButton from "@/features/landing/GenerateButton";
import GenerationStatus from "@/components/ai/GenerationStatus";
import GenerationResultCard from "@/components/ai/GenerationResultCard";
import {
  generateProject,
  type GenerateProjectResponse,
} from "@/lib/api/generate";

const MAX_CHARS = 2000;

type Status = "idle" | "loading" | "success" | "error";

const examples = [
  "Build a SaaS CRM using Next.js and Supabase",
  "Create an AI Resume Builder with Stripe",
  "Design a Hospital Management Dashboard",
];

export default function PromptEditor() {
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<Status>("idle");
  const [statusMessage, setStatusMessage] = useState("");
  const [statusDetail, setStatusDetail] = useState("");
  const [result, setResult] = useState<
    GenerateProjectResponse["result"] | null
  >(null);

  function updatePrompt(value: string) {
    setPrompt(value.slice(0, MAX_CHARS));

    if (status !== "loading") {
      setStatus("idle");
      setStatusMessage("");
      setStatusDetail("");
      setResult(null);
    }
  }

  async function handleGenerate() {
    const trimmedPrompt = prompt.trim();

    if (loading) return;

    if (!trimmedPrompt) {
      setStatus("error");
      setStatusMessage("Please describe your product first.");
      setStatusDetail("Add your idea or a few features to get started.");
      return;
    }

    setLoading(true);
    setStatus("loading");
    setStatusMessage("Generating your product blueprint...");
    setStatusDetail("Planning the experience, tech stack, and delivery.");
    setResult(null);

    try {
      const data = await generateProject(trimmedPrompt);

      setResult(data.result);
      setStatus("success");
      setStatusMessage("Blueprint generated successfully.");
      setStatusDetail("Your product plan is ready to review.");
    } catch (error) {
      setStatus("error");
      setStatusMessage("Generation failed.");
      setStatusDetail(
        error instanceof Error
          ? error.message
          : "Please try again in a moment."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="relative overflow-hidden rounded-3xl border border-zinc-800 bg-[#111111] p-4 shadow-2xl shadow-black/20 sm:p-6">
      {/* Subtle gold glow */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-24 -top-32 h-64 w-64 rounded-full bg-[#D4AF37]/10 blur-3xl"
      />

      <div className="relative">
        {/* Header */}
        <div className="mb-5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#D4AF37]/20 bg-[#D4AF37]/10">
              <Sparkles className="h-5 w-5 text-[#D4AF37]" />
            </div>

            <div>
              <h2 className="text-lg font-semibold text-white">
                Describe your idea
              </h2>
              <p className="mt-0.5 text-sm text-zinc-500">
                Turn your idea into a product blueprint.
              </p>
            </div>
          </div>

          <span className="hidden shrink-0 items-center gap-1.5 rounded-full border border-zinc-800 bg-zinc-900 px-3 py-1.5 text-xs font-medium text-zinc-400 sm:inline-flex">
            <Sparkles size={13} className="text-[#D4AF37]" />
            GPT-5
          </span>
        </div>

        {/* Prompt input */}
        <div className="overflow-hidden rounded-2xl border border-zinc-800 bg-[#0D0D0D] transition-colors focus-within:border-[#D4AF37]/60">
          <textarea
            value={prompt}
            onChange={(event) => updatePrompt(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && event.ctrlKey) {
                event.preventDefault();
                handleGenerate();
              }
            }}
            rows={7}
            maxLength={MAX_CHARS}
            disabled={loading}
            placeholder="What do you want to build? Describe your idea, features, and preferred tech stack..."
            className="min-h-[180px] w-full resize-y bg-transparent px-4 py-4 text-sm leading-7 text-zinc-100 outline-none placeholder:text-zinc-600 disabled:cursor-not-allowed disabled:opacity-70 sm:px-5 sm:text-base"
            aria-label="Describe your product idea"
          />

          <div className="flex items-center justify-between gap-3 border-t border-zinc-800/80 px-4 py-3 sm:px-5">
            <span className="flex items-center gap-1.5 text-xs text-zinc-500">
              <Command size={13} />
              Ctrl + Enter to generate
            </span>

            <span
              className={`text-xs tabular-nums ${
                prompt.length > 1800
                  ? "text-amber-400"
                  : "text-zinc-500"
              }`}
              aria-live="polite"
            >
              {prompt.length.toLocaleString()}/{MAX_CHARS}
            </span>
          </div>
        </div>

        {/* Prompt examples */}
        <div className="mt-5">
          <p className="mb-2.5 text-xs font-medium uppercase tracking-wider text-zinc-500">
            Need inspiration?
          </p>

          <div className="flex flex-wrap gap-2">
            {examples.map((example) => (
              <button
                key={example}
                type="button"
                disabled={loading}
                onClick={() => updatePrompt(example)}
                className="group inline-flex items-center gap-1.5 rounded-xl border border-zinc-800 bg-zinc-900/50 px-3 py-2 text-left text-xs text-zinc-400 transition hover:border-[#D4AF37]/40 hover:bg-[#D4AF37]/5 hover:text-zinc-200 disabled:cursor-not-allowed disabled:opacity-50 sm:text-sm"
              >
                {example}
                <ArrowUpRight
                  size={13}
                  className="shrink-0 text-zinc-600 transition group-hover:text-[#D4AF37]"
                />
              </button>
            ))}
          </div>
        </div>

        {/* Status and result */}
        <div className="mt-5">
          <GenerationStatus
            status={status}
            message={statusMessage}
            detail={statusDetail}
          />
        </div>

        {result && (
          <div className="mt-5">
            <GenerationResultCard result={result} />
          </div>
        )}

        {/* Generate action */}
        <div className="mt-6">
          <GenerateButton
            onClick={handleGenerate}
            loading={loading}
            disabled={!prompt.trim() || loading}
          />
        </div>
      </div>
    </section>
  );
}