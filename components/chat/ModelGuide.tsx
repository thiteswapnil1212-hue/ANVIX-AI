
"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import {
  BookOpen,
  X,
  Lock,
  Check,
  Sparkles,
  Search,
  ArrowUpRight,
  Cpu,
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
    bestFor: [
      "Everyday questions",
      "Learning and explanations",
      "Coding assistance",
      "Brainstorming",
    ],
    example: "Explain React useEffect with a simple example.",
  },

  "gemini-2.5-flash-lite": {
    description:
      "A lightweight option for short, straightforward tasks where a concise response is useful.",
    bestFor: [
      "Quick questions",
      "Short summaries",
      "Simple rewrites",
      "Basic explanations",
    ],
    example: "Summarize this paragraph in 3 bullet points.",
  },

  "gemini-2.0-flash": {
    description:
      "A general-purpose option for common prompts, explanations, and basic coding questions.",
    bestFor: [
      "General questions",
      "Simple coding help",
      "Text explanations",
      "Comparing ideas",
    ],
    example: "Explain the difference between an array and a linked list.",
  },

  "gpt-5.5": {
    description:
      "Listed as an OpenAI model option. Its availability and capabilities depend on the connected provider integration.",
    bestFor: [
      "Complex questions",
      "Multi-step tasks",
      "Coding assistance",
      "Structured responses",
    ],
    example: "Break this feature into frontend, backend, and database tasks.",
  },

  "gpt-4.1": {
    description:
      "An OpenAI model option commonly associated with instruction-following and coding workflows.",
    bestFor: [
      "Coding assistance",
      "Detailed instructions",
      "Structured outputs",
      "Text analysis",
    ],
    example: "Review this function and explain what each part does.",
  },

  "gpt-6-astra": {
    description:
      "A reserved model entry. Its identity, capabilities, and integration have not been verified.",
    bestFor: [
      "Reserved for future integration",
    ],
    example: "Model details will be added after integration is verified.",
  },

  "gpt-4o": {
    description:
      "An OpenAI model option designed for general-purpose assistant tasks, including supported multimodal workflows.",
    bestFor: [
      "Writing and conversation",
      "Coding assistance",
      "General questions",
      "Supported multimodal tasks",
    ],
    example: "Help me organize the steps for building a portfolio website.",
  },

  o3: {
    description:
      "An OpenAI reasoning-oriented model option intended for challenging problem-solving tasks.",
    bestFor: [
      "Complex problem-solving",
      "Mathematics",
      "Logical reasoning",
      "Step-by-step analysis",
    ],
    example: "Help me reason through this algorithm's time complexity.",
  },

  "claude-opus": {
    description:
      "An Anthropic model entry intended for demanding analysis and writing workflows, subject to the actual integration.",
    bestFor: [
      "Detailed analysis",
      "Long-form writing",
      "Complex coding tasks",
      "Working through lengthy material",
    ],
    example: "Help me plan the architecture of a multi-page web application.",
  },

  "claude-sonnet": {
    description:
      "An Anthropic model entry for a range of coding, writing, and analysis workflows.",
    bestFor: [
      "Coding assistance",
      "Writing",
      "Analysis",
      "General productivity",
    ],
    example: "Explain this API route and suggest how to organize it.",
  },

  "claude-haiku": {
    description:
      "An Anthropic model entry for lightweight tasks and concise assistance.",
    bestFor: [
      "Quick questions",
      "Short explanations",
      "Simple rewrites",
      "Lightweight tasks",
    ],
    example: "Rewrite this sentence to make it clearer.",
  },

  "deepseek-chat": {
    description:
      "A DeepSeek model entry for general conversation, text tasks, and coding assistance.",
    bestFor: [
      "General questions",
      "Coding help",
      "Writing",
      "Explanations",
    ],
    example: "Explain this Python code in beginner-friendly language.",
  },

  "deepseek-reasoner": {
    description:
      "A DeepSeek reasoning-oriented model entry for tasks that benefit from working through multiple steps.",
    bestFor: [
      "Multi-step reasoning",
      "Mathematics",
      "Problem-solving",
      "Algorithm discussions",
    ],
    example: "Walk me through the logic of this binary search solution.",
  },

  grok: {
    description:
      "An xAI model entry for conversational prompts and exploring ideas, depending on the connected model.",
    bestFor: [
      "Conversation",
      "Brainstorming",
      "Exploring ideas",
      "General questions",
    ],
    example: "Give me several possible approaches to this project idea.",
  },

  "grok-fast": {
    description:
      "An xAI model entry intended for quick responses and lightweight conversational tasks.",
    bestFor: [
      "Quick questions",
      "Short responses",
      "Simple explanations",
      "Lightweight tasks",
    ],
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

  if (
    normalized.includes("claude") ||
    normalized.includes("anthropic")
  ) {
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
      if (event.key === "Escape") {
        onClose();
      }
    }

    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("keydown", handleEscape);
    };
  }, [onClose]);

  const models = useMemo(() => {
    const searchText = search.trim().toLowerCase();

    return CHAT_MODELS.filter((model) => {
      const provider = getProvider(model.provider);
      const info = MODEL_INFO[model.id];

      const matchesProvider =
        selectedProvider === "All" ||
        provider === selectedProvider;

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

  return (
    <div
      className="
        fixed inset-0 z-[10000] flex items-center
        justify-center bg-black/70 p-3
        backdrop-blur-md sm:p-6
      "
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="model-guide-title"
        className="
          flex max-h-[90vh] w-full max-w-5xl
          flex-col overflow-hidden rounded-3xl
          border border-white/10 bg-[#111114]
          shadow-[0_24px_100px_rgba(0,0,0,0.7)]
        "
      >
        {/* Header */}
        <header
          className="
            flex items-center justify-between gap-4
            border-b border-white/[0.08]
            px-5 py-4 sm:px-7
          "
        >
          <div className="flex min-w-0 items-center gap-3">
            <div
              className="
                flex h-11 w-11 shrink-0 items-center
                justify-center overflow-hidden rounded-xl
                border border-white/10 bg-[#1c1c21]
              "
            >
              <Image
                src="/anvix-logo.png"
                alt="ANVIX AI"
                width={40}
                height={40}
                className="h-full w-full object-contain"
              />
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2
                  id="model-guide-title"
                  className="text-base font-semibold text-white sm:text-lg"
                >
                  Model Library
                </h2>

                <span
                  className="
                    rounded-full border border-[#D4AF37]/20
                    bg-[#D4AF37]/10 px-2 py-0.5
                    text-[10px] font-medium text-[#D4AF37]
                  "
                >
                  ANVIX AI
                </span>
              </div>

              <p className="mt-0.5 text-xs text-zinc-500">
                Explore models and find one for your task
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close model guide"
            className="
              flex h-10 w-10 shrink-0 items-center
              justify-center rounded-xl
              text-zinc-400 transition
              hover:bg-white/10 hover:text-white
            "
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        {/* Intro */}
        <div className="px-5 pt-5 sm:px-7">
          <div
            className="
              relative overflow-hidden rounded-2xl
              border border-[#D4AF37]/20
              bg-gradient-to-r from-[#D4AF37]/10
              via-[#D4AF37]/5 to-transparent
              p-4 sm:p-5
            "
          >
            <div className="flex items-start gap-3">
              <div
                className="
                  flex h-10 w-10 shrink-0 items-center
                  justify-center rounded-xl
                  bg-[#D4AF37]/10 text-[#D4AF37]
                "
              >
                <Sparkles className="h-5 w-5" />
              </div>

              <div className="min-w-0 flex-1">
                <h3 className="text-sm font-semibold text-zinc-100">
                  Choose a model for your workflow
                </h3>

                <p className="mt-1 max-w-2xl text-xs leading-5 text-zinc-400">
                  Different models may suit different tasks.
                  These descriptions are general guidance, not
                  benchmark results or guarantees. Availability
                  reflects the configuration in ANVIX AI.
                </p>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <div
                className="
                  inline-flex items-center gap-2 rounded-lg
                  border border-white/[0.08] bg-black/20
                  px-3 py-2 text-xs text-zinc-300
                "
              >
                <Check className="h-3.5 w-3.5 text-emerald-400" />
                {availableCount} available
              </div>

              <div
                className="
                  inline-flex items-center gap-2 rounded-lg
                  border border-white/[0.08] bg-black/20
                  px-3 py-2 text-xs text-zinc-300
                "
              >
                <Lock className="h-3.5 w-3.5 text-zinc-500" />
                {CHAT_MODELS.length - availableCount} locked
              </div>

              <div
                className="
                  inline-flex items-center gap-2 rounded-lg
                  border border-white/[0.08] bg-black/20
                  px-3 py-2 text-xs text-zinc-300
                "
              >
                <Cpu className="h-3.5 w-3.5 text-[#D4AF37]" />
                {CHAT_MODELS.length} listed models
              </div>
            </div>
          </div>
        </div>

        {/* Search and filters */}
        <div className="space-y-3 px-5 pt-5 sm:px-7">
          <div className="relative">
            <Search
              className="
                pointer-events-none absolute left-3.5
                top-1/2 h-4 w-4 -translate-y-1/2
                text-zinc-500
              "
            />

            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search models, providers, or use cases..."
              aria-label="Search models"
              className="
                h-11 w-full rounded-xl
                border border-white/10
                bg-[#19191e] pl-10 pr-4
                text-sm text-white outline-none
                placeholder:text-zinc-600
                transition focus:border-[#D4AF37]/50
              "
            />
          </div>

          <div className="flex gap-2 overflow-x-auto pb-1">
            {PROVIDERS.map((provider) => {
              const active = selectedProvider === provider;

              return (
                <button
                  key={provider}
                  type="button"
                  onClick={() => setSelectedProvider(provider)}
                  aria-pressed={active}
                  className={`
                    shrink-0 rounded-full border
                    px-3.5 py-2 text-xs font-medium
                    transition
                    ${
                      active
                        ? "border-[#D4AF37]/40 bg-[#D4AF37]/10 text-[#D4AF37]"
                        : "border-white/[0.08] bg-[#19191e] text-zinc-400 hover:border-white/20 hover:text-white"
                    }
                  `}
                >
                  {provider}
                </button>
              );
            })}
          </div>
        </div>

        {/* Model cards */}
        <div
          className="
            min-h-0 flex-1 overflow-y-auto
            px-5 py-5 sm:px-7
          "
        >
          {models.length === 0 ? (
            <div className="flex min-h-40 flex-col items-center justify-center text-center">
              <Search className="mb-3 h-6 w-6 text-zinc-600" />
              <p className="text-sm font-medium text-zinc-300">
                No models found
              </p>
              <p className="mt-1 text-xs text-zinc-500">
                Try another search or provider.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {models.map((model) => {
                const available =
                  !model.locked && model.apiModelId !== null;

                const provider = getProvider(model.provider);
                const info = MODEL_INFO[model.id];

                return (
                  <article
                    key={model.id}
                    className="
                      group flex flex-col rounded-2xl
                      border border-white/[0.08]
                      bg-[#19191e] p-4
                      transition duration-200
                      hover:border-[#D4AF37]/30
                      hover:bg-[#1d1d23]
                    "
                  >
                    {/* Model heading */}
                    <div className="flex items-start gap-3">
                      <div
                        className="
                          flex h-10 w-10 shrink-0
                          items-center justify-center
                          overflow-hidden rounded-xl
                          border border-white/[0.08]
                          bg-[#222228] p-2
                        "
                      >
                        <Image
                          src={
                            PROVIDER_LOGOS[provider] ??
                            "/model-logos/default.svg"
                          }
                          alt={`${provider} logo`}
                          width={28}
                          height={28}
                          className="h-full w-full object-contain"
                          onError={(event) => {
                            event.currentTarget.style.display = "none";
                          }}
                        />
                      </div>

                      <div className="min-w-0 flex-1">
                        <h3 className="break-words text-sm font-semibold text-zinc-100">
                          {model.name}
                        </h3>

                        <p className="mt-1 text-xs text-zinc-500">
                          {provider}
                        </p>
                      </div>

                      <span
                        className={`
                          inline-flex shrink-0 items-center
                          gap-1 rounded-full border
                          px-2 py-1 text-[10px] font-medium
                          ${
                            available
                              ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-400"
                              : "border-zinc-700 bg-zinc-800/70 text-zinc-500"
                          }
                        `}
                      >
                        {available ? (
                          <Check className="h-3 w-3" />
                        ) : (
                          <Lock className="h-3 w-3" />
                        )}

                        {available ? "Available" : "Coming soon"}
                      </span>
                    </div>

                    {/* Description */}
                    <p className="mt-4 text-xs leading-5 text-zinc-400">
                      {info?.description ??
                        "Details for this model have not been added yet."}
                    </p>

                    {/* Best for */}
                    <div className="mt-4">
                      <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
                        Best for
                      </p>

                      <div className="flex flex-wrap gap-1.5">
                        {(info?.bestFor ?? ["General tasks"]).map(
                          (item) => (
                            <span
                              key={item}
                              className="
                                rounded-md border
                                border-white/[0.06]
                                bg-white/[0.03]
                                px-2 py-1 text-[10px]
                                text-zinc-400
                              "
                            >
                              {item}
                            </span>
                          )
                        )}
                      </div>
                    </div>

                    {/* Example prompt */}
                    <div
                      className="
                        mt-4 flex flex-1 flex-col
                        rounded-xl border border-white/[0.06]
                        bg-black/20 p-3
                      "
                    >
                      <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-zinc-600">
                        Example prompt
                      </p>

                      <p className="mt-1.5 text-xs leading-5 text-zinc-400">
                        “{info?.example ?? "Ask a general question."}”
                      </p>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <footer
          className="
            flex flex-col gap-2 border-t
            border-white/[0.08] px-5 py-3
            sm:flex-row sm:items-center
            sm:justify-between sm:px-7
          "
        >
          <p className="text-[11px] leading-4 text-zinc-500">
            Locked models are listed for reference and are not
            connected to ANVIX yet.
          </p>

          <button
            type="button"
            onClick={onClose}
            className="
              inline-flex shrink-0 items-center
              justify-center gap-2 rounded-lg
              bg-white/[0.06] px-3 py-2
              text-xs font-medium text-zinc-300
              transition hover:bg-white/10
              hover:text-white
            "
          >
            Back to chat
            <ArrowUpRight className="h-3.5 w-3.5" />
          </button>
        </footer>
      </section>
    </div>
  );
}