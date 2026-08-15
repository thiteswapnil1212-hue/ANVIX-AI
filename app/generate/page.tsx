"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import AppShell from "@/components/layout/AppShell";
import {
  Sparkles,
  ArrowRight,
  Keyboard,
  WandSparkles,
  Layers3,
  Zap,
  Check,
} from "lucide-react";

const examples = [
  {
    title: "AI Recruiting",
    description: "Candidate scoring, analytics and hiring workflows",
    prompt:
      "Build a premium AI recruiting platform with candidate scoring and analytics",
    icon: WandSparkles,
  },
  {
    title: "Developer Workspace",
    description: "Internal tools with authentication and billing",
    prompt:
      "Create a developer workspace for shipping internal tools with auth and billing",
    icon: Layers3,
  },
  {
    title: "AI Research Cockpit",
    description: "Knowledge graphs, notebooks and collaboration",
    prompt:
      "Design a private AI research cockpit with knowledge graphs and shared notebooks",
    icon: Zap,
  },
];

const MAX_CHARS = 2200;

export default function GeneratePage() {
  const router = useRouter();

  const [prompt, setPrompt] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const trimmedPrompt = prompt.trim();
  const remainingChars = MAX_CHARS - prompt.length;
  const canGenerate = trimmedPrompt.length > 0 && !isSubmitting;

  function handleGenerate() {
    if (!canGenerate) return;

    setIsSubmitting(true);

    setTimeout(() => {
      router.push("/workspace/anvix-generated");
    }, 900);
  }

  function handleKeyDown(
    event: React.KeyboardEvent<HTMLTextAreaElement>
  ) {
    if (
      event.key === "Enter" &&
      (event.metaKey || event.ctrlKey)
    ) {
      event.preventDefault();
      handleGenerate();
    }
  }

  return (
    <AppShell
      title="Generate App"
      description="Describe what you want to build and ANVIX will turn your idea into a structured workspace."
    >
      <div className="mx-auto w-full max-w-6xl space-y-8">

        {/* HERO */}
        <section className="relative overflow-hidden rounded-3xl border border-zinc-800/80 bg-[#111113] px-6 py-8 sm:px-8 sm:py-10">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-32 -top-32 h-80 w-80 rounded-full bg-[#D4AF37]/10 blur-[110px]"
          />

          <div
            aria-hidden="true"
            className="pointer-events-none absolute -bottom-40 left-1/3 h-72 w-72 rounded-full bg-[#D4AF37]/5 blur-[100px]"
          />

          <div className="relative">
            <div className="mb-5 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#D4AF37]/20 bg-[#D4AF37]/10">
                <Sparkles
                  className="h-5 w-5 text-[#D4AF37]"
                  aria-hidden="true"
                />
              </div>

              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#D4AF37]">
                  ANVIX AI BUILDER
                </p>
                <p className="mt-0.5 text-xs text-zinc-500">
                  From idea to workspace
                </p>
              </div>
            </div>

            <h1 className="max-w-3xl text-3xl font-semibold tracking-tight text-white sm:text-4xl">
              What do you want to{" "}
              <span className="text-[#D4AF37]">build?</span>
            </h1>

            <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-400 sm:text-base">
              Describe your product, workflow, or idea in plain language.
              ANVIX will use your vision to create the foundation for your
              workspace.
            </p>

            <div className="mt-5 flex flex-wrap gap-2">
              {[
                "Describe your idea",
                "Add key features",
                "Mention your target users",
              ].map((item) => (
                <div
                  key={item}
                  className="flex items-center gap-2 rounded-full border border-zinc-800 bg-[#0D0D0F]/80 px-3 py-1.5"
                >
                  <Check
                    className="h-3 w-3 text-[#D4AF37]"
                    aria-hidden="true"
                  />
                  <span className="text-[11px] text-zinc-400">
                    {item}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* PROMPT BUILDER */}
        <section className="relative overflow-hidden rounded-3xl border border-zinc-800/80 bg-[#111113] p-5 shadow-2xl shadow-black/20 sm:p-7">

          <div className="mb-5 flex items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-semibold text-white">
                Describe your idea
              </h2>
              <p className="mt-1 text-xs text-zinc-500">
                Be as specific as you want.
              </p>
            </div>

            <div className="hidden items-center gap-2 rounded-full border border-zinc-800 bg-[#0D0D0F] px-3 py-1.5 sm:flex">
              <Keyboard
                className="h-3.5 w-3.5 text-zinc-500"
                aria-hidden="true"
              />
              <span className="text-[11px] text-zinc-500">
                Ctrl/Cmd + Enter
              </span>
            </div>
          </div>

          {/* TEXTAREA */}
          <div
            className={`relative overflow-hidden rounded-2xl border bg-[#0B0B0D] transition-all duration-200 ${
              prompt.trim()
                ? "border-[#D4AF37]/40 shadow-[0_0_30px_rgba(212,175,55,0.05)]"
                : "border-zinc-800"
            }`}
          >
            <textarea
              id="generate-prompt"
              name="prompt"
              value={prompt}
              onChange={(event) =>
                setPrompt(
                  event.target.value.slice(0, MAX_CHARS)
                )
              }
              onKeyDown={handleKeyDown}
              rows={9}
              maxLength={MAX_CHARS}
              placeholder="Example: Build a premium AI workspace for design teams with multi-project views, collaboration, analytics, authentication, and a clean dark interface..."
              className="w-full resize-none bg-transparent px-5 py-5 text-sm leading-7 text-white outline-none placeholder:text-zinc-600 sm:text-base"
              aria-label="Describe your app"
            />

            <div className="flex items-center justify-between border-t border-zinc-800/70 px-4 py-3">
              <span className="text-[11px] text-zinc-600">
                {prompt.trim()
                  ? "Ready to generate"
                  : "Start describing your idea..."}
              </span>

              <span
                className={`text-[11px] ${
                  remainingChars < 200
                    ? "text-[#D4AF37]"
                    : "text-zinc-600"
                }`}
              >
                {prompt.length.toLocaleString()} /{" "}
                {MAX_CHARS.toLocaleString()}
              </span>
            </div>
          </div>

          {/* ACTION BAR */}
          <div className="mt-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs leading-5 text-zinc-500">
              Press{" "}
              <span className="font-medium text-zinc-300">
                Ctrl/Cmd + Enter
              </span>{" "}
              to generate instantly.
            </p>

            <button
              type="button"
              onClick={handleGenerate}
              disabled={!canGenerate}
              className="
                group
                inline-flex
                w-full
                items-center
                justify-center
                gap-2
                rounded-xl
                bg-[#D4AF37]
                px-5
                py-3
                text-sm
                font-semibold
                text-black
                shadow-lg
                shadow-[#D4AF37]/10
                transition-all
                duration-200
                hover:bg-[#E2C259]
                hover:shadow-[#D4AF37]/20
                active:scale-[0.98]
                disabled:cursor-not-allowed
                disabled:opacity-40
                disabled:shadow-none
                sm:w-auto
              "
            >
              {isSubmitting ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-black/30 border-t-black" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles
                    className="h-4 w-4"
                    aria-hidden="true"
                  />
                  Generate app
                  <ArrowRight
                    className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5"
                    aria-hidden="true"
                  />
                </>
              )}
            </button>
          </div>
        </section>

        {/* EXAMPLES */}
        <section>
          <div className="mb-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#D4AF37]">
              Need inspiration?
            </p>

            <h2 className="mt-1 text-lg font-semibold text-white">
              Start with an example
            </h2>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            {examples.map((example) => {
              const Icon = example.icon;

              return (
                <button
                  key={example.title}
                  type="button"
                  onClick={() => setPrompt(example.prompt)}
                  className="
                    group
                    rounded-2xl
                    border
                    border-zinc-800
                    bg-[#111113]
                    p-5
                    text-left
                    transition-all
                    duration-200
                    hover:-translate-y-0.5
                    hover:border-[#D4AF37]/30
                    hover:bg-[#141416]
                    focus:outline-none
                    focus:ring-2
                    focus:ring-[#D4AF37]/30
                  "
                >
                  <div className="flex items-center justify-between">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#D4AF37]/15 bg-[#D4AF37]/[0.07]">
                      <Icon
                        className="h-4 w-4 text-[#D4AF37]"
                        aria-hidden="true"
                      />
                    </div>

                    <ArrowRight
                      className="h-4 w-4 text-zinc-700 transition-all duration-200 group-hover:translate-x-0.5 group-hover:text-[#D4AF37]"
                      aria-hidden="true"
                    />
                  </div>

                  <h3 className="mt-5 text-sm font-semibold text-white">
                    {example.title}
                  </h3>

                  <p className="mt-1 text-xs leading-5 text-zinc-500">
                    {example.description}
                  </p>

                  <div className="mt-4 text-[11px] font-medium text-zinc-600 transition group-hover:text-[#D4AF37]">
                    Use this idea →
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        {/* FOOTER TIP */}
        <div className="flex items-center gap-3 rounded-2xl border border-zinc-800/70 bg-[#0D0D0F] px-4 py-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#D4AF37]/10">
            <Sparkles
              className="h-3.5 w-3.5 text-[#D4AF37]"
              aria-hidden="true"
            />
          </div>

          <p className="text-xs leading-5 text-zinc-500">
            <span className="text-zinc-300">Pro tip:</span>{" "}
            Mention your users, core features, integrations, and preferred
            design style for a more useful generated workspace.
          </p>
        </div>
      </div>
    </AppShell>
  );
}