
"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import Image from "next/image";
import {
  X,
  Lock,
  Check,
  Sparkles,
  Search,
  SlidersHorizontal,
  BookOpen,
  ArrowUpDown,
  Command,
  RotateCcw,
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

type AvailabilityFilter = "all" | "available" | "locked";
type SortOption = "default" | "name" | "provider";

const MODEL_INFO: Record<string, ModelInfo> = {
  "gemini-2.5-flash": {
    description:
      "A general-purpose option for everyday questions, coding help, writing, and explanations.",
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
      "An OpenAI model entry. Actual capabilities depend on the configured provider integration.",
    bestFor: ["Complex questions", "Multi-step tasks", "Coding", "Structured responses"],
    example: "Break a feature into frontend, backend, and database tasks.",
  },
  "gpt-4.1": {
    description:
      "An OpenAI model entry for instruction-following and coding workflows.",
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
      "An OpenAI model entry for general-purpose assistant tasks, depending on integration.",
    bestFor: ["Writing", "Conversation", "Coding", "Supported multimodal tasks"],
    example: "Help me organize the steps for building a portfolio website.",
  },
  o3: {
    description:
      "An OpenAI reasoning-oriented model entry for tasks that may benefit from multiple steps.",
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
  xAI: "/model-logos/xai.svg",
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

function isModelAvailable(model: (typeof CHAT_MODELS)[number]) {
  return !model.locked && model.apiModelId !== null;
}

export default function ModelGuide({ onClose }: ModelGuideProps) {
  const dialogRef = useRef<HTMLElement | null>(null);
  const searchRef = useRef<HTMLInputElement | null>(null);

  const [search, setSearch] = useState("");
  const [selectedProvider, setSelectedProvider] = useState("All");
  const [availability, setAvailability] =
    useState<AvailabilityFilter>("all");
  const [sortBy, setSortBy] = useState<SortOption>("default");

  const closeButtonRef = useRef<HTMLButtonElement | null>(null);

  const handleClose = useCallback(() => {
    onClose();
  }, [onClose]);

  useEffect(() => {
    const previousFocus = document.activeElement as HTMLElement | null;

    closeButtonRef.current?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        handleClose();
      }

      if (event.key === "/" && !event.ctrlKey && !event.metaKey) {
        const target = event.target as HTMLElement | null;
        const tag = target?.tagName.toLowerCase();

        if (
          tag !== "input" &&
          tag !== "textarea" &&
          !target?.isContentEditable
        ) {
          event.preventDefault();
          searchRef.current?.focus();
        }
      }

      if (event.key === "Tab" && dialogRef.current) {
        const focusable = dialogRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), input:not([disabled]), select:not([disabled]), [href], [tabindex]:not([tabindex="-1"])'
        );

        if (!focusable.length) return;

        const first = focusable[0];
        const last = focusable[focusable.length - 1];

        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (
          !event.shiftKey &&
          document.activeElement === last
        ) {
          event.preventDefault();
          first.focus();
        }
      }
    }

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      previousFocus?.focus();
    };
  }, [handleClose]);

  const availableCount = useMemo(
    () => CHAT_MODELS.filter(isModelAvailable).length,
    []
  );

  const lockedCount = CHAT_MODELS.length - availableCount;

  const providerCounts = useMemo(() => {
    const counts: Record<string, number> = {
      All: CHAT_MODELS.length,
    };

    for (const model of CHAT_MODELS) {
      const provider = getProvider(model.provider);
      counts[provider] = (counts[provider] ?? 0) + 1;
    }

    return counts;
  }, []);

  const models = useMemo(() => {
    const searchText = search.trim().toLowerCase();

    const filtered = CHAT_MODELS.filter((model) => {
      const provider = getProvider(model.provider);
      const info = MODEL_INFO[model.id];
      const available = isModelAvailable(model);

      const matchesProvider =
        selectedProvider === "All" || provider === selectedProvider;

      const matchesAvailability =
        availability === "all" ||
        (availability === "available" && available) ||
        (availability === "locked" && !available);

      const matchesSearch =
        !searchText ||
        model.name.toLowerCase().includes(searchText) ||
        model.provider.toLowerCase().includes(searchText) ||
        model.id.toLowerCase().includes(searchText) ||
        info?.description.toLowerCase().includes(searchText) ||
        info?.bestFor.some((item) =>
          item.toLowerCase().includes(searchText)
        );

      return (
        matchesProvider &&
        matchesAvailability &&
        matchesSearch
      );
    });

    if (sortBy === "name") {
      filtered.sort((a, b) => a.name.localeCompare(b.name));
    } else if (sortBy === "provider") {
      filtered.sort((a, b) =>
        getProvider(a.provider).localeCompare(getProvider(b.provider))
      );
    }

    return filtered;
  }, [search, selectedProvider, availability, sortBy]);

  const clearFilters = useCallback(() => {
    setSearch("");
    setSelectedProvider("All");
    setAvailability("all");
    setSortBy("default");
  }, []);

  const hasActiveFilters =
    search.trim() !== "" ||
    selectedProvider !== "All" ||
    availability !== "all" ||
    sortBy !== "default";

  return (
    <div
      className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/75 p-2 backdrop-blur-md sm:p-5 lg:p-8"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          handleClose();
        }
      }}
    >
      <section
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="model-guide-title"
        aria-describedby="model-guide-description"
        tabIndex={-1}
        className="flex h-[96dvh] max-h-[1000px] w-full max-w-[1500px] flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#0B0B0E] shadow-[0_30px_120px_rgba(0,0,0,0.7)] outline-none sm:rounded-3xl"
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

              <p
                id="model-guide-description"
                className="mt-0.5 hidden text-xs text-zinc-500 sm:block"
              >
                Explore models, filter by provider, and check availability.
              </p>
            </div>
          </div>

          <button
            ref={closeButtonRef}
            type="button"
            onClick={handleClose}
            aria-label="Close model library"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/[0.06] bg-white/[0.03] text-zinc-400 transition hover:border-white/15 hover:bg-white/[0.08] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D4AF37]"
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        {/* Main content */}
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden lg:flex-row">
          {/* Provider sidebar */}
          <aside className="hidden w-[235px] shrink-0 flex-col border-r border-white/[0.07] bg-white/[0.015] p-5 lg:flex xl:w-[260px] xl:p-6">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500">
              <SlidersHorizontal className="h-3.5 w-3.5" />
              Providers
            </div>

            <div className="mt-4 space-y-1.5">
              {PROVIDERS.map((provider) => {
                const active = selectedProvider === provider;
                const count = providerCounts[provider] ?? 0;

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
                Search by model name, provider, or task.
              </p>

              <p className="mt-3 flex items-center gap-1.5 text-[10px] text-zinc-600">
                <Command className="h-3 w-3" />
                Press / to search
              </p>
            </div>
          </aside>

          {/* Library */}
          <main className="flex min-h-0 min-w-0 flex-1 flex-col">
            {/* Search and filters */}
            <div className="shrink-0 space-y-4 border-b border-white/[0.06] px-4 py-4 sm:px-6 lg:px-7 lg:py-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-semibold text-zinc-100 sm:text-base">
                    Explore models
                  </h3>

                  <p className="mt-1 text-xs text-zinc-500">
                    {CHAT_MODELS.length} listed · {availableCount} configured · {lockedCount} locked
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-500/15 bg-emerald-500/[0.06] px-2.5 py-1.5 text-xs text-emerald-400">
                    <Check className="h-3.5 w-3.5" />
                    {availableCount} ready
                  </span>

                  <span className="inline-flex items-center gap-1.5 rounded-lg border border-white/[0.07] bg-white/[0.025] px-2.5 py-1.5 text-xs text-zinc-400">
                    <Lock className="h-3.5 w-3.5" />
                    {lockedCount}
                  </span>
                </div>
              </div>

              <div className="flex flex-col gap-2 sm:flex-row">
                <div className="relative min-w-0 flex-1">
                  <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />

                  <input
                    ref={searchRef}
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search models, providers, or use cases..."
                    aria-label="Search models"
                    className="h-11 w-full rounded-xl border border-white/[0.08] bg-[#151519] pl-10 pr-4 text-sm text-white outline-none transition placeholder:text-zinc-600 hover:border-white/[0.13] focus:border-[#D4AF37]/45 focus:ring-2 focus:ring-[#D4AF37]/10"
                  />
                </div>

                <div className="flex gap-2">
                  <select
                    value={availability}
                    onChange={(event) =>
                      setAvailability(event.target.value as AvailabilityFilter)
                    }
                    aria-label="Filter by availability"
                    className="h-11 min-w-0 flex-1 rounded-xl border border-white/[0.08] bg-[#151519] px-3 text-xs text-zinc-300 outline-none focus:border-[#D4AF37]/45 focus:ring-2 focus:ring-[#D4AF37]/10 sm:flex-none"
                  >
                    <option value="all">All statuses</option>
                    <option value="available">Ready only</option>
                    <option value="locked">Locked only</option>
                  </select>

                  <div className="relative">
                    <ArrowUpDown className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-500" />

                    <select
                      value={sortBy}
                      onChange={(event) =>
                        setSortBy(event.target.value as SortOption)
                      }
                      aria-label="Sort models"
                      className="h-11 w-full rounded-xl border border-white/[0.08] bg-[#151519] pl-8 pr-3 text-xs text-zinc-300 outline-none focus:border-[#D4AF37]/45 focus:ring-2 focus:ring-[#D4AF37]/10 sm:w-auto"
                    >
                      <option value="default">Default order</option>
                      <option value="name">Name A–Z</option>
                      <option value="provider">Provider</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Mobile provider filters */}
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
                      <span className="ml-1.5 text-[10px] opacity-60">
                        {providerCounts[provider] ?? 0}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Results */}
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4 sm:px-6 lg:px-7 lg:py-6">
              <div className="mb-4 flex items-center justify-between gap-3">
                <p className="text-xs text-zinc-500" aria-live="polite">
                  Showing{" "}
                  <span className="font-semibold text-zinc-300">
                    {models.length}
                  </span>{" "}
                  {models.length === 1 ? "model" : "models"}
                </p>

                {hasActiveFilters && (
                  <button
                    type="button"
                    onClick={clearFilters}
                    className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs text-zinc-500 transition hover:bg-white/[0.04] hover:text-[#D4AF37] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#D4AF37]"
                  >
                    <RotateCcw className="h-3 w-3" />
                    Reset filters
                  </button>
                )}
              </div>

              {models.length === 0 ? (
                <div className="flex min-h-64 flex-col items-center justify-center text-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/[0.07] bg-white/[0.03]">
                    <Search className="h-5 w-5 text-zinc-500" />
                  </div>

                  <p className="mt-4 text-sm font-semibold text-zinc-200">
                    No models found
                  </p>

                  <p className="mt-1 text-xs text-zinc-500">
                    Try another search or adjust your filters.
                  </p>

                  <button
                    type="button"
                    onClick={clearFilters}
                    className="mt-4 rounded-lg border border-[#D4AF37]/20 px-3 py-2 text-xs font-medium text-[#D4AF37] transition hover:bg-[#D4AF37]/[0.08]"
                  >
                    Clear filters
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:gap-4">
                  {models.map((model) => {
                    const available = isModelAvailable(model);
                    const provider = getProvider(model.provider);
                    const info = MODEL_INFO[model.id];

                    return (
                      <article
                        key={model.id}
                        className="group relative flex min-w-0 flex-col overflow-hidden rounded-2xl border border-white/[0.075] bg-[#121216] p-4 transition-all duration-200 hover:-translate-y-0.5 hover:border-[#D4AF37]/25 hover:bg-[#17171C] hover:shadow-[0_12px_35px_rgba(0,0,0,0.2)] motion-reduce:transform-none motion-reduce:transition-none xl:p-5"
                      >
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

                        <div className="mt-4 flex items-center justify-between gap-2 border-t border-white/[0.06] pt-3">
                          <span className="text-[10px] text-zinc-600">
                            {available
                              ? "Configured in ANVIX"
                              : "Integration pending"}
                          </span>

                          <BookOpen className="h-3.5 w-3.5 text-zinc-600" />
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </div>
          </main>
        </div>

        {/* Footer */}
        <footer className="flex shrink-0 flex-col gap-2 border-t border-white/[0.07] bg-[#0B0B0E] px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
          <p className="text-[11px] leading-4 text-zinc-500">
            Listed models are informational. Availability reflects your current model configuration.
          </p>

          <button
            type="button"
            onClick={handleClose}
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-2.5 text-xs font-medium text-zinc-300 transition hover:border-[#D4AF37]/25 hover:bg-[#D4AF37]/[0.06] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D4AF37]"
          >
            Back to chat
            <ArrowUpDown className="h-3.5 w-3.5 rotate-45" />
          </button>
        </footer>
      </section>
    </div>
  );
}