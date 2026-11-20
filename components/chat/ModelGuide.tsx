"use client";

import {
  useCallback,
  useEffect,
  useRef,
} from "react";
import Image from "next/image";
import {
  X,
  Check,
  Sparkles,
  ArrowUpDown,
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

// The only connected model. Locked entries in lib/chat-models.ts are a
// roadmap record — they are listed by name in the "Coming soon" section
// below, never described as if they were available.
const MODEL_INFO: Record<string, ModelInfo> = {
  "gemini-2.5-flash": {
    description:
      "A general-purpose option for everyday questions, coding help, writing, and explanations.",
    bestFor: ["Everyday questions", "Learning", "Coding", "Brainstorming"],
    example: "Explain React useEffect with a simple example.",
  },
};

export default function ModelGuide({ onClose }: ModelGuideProps) {
  const dialogRef = useRef<HTMLElement | null>(null);
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

  const connectedModels = CHAT_MODELS.filter(
    (model) => !model.locked && model.apiModelId !== null
  );

  // Names only — no descriptions, no availability promises, no dates.
  const comingSoonNames = CHAT_MODELS.filter(
    (model) => model.locked
  ).map((model) => model.name);

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
        className="flex max-h-[92dvh] w-full max-w-[640px] flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#0B0B0E] shadow-[0_30px_120px_rgba(0,0,0,0.7)] outline-none sm:rounded-3xl"
      >
        {/* Header */}
        <header className="flex shrink-0 items-center justify-between gap-4 border-b border-white/[0.07] px-4 py-3.5 sm:px-6 lg:py-5">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-white/10 bg-[#19191E]">
              <Image
                src="/anvix-logo.png"
                alt="AGI"
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

                <span className="rounded-full border border-[#FAFAFA]/20 bg-[#FAFAFA]/10 px-2 py-0.5 text-[10px] font-semibold tracking-wide text-[#FAFAFA]">
                  AGI
                </span>
              </div>

              <p
                id="model-guide-description"
                className="mt-0.5 hidden text-xs text-zinc-500 sm:block"
              >
                The model connected to AGI today.
              </p>
            </div>
          </div>

          <button
            ref={closeButtonRef}
            type="button"
            onClick={handleClose}
            aria-label="Close model library"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/[0.06] bg-white/[0.03] text-zinc-400 transition hover:border-white/15 hover:bg-white/[0.08] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FAFAFA]"
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        {/* Content */}
        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-5 sm:px-6">
          {connectedModels.map((model) => {
            const info = MODEL_INFO[model.id];

            return (
              <article
                key={model.id}
                className="relative flex min-w-0 flex-col overflow-hidden rounded-2xl border border-white/[0.075] bg-[#121216] p-4 xl:p-5"
              >
                <div className="flex items-start gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-white/[0.07] bg-[#1B1B21] p-2.5">
                    <Image
                      src="/model-logos/google.svg"
                      alt="Google logo"
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
                      {model.provider}
                    </p>
                  </div>

                  <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-emerald-500/15 bg-emerald-500/[0.06] px-2 py-1 text-[10px] font-medium text-emerald-400">
                    <Check className="h-3 w-3" />
                    Ready
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
                    {(info?.bestFor ?? ["General tasks"]).map((item) => (
                      <span
                        key={item}
                        className="rounded-md border border-white/[0.055] bg-white/[0.025] px-2 py-1 text-[10px] leading-4 text-zinc-400"
                      >
                        {item}
                      </span>
                    ))}
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
                    Configured in ANVIX
                  </span>
                </div>
              </article>
            );
          })}

          {/* Coming soon — names only, no promise of a date. */}
          {comingSoonNames.length > 0 && (
            <div className="mt-4 rounded-2xl border border-white/[0.07] bg-white/[0.015] p-4 sm:p-5">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#FAFAFA]/10 text-[#FAFAFA]">
                  <Sparkles className="h-4 w-4" />
                </div>

                <h3 className="text-sm font-semibold text-zinc-200">
                  Coming soon
                </h3>
              </div>

              <p className="mt-3 text-xs leading-5 text-zinc-500">
                These models are not connected yet:{" "}
                {comingSoonNames.join(", ")}. No date is promised — they
                will be listed here when they are connected.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <footer className="flex shrink-0 flex-col gap-2 border-t border-white/[0.07] bg-[#0B0B0E] px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p className="text-[11px] leading-4 text-zinc-500">
            Only Gemini 2.5 Flash is connected today. Other models will
            be listed here when they are connected.
          </p>

          <button
            type="button"
            onClick={handleClose}
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-2.5 text-xs font-medium text-zinc-300 transition hover:border-[#FAFAFA]/25 hover:bg-[#FAFAFA]/[0.06] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FAFAFA]"
          >
            Back to chat
            <ArrowUpDown className="h-3.5 w-3.5 rotate-45" />
          </button>
        </footer>
      </section>
    </div>
  );
}
