
"use client";

import { useState } from "react";
import {
  Sparkles,
  Command,
  ArrowUpRight,
  Check,
  Lightbulb,
  RotateCcw,
  WandSparkles,
} from "lucide-react";

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
  {
    title: "SaaS CRM",
    description: "Manage customers and sales",
    prompt:
      "Build a SaaS CRM using Next.js and Supabase with authentication, customer management, sales pipelines, analytics dashboard, and a responsive UI.",
  },
  {
    title: "AI Resume Builder",
    description: "Create smarter resumes",
    prompt:
      "Create an AI Resume Builder with Next.js, user authentication, AI-powered resume suggestions, editable templates, PDF export, and Stripe subscriptions.",
  },
  {
    title: "Hospital Dashboard",
    description: "Organize hospital operations",
    prompt:
      "Design a Hospital Management Dashboard with patient records, doctor schedules, appointment booking, billing, analytics, and role-based access.",
  },
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

  const trimmedPrompt = prompt.trim();
  const remainingChars = MAX_CHARS - prompt.length;
  const progress = Math.min(
    (prompt.length / MAX_CHARS) * 100,
    100
  );

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
    if (loading) return;

    if (!trimmedPrompt) {
      setStatus("error");
      setStatusMessage("Your idea is missing.");
      setStatusDetail(
        "Describe what you want to build, then try again."
      );
      return;
    }

    setLoading(true);
    setStatus("loading");
    setStatusMessage("Building your product blueprint...");
    setStatusDetail(
      "Organizing your idea, features, and technical direction."
    );
    setResult(null);

    try {
      const data = await generateProject(trimmedPrompt);

      setResult(data.result);
      setStatus("success");
      setStatusMessage("Your blueprint is ready.");
      setStatusDetail(
        "Review your product plan and refine your idea whenever you like."
      );
    } catch (error) {
      setStatus("error");
      setStatusMessage("We couldn't generate your blueprint.");
      setStatusDetail(
        error instanceof Error
          ? error.message
          : "Something went wrong. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  function resetPrompt() {
    if (loading) return;

    setPrompt("");
    setStatus("idle");
    setStatusMessage("");
    setStatusDetail("");
    setResult(null);
  }

  return (
    <section
      className="
        relative isolate overflow-hidden
        rounded-3xl border border-white/[0.09]
        bg-[#101012]
        shadow-[0_24px_80px_rgba(0,0,0,0.28)]
      "
    >
      {/* Ambient background */}
      <div
        aria-hidden="true"
        className="
          pointer-events-none absolute
          -right-32 -top-40 h-96 w-96
          rounded-full bg-[#D4AF37]/[0.09]
          blur-[100px]
        "
      />

      <div
        aria-hidden="true"
        className="
          pointer-events-none absolute
          -bottom-40 -left-32 h-72 w-72
          rounded-full bg-amber-500/[0.04]
          blur-[90px]
        "
      />

      <div className="relative p-5 sm:p-7 lg:p-8">
        {/* Header */}
        <div className="mb-7 flex items-start justify-between gap-4">
          <div className="flex min-w-0 items-start gap-3.5">
            <div
              className="
                flex h-11 w-11 shrink-0
                items-center justify-center
                rounded-2xl border
                border-[#D4AF37]/25
                bg-[#D4AF37]/[0.09]
                text-[#D4AF37]
                shadow-[0_0_24px_rgba(212,175,55,0.08)]
              "
            >
              <WandSparkles className="h-5 w-5" />
            </div>

            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-lg font-semibold tracking-tight text-white sm:text-xl">
                  Describe your idea
                </h2>

                <span
                  className="
                    inline-flex items-center gap-1
                    rounded-full border
                    border-[#D4AF37]/20
                    bg-[#D4AF37]/[0.08]
                    px-2 py-0.5
                    text-[10px] font-medium
                    text-[#D4AF37]
                  "
                >
                  <Sparkles className="h-3 w-3" />
                  AI powered
                </span>
              </div>

              <p className="mt-1.5 max-w-lg text-sm leading-6 text-zinc-500">
                Turn your rough idea into a structured product
                blueprint with features and a technical direction.
              </p>
            </div>
          </div>

          <div
            className="
              hidden shrink-0 items-center gap-2
              rounded-xl border border-white/[0.08]
              bg-white/[0.03] px-3 py-2
              text-xs text-zinc-400 sm:flex
            "
          >
            <Sparkles className="h-3.5 w-3.5 text-[#D4AF37]" />
            GPT-5
          </div>
        </div>

        {/* Editor */}
        <div
          className="
            group overflow-hidden rounded-2xl
            border border-white/[0.09]
            bg-[#0B0B0D]
            transition-all duration-200
            focus-within:border-[#D4AF37]/50
            focus-within:shadow-[0_0_0_3px_rgba(212,175,55,0.05)]
          "
        >
          <div className="flex items-center justify-between gap-3 border-b border-white/[0.06] px-4 py-3 sm:px-5">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-[#D4AF37]" />
              <span className="text-xs font-medium text-zinc-400">
                Your product idea
              </span>
            </div>

            <button
              type="button"
              onClick={resetPrompt}
              disabled={loading || !prompt}
              className="
                inline-flex items-center gap-1.5
                rounded-lg px-2 py-1
                text-xs text-zinc-500
                transition hover:bg-white/[0.05]
                hover:text-zinc-200
                disabled:pointer-events-none
                disabled:opacity-30
              "
            >
              <RotateCcw className="h-3 w-3" />
              Clear
            </button>
          </div>

          <textarea
            value={prompt}
            onChange={(event) =>
              updatePrompt(event.target.value)
            }
            onKeyDown={(event) => {
              if (
                event.key === "Enter" &&
                event.ctrlKey &&
                !event.shiftKey
              ) {
                event.preventDefault();
                handleGenerate();
              }
            }}
            rows={7}
            maxLength={MAX_CHARS}
            disabled={loading}
            placeholder={`What do you want to build?

Describe your product, who it's for, the features you need, and any preferred technologies...`}
            className="
              min-h-[210px] w-full resize-y
              bg-transparent px-4 py-5
              text-sm leading-7 text-zinc-100
              outline-none
              placeholder:text-zinc-600
              disabled:cursor-not-allowed
              disabled:opacity-60
              sm:min-h-[230px] sm:px-5
              sm:text-[15px]
            "
            aria-label="Describe your product idea"
          />

          {/* Editor footer */}
          <div className="border-t border-white/[0.06] px-4 py-3 sm:px-5">
            <div className="mb-3 h-1 overflow-hidden rounded-full bg-white/[0.06]">
              <div
                className="
                  h-full rounded-full
                  bg-gradient-to-r
                  from-[#A88624] to-[#E6C65B]
                  transition-[width] duration-200
                "
                style={{ width: `${progress}%` }}
              />
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3">
              <span className="inline-flex items-center gap-2 text-xs text-zinc-500">
                <span className="flex items-center gap-1 rounded-md border border-white/[0.08] bg-white/[0.04] px-1.5 py-1">
                  <Command className="h-3 w-3" />
                  <span>Ctrl</span>
                </span>
                <span>+</span>
                <span className="rounded-md border border-white/[0.08] bg-white/[0.04] px-1.5 py-1">
                  Enter
                </span>
                <span className="hidden sm:inline">
                  to generate
                </span>
              </span>

              <span
                className={`
                  text-xs tabular-nums
                  ${
                    remainingChars < 200
                      ? "text-amber-400"
                      : "text-zinc-500"
                  }
                `}
                aria-live="polite"
              >
                {prompt.length.toLocaleString()} / {MAX_CHARS}
              </span>
            </div>
          </div>
        </div>

        {/* Example prompts */}
        <div className="mt-6">
          <div className="mb-3 flex items-center gap-2">
            <Lightbulb className="h-4 w-4 text-[#D4AF37]" />

            <p className="text-xs font-semibold uppercase tracking-[0.13em] text-zinc-500">
              Need inspiration?
            </p>
          </div>

          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
            {examples.map((example) => {
              const active = prompt === example.prompt;

              return (
                <button
                  key={example.title}
                  type="button"
                  disabled={loading}
                  onClick={() => updatePrompt(example.prompt)}
                  className={`
                    group relative flex min-w-0
                    items-start gap-3 rounded-xl
                    border p-3.5 text-left
                    transition-all duration-200
                    disabled:cursor-not-allowed
                    disabled:opacity-50
                    ${
                      active
                        ? "border-[#D4AF37]/40 bg-[#D4AF37]/[0.07]"
                        : "border-white/[0.07] bg-white/[0.02] hover:border-[#D4AF37]/25 hover:bg-white/[0.04]"
                    }
                  `}
                >
                  <div
                    className="
                      mt-0.5 flex h-8 w-8 shrink-0
                      items-center justify-center
                      rounded-lg border
                      border-white/[0.07]
                      bg-white/[0.04]
                      text-zinc-400
                      transition
                      group-hover:text-[#D4AF37]
                    "
                  >
                    {active ? (
                      <Check className="h-4 w-4 text-[#D4AF37]" />
                    ) : (
                      <ArrowUpRight className="h-4 w-4" />
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-zinc-200">
                      {example.title}
                    </p>

                    <p className="mt-1 text-xs leading-5 text-zinc-500">
                      {example.description}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Status */}
        <div className="mt-5">
          <GenerationStatus
            status={status}
            message={statusMessage}
            detail={statusDetail}
          />
        </div>

        {/* Result */}
        {result && (
          <div className="mt-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <GenerationResultCard result={result} />
          </div>
        )}

        {/* Generate button */}
        <div className="mt-6">
          <GenerateButton
            onClick={handleGenerate}
            loading={loading}
            disabled={!trimmedPrompt || loading}
          />
        </div>

        {/* Bottom note */}
        <p className="mt-4 text-center text-[11px] leading-5 text-zinc-600">
          <Sparkles className="mr-1 inline h-3 w-3 text-[#D4AF37]/70" />
          Your idea is the starting point. Review and refine
          the generated blueprint before building.
        </p>
      </div>
    </section>
  );
}