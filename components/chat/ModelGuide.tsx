
"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import {
  X,
  Lock,
  Check,
  Sparkles,
  Search,
  ArrowUpRight,
  Cpu,
  SlidersHorizontal,
  BookOpen,
} from "lucide-react";
import { CHAT_MODELS } from "@/lib/chat-models";

type ModelGuideProps = {
  onClose: () => void;
};

type ModelInfo = {
  description: string;
  bestFor: string[];
  example: string;
};

const MODEL_INFO: Record<string, ModelInfo> = {
  "gemini-2.5-flash": {
    description:
      "A general-purpose model option for everyday questions, coding assistance, writing, and explanations.",
    bestFor: ["Everyday questions", "Learning", "Coding", "Brainstorming"],
    example: "Explain React useEffect with a simple example.",
  },
  "gemini-2.5-flash-lite": {
    description:
      "A lightweight option for short, straightforward tasks where concise responses are useful.",
    bestFor: ["Quick questions", "Summaries", "Rewrites", "Basic explanations"],
    example: "Summarize this paragraph in 3 bullet points.",
  },
  "gemini-2.0-flash": {
    description:
      "A general-purpose option for common prompts, explanations, and basic coding questions.",
    bestFor: ["General questions", "Simple coding", "Explanations", "Comparisons"],
    example: "Explain the difference between an array and a linked list.",
  },
  "gpt-5.5": {
    description:
      "An OpenAI model option. Availability and capabilities depend on the connected provider integration.",
    bestFor: ["Complex questions", "Multi-step tasks", "Coding", "Structured responses"],
    example: "Break a feature into frontend, backend, and database tasks.",
  },
  "gpt-4.1": {
    description:
      "An OpenAI model option commonly associated with instruction-following and coding workflows.",
    bestFor: ["Coding", "Detailed instructions", "Structured outputs", "Text analysis"],
    example: "Review this function and explain what each part does.",
  },
  "gpt-6-astra": {
    description:
      "A reserved model entry. Its identity, capabilities, and integration have not been verified.",
    bestFor: ["Reserved for future integration"],
    example: "Model details will be added after integration is verified.",
  },
  "gpt-4o": {
    description:
      "An OpenAI model option for general-purpose assistant tasks, including supported multimodal workflows.",
    bestFor: ["Writing", "Conversation", "Coding", "Supported multimodal tasks"],
    example: "Help me organize the steps for building a portfolio website.",
  },
  o3: {
    description:
      "An OpenAI reasoning-oriented model option for challenging problem-solving tasks.",
    bestFor: ["Problem-solving", "Mathematics", "Logic", "Algorithm analysis"],
    example: "Help me reason through this algorithm's time complexity.",
  },
  "claude-opus": {
    description:
      "An Anthropic model entry intended for demanding analysis and writing workflows, subject to integration.",
    bestFor: ["Detailed analysis", "Long-form writing", "Complex coding", "Long documents"],
    example: "Help me plan a multi-page web application architecture.",
  },
  "claude-sonnet": {
    description:
      "An Anthropic model entry for coding, writing, and analysis workflows.",
    bestFor: ["Coding", "Writing", "Analysis", "Productivity"],
    example: "Explain this API route and suggest how to organize it.",
  },
  "claude-haiku": {
    description:
      "An Anthropic model entry for lightweight tasks and concise assistance.",
    bestFor: ["Quick questions", "Short explanations", "Rewrites", "Lightweight tasks"],
    example: "Rewrite this sentence to make it clearer.",
  },
  "deepseek-chat": {
    description:
      "A DeepSeek model entry for general conversation, text tasks, and coding assistance.",
    bestFor: ["General questions", "Coding", "Writing", "Explanations"],
    example: "Explain this Python code in beginner-friendly language.",
  },
  "deepseek-reasoner": {
    description:
      "A DeepSeek reasoning-oriented model entry for tasks that benefit from multiple steps.",
    bestFor: ["Multi-step reasoning", "Mathematics", "Problem-solving", "Algorithms"],
    example: "Walk me through the logic of this binary search solution.",
  },
  grok: {
    description:
      "An xAI model entry for conversational prompts and exploring ideas, depending on integration.",
    bestFor: ["Conversation", "Brainstorming", "Exploring ideas", "General questions"],
    example: "Give me several approaches to this project idea.",
  },
  "grok-fast": {
    description:
      "An xAI model entry intended for quick responses and lightweight conversational tasks.",
    bestFor: ["Quick questions", "Short responses", "Explanations", "Lightweight tasks"],
    example: "Explain this technical term in two sentences.",
  },
};

const PROVIDERS = [
  "All",
  "Google",
  "OpenAI",
  "Anthropic",
  "DeepSeek",
  "xAI",
];

const PROVIDER_LOGOS: Record<string, string> = {
  Google: "/model-logos/google.svg",
  OpenAI: "/model-logos/openai.svg",
  Anthropic: "/model-logos/anthropic.svg",
  DeepSeek: "/model-logos/deepseek.svg",
  "xAI": "/model-logos/xai.svg",
};

function getProvider(provider: string) {
  const normalized = provider.toLowerCase();

  if (normalized.includes("gemini") || normalized.includes("google")) {
    return "Google";
  }
  if (normalized.includes("claude") || normalized.includes("anthropic")) {
    return "Anthropic";
  }
  if (normalized.includes("deepseek")) {
    return "DeepSeek";
  }
  if (normalized.includes("grok") || normalized.includes("xai")) {
    return "xAI";
  }
  if (normalized.includes("openai") || normalized.includes("gpt")) {
    return "OpenAI";
  }

  return provider;
}

export default function ModelGuide({ onClose }: ModelGuideProps) {
  const [search, setSearch] = useState("");
  const [selectedProvider, setSelectedProvider] = useState("All");

  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [onClose]);

  const models = useMemo(() => {
    const searchText = search.trim().toLowerCase();

    return CHAT_MODELS.filter((model) => {
      const provider = getProvider(model.provider);
      const info = MODEL_INFO[model.id];

      const matchesProvider =
        selectedProvider === "All" || provider === selectedProvider;

      const matchesSearch =
        !searchText ||
        model.name.toLowerCase().includes(searchText) ||
        model.provider.toLowerCase().includes(searchText) ||
        info?.description.toLowerCase().includes(searchText) ||
        info?.bestFor.some((item) =>
          item.toLowerCase().includes(searchText)
        );

      return matchesProvider && matchesSearch;
    });
  }, [search, selectedProvider]);

  const availableCount = CHAT_MODELS.filter(
    (model) => !model.locked && model.apiModelId !== null
  ).length;

  const lockedCount = CHAT_MODELS.length - availableCount;

  return (
    <div
      className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/75 p-2 backdrop-blur-md sm:p-5 lg:p-8"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="model-guide-title"
        className="flex h-[96dvh] max-h-[1000px] w-full max-w-[1500px] flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#0B0B0E] shadow-[0_30px_120px_rgba(0,0,0,0.7)] sm:rounded-3xl"
      >
        {/* Header */}
        <header className="flex shrink-0 items-center justify-between gap-4 border-b border-white/[0.07] px-4 py-3.5 sm:px-6 lg:px-8 lg:py-5">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-white/10 bg-[#19191E]">
              <Image
                src="/anvix-logo.png"
                alt="ANVIX AI"
                width={40}
                height={40}
                className="h-full w-full object-contain"
              />
            </div>

            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2
                  id="model-guide-title"
                  className="text-base font-semibold tracking-tight text-white sm:text-lg"
                >
                  Model Library
                </h2>
                <span className="rounded-full border border-[#D4AF37]/20 bg-[#D4AF37]/10 px-2 py-0.5 text-[10px] font-semibold tracking-wide text-[#D4AF37]">
                  ANVIX AI
                </span>
              </div>
              <p className="mt-0.5 hidden text-xs text-zinc-500 sm:block">
                Explore available models and find one for your workflow
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close model library"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/[0.06] bg-white/[0.03] text-zinc-400 transition hover:border-white/15 hover:bg-white/[0.08] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D4AF37]"
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        {/* Main content */}
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden lg:flex-row">
          {/* Desktop sidebar */}
          <aside className="hidden w-[245px] shrink-0 flex-col border-r border-white/[0.07] bg-white/[0.015] p-5 lg:flex xl:w-[275px] xl:p-6">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500">
              <SlidersHorizontal className="h-3.5 w-3.5" />
              Providers
            </div>

            <div className="mt-4 space-y-1.5">
              {PROVIDERS.map((provider) => {
                const active = selectedProvider === provider;
                const count =
                  provider === "All"
                    ? CHAT_MODELS.length
                    : CHAT_MODELS.filter(
                        (model) => getProvider(model.provider) === provider
                      ).length;

                return (
                  <button
                    key={provider}
                    type="button"
                    onClick={() => setSelectedProvider(provider)}
                    aria-pressed={active}
                    className={`flex w-full items-center justify-between rounded-xl border px-3.5 py-3 text-left text-sm transition ${
                      active
                        ? "border-[#D4AF37]/25 bg-[#D4AF37]/[0.08] font-medium text-[#E5C45B]"
                        : "border-transparent text-zinc-400 hover:border-white/[0.06] hover:bg-white/[0.04] hover:text-white"
                    }`}
                  >
                    <span>{provider}</span>
                    <span
                      className={`rounded-md px-2 py-0.5 text-[10px] tabular-nums ${
                        active
                          ? "bg-[#D4AF37]/10 text-[#D4AF37]"
                          : "bg-white/[0.04] text-zinc-500"
                      }`}
                    >
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="mt-auto rounded-2xl border border-[#D4AF37]/15 bg-gradient-to-br from-[#D4AF37]/[0.08] to-transparent p-4">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#D4AF37]/10 text-[#D4AF37]">
                <Sparkles className="h-4 w-4" />
              </div>
              <p className="mt-3 text-sm font-semibold text-zinc-200">
                Find your workflow
              </p>
              <p className="mt-1 text-xs leading-5 text-zinc-500">
                Browse by provider, search by task, and check availability.
              </p>
            </div>
          </aside>

          {/* Library area */}
          <main className="flex min-h-0 min-w-0 flex-1 flex-col">
            {/* Intro + search */}
            <div className="shrink-0 space-y-4 border-b border-white/[0.06] px-4 py-4 sm:px-6 lg:px-7 lg:py-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-semibold text-zinc-100 sm:text-base">
                    Explore models
                  </h3>
                  <p className="mt-1 text-xs text-zinc-500">
                    General guidance only. Actual capabilities depend on integration.
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-500/15 bg-emerald-500/[0.06] px-2.5 py-1.5 text-xs text-emerald-400">
                    <Check className="h-3.5 w-3.5" />
                    {availableCount} available
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-lg border border-white/[0.07] bg-white/[0.025] px-2.5 py-1.5 text-xs text-zinc-400">
                    <Lock className="h-3.5 w-3.5" />
                    {lockedCount} locked
                  </span>
                </div>
              </div>

              <div className="relative">
                <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search by model, provider, or use case..."
                  aria-label="Search models"
                  className="h-11 w-full rounded-xl border border-white/[0.08] bg-[#151519] pl-10 pr-4 text-sm text-white outline-none transition placeholder:text-zinc-600 hover:border-white/[0.13] focus:border-[#D4AF37]/45 focus:ring-2 focus:ring-[#D4AF37]/10"
                />
              </div>

              {/* Mobile / tablet provider filters */}
              <div className="flex gap-2 overflow-x-auto pb-1 lg:hidden">
                {PROVIDERS.map((provider) => {
                  const active = selectedProvider === provider;

                  return (
                    <button
                      key={provider}
                      type="button"
                      onClick={() => setSelectedProvider(provider)}
                      aria-pressed={active}
                      className={`shrink-0 rounded-full border px-3.5 py-2 text-xs font-medium transition ${
                        active
                          ? "border-[#D4AF37]/35 bg-[#D4AF37]/10 text-[#D4AF37]"
                          : "border-white/[0.08] bg-white/[0.025] text-zinc-400 hover:text-white"
                      }`}
                    >
                      {provider}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Scrollable model grid */}
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4 sm:px-6 lg:px-7 lg:py-6">
              {models.length === 0 ? (
                <div className="flex min-h-64 flex-col items-center justify-center text-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/[0.07] bg-white/[0.03]">
                    <Search className="h-5 w-5 text-zinc-500" />
                  </div>
                  <p className="mt-4 text-sm font-semibold text-zinc-200">
                    No models found
                  </p>
                  <p className="mt-1 text-xs text-zinc-500">
                    Try another search or provider.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setSearch("");
                      setSelectedProvider("All");
                    }}
                    className="mt-4 rounded-lg border border-[#D4AF37]/20 px-3 py-2 text-xs font-medium text-[#D4AF37] transition hover:bg-[#D4AF37]/[0.08]"
                  >
                    Clear filters
                  </button>
                </div>
              ) : (
                <>
                  <div className="mb-4 flex items-center justify-between">
                    <p className="text-xs text-zinc-500">
                      Showing{" "}
                      <span className="font-semibold text-zinc-300">
                        {models.length}
                      </span>{" "}
                      {models.length === 1 ? "model" : "models"}
                    </p>
                    <span className="hidden items-center gap-1.5 text-[11px] text-zinc-600 sm:inline-flex">
                      <BookOpen className="h-3.5 w-3.5" />
                      Model details
                    </span>
                  </div>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:gap-4">
                    {models.map((model) => {
                      const available =
                        !model.locked && model.apiModelId !== null;
                      const provider = getProvider(model.provider);
                      const info = MODEL_INFO[model.id];

                      return (
                        <article
                          key={model.id}
                          className="group relative flex min-w-0 flex-col overflow-hidden rounded-2xl border border-white/[0.075] bg-[#121216] p-4 transition-all duration-200 hover:-translate-y-0.5 hover:border-[#D4AF37]/25 hover:bg-[#17171C] hover:shadow-[0_12px_35px_rgba(0,0,0,0.2)] xl:p-5"
                        >
                          {/* Hover accent */}
                          <div
                            aria-hidden="true"
                            className="absolute inset-x-5 top-0 h-px bg-gradient-to-r from-transparent via-[#D4AF37]/0 to-transparent transition-all duration-300 group-hover:via-[#D4AF37]/50"
                          />

                          <div className="flex items-start gap-3">
                            <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-white/[0.07] bg-[#1B1B21] p-2.5">
                              <Image
                                src={
                                  PROVIDER_LOGOS[provider] ??
                                  "/model-logos/default.svg"
                                }
                                alt={`${provider} logo`}
                                width={28}
                                height={28}
                                className="h-full w-full object-contain"
                              />
                            </div>

                            <div className="min-w-0 flex-1">
                              <h4 className="break-words text-sm font-semibold leading-5 text-zinc-100">
                                {model.name}
                              </h4>
                              <p className="mt-1 text-xs text-zinc-500">
                                {provider}
                              </p>
                            </div>

                            <span
                              className={`inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-1 text-[10px] font-medium ${
                                available
                                  ? "border-emerald-500/15 bg-emerald-500/[0.06] text-emerald-400"
                                  : "border-zinc-700/70 bg-white/[0.025] text-zinc-500"
                              }`}
                            >
                              {available ? (
                                <Check className="h-3 w-3" />
                              ) : (
                                <Lock className="h-3 w-3" />
                              )}
                              {available ? "Ready" : "Locked"}
                            </span>
                          </div>

                          <p className="mt-4 text-xs leading-5 text-zinc-400">
                            {info?.description ??
                              "Details for this model have not been added yet."}
                          </p>

                          <div className="mt-4">
                            <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-600">
                              Best for
                            </p>
                            <div className="flex flex-wrap gap-1.5">
                              {(info?.bestFor ?? ["General tasks"]).map(
                                (item) => (
                                  <span
                                    key={item}
                                    className="rounded-md border border-white/[0.055] bg-white/[0.025] px-2 py-1 text-[10px] leading-4 text-zinc-400"
                                  >
                                    {item}
                                  </span>
                                )
                              )}
                            </div>
                          </div>

                          <div className="mt-4 flex flex-1 flex-col rounded-xl border border-white/[0.055] bg-black/20 p-3">
                            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-zinc-600">
                              Example prompt
                            </p>
                            <p className="mt-1.5 text-xs leading-5 text-zinc-400">
                              “{info?.example ?? "Ask a general question."}”
                            </p>
                          </div>

                          <div className="mt-4 flex items-center justify-between border-t border-white/[0.06] pt-3">
                            <span className="text-[10px] text-zinc-600">
                              {available
                                ? "Configured in ANVIX"
                                : "Integration pending"}
                            </span>
                            <ArrowUpRight className="h-3.5 w-3.5 text-zinc-600 transition group-hover:text-[#D4AF37]" />
                          </div>
                        </article>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          </main>
        </div>

        {/* Footer */}
        <footer className="flex shrink-0 flex-col gap-2 border-t border-white/[0.07] bg-[#0B0B0E] px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
          <p className="text-[11px] leading-4 text-zinc-500">
            Locked models are listed for reference and are not connected yet.
          </p>

          <button
            type="button"
            onClick={onClose}
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-2.5 text-xs font-medium text-zinc-300 transition hover:border-[#D4AF37]/25 hover:bg-[#D4AF37]/[0.06] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D4AF37]"
          >
            Back to chat
            <ArrowUpRight className="h-3.5 w-3.5" />
          </button>
        </footer>
      </section>
    </div>
  );
}