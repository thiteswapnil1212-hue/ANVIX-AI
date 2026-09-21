
"use client";

import { useEffect } from "react";
import { BookOpen, X, Lock, Check, Sparkles } from "lucide-react";
import { CHAT_MODELS } from "@/lib/chat-models";

type ModelGuideProps = {
  onClose: () => void;
};

const MODEL_USE_CASES: Record<string, string> = {
  "gemini-2.5-flash":
    "Everyday questions, explanations, brainstorming, writing, and coding help.",
  "gemini-2.5-flash-lite":
    "Quick questions, short summaries, simple rewrites, and lightweight tasks.",
  "gemini-2.0-flash":
    "General-purpose prompts, basic explanations, and comparing responses.",

  "gpt-5.5":
    "General guidance: complex questions, reasoning, coding, and multi-step tasks.",
  "gpt-4.1":
    "General guidance: coding, following detailed instructions, and structured outputs.",
  "gpt-6-astra":
    "Reserved for future integration. Capabilities are not verified.",
  "gpt-4o":
    "General guidance: writing, coding, conversations, and multimodal tasks.",
  o3:
    "General guidance: challenging reasoning, mathematics, and problem-solving.",

  "claude-opus":
    "General guidance: complex analysis, long-form writing, and demanding coding tasks.",
  "claude-sonnet":
    "General guidance: coding, analysis, writing, and everyday professional tasks.",
  "claude-haiku":
    "General guidance: quick responses, simple explanations, and lightweight tasks.",

  "deepseek-chat":
    "General guidance: everyday questions, writing, explanations, and coding.",
  "deepseek-reasoner":
    "General guidance: multi-step reasoning, mathematics, and challenging problems.",

  grok:
    "General guidance: conversations, brainstorming, and exploring ideas.",
  "grok-fast":
    "General guidance: quick responses and lightweight conversational tasks.",
};

export default function ModelGuide({ onClose }: ModelGuideProps) {
  useEffect(() => {
    function handleEscape(event: globalThis.KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("keydown", handleEscape);
    };
  }, [onClose]);

  return (
    <div
      className="
        fixed inset-0 z-[10000] flex items-center
        justify-center bg-black/60 p-4
        backdrop-blur-sm
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
          flex max-h-[min(80vh,720px)] w-full
          max-w-xl flex-col overflow-hidden
          rounded-2xl border border-zinc-800
          bg-[#17171B] shadow-[0_24px_80px_rgba(0,0,0,0.6)]
        "
      >
        {/* Header */}
        <div className="
          flex items-center justify-between gap-3
          border-b border-zinc-800 px-5 py-4
        ">
          <div className="flex min-w-0 items-center gap-3">
            <div className="
              flex h-10 w-10 shrink-0 items-center
              justify-center rounded-xl
              border border-[#D4AF37]/25
              bg-[#D4AF37]/10 text-[#D4AF37]
            ">
              <BookOpen className="h-5 w-5" />
            </div>

            <div>
              <h2
                id="model-guide-title"
                className="font-semibold text-zinc-100"
              >
                Model Guide
              </h2>
              <p className="text-xs text-zinc-500">
                Find the right model for your task
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close model guide"
            className="
              flex h-9 w-9 shrink-0 items-center
              justify-center rounded-lg
              text-zinc-400 transition
              hover:bg-zinc-800 hover:text-white
            "
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Intro */}
        <div className="px-5 pt-4">
          <div className="
            flex items-start gap-2 rounded-xl
            border border-[#D4AF37]/15
            bg-[#D4AF37]/5 p-3
          ">
            <Sparkles className="
              mt-0.5 h-4 w-4 shrink-0 text-[#D4AF37]
            " />
            <p className="text-xs leading-5 text-zinc-400">
              Start with Gemini 2.5 Flash for everyday
              tasks. The descriptions below are general
              guidance, not guaranteed performance.
            </p>
          </div>
        </div>

        {/* Model list */}
        <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-5">
          {CHAT_MODELS.map((model) => {
            const available =
              !model.locked && model.apiModelId !== null;

            return (
              <article
                key={model.id}
                className="
                  rounded-xl border border-zinc-800
                  bg-[#1D1D22] p-3.5 transition
                  hover:border-zinc-700
                "
              >
                <div className="
                  flex items-start justify-between gap-3
                ">
                  <div className="min-w-0">
                    <h3 className="
                      break-words text-sm font-semibold
                      text-zinc-100
                    ">
                      {model.name}
                    </h3>
                    <p className="mt-1 text-xs text-zinc-500">
                      {model.provider}
                    </p>
                  </div>

                  <span
                    className={`
                      inline-flex shrink-0 items-center
                      gap-1 rounded-full border px-2 py-1
                      text-[10px] font-medium
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

                <p className="
                  mt-3 text-xs leading-5 text-zinc-400
                ">
                  {MODEL_USE_CASES[model.id] ??
                    "Use case information coming soon."}
                </p>
              </article>
            );
          })}
        </div>

        {/* Footer */}
        <div className="
          border-t border-zinc-800 px-5 py-3
          text-center text-[11px] text-zinc-600
        ">
          Locked models are listed for reference only
          and are not connected to ANVIX yet.
        </div>
      </section>
    </div>
  );
}