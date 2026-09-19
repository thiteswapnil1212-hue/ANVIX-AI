
"use client";

import Navbar from "@/components/layout/Navbar";
import Hero from "@/features/landing/Hero";
import PromptEditor from "@/components/ai/PromptEditor";
import PromptToolbar from "@/components/ai/PromptToolbar";
import ThinkingPanel from "@/components/ai/ThinkingPanel";
import BackgroundGlow from "@/components/background/BackgroundGlow";
import AIStatus from "@/features/landing/AIStatus";

const capabilities = [
  {
    number: "01",
    title: "Understand",
    description:
      "Describe your idea naturally. ANVIX helps turn your intent into a clear starting point.",
  },
  {
    number: "02",
    title: "Reason",
    description:
      "Work through your request with an AI-powered workflow designed around your task.",
  },
  {
    number: "03",
    title: "Build",
    description:
      "Move from an initial idea toward useful outputs, workflows, and software experiences.",
  },
];

export default function Home() {
  return (
    <main className="relative isolate min-h-screen overflow-x-clip bg-[#09090B] text-white selection:bg-[#D4AF37]/25 selection:text-white">
      {/* Background */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10"
      >
        <BackgroundGlow />
      </div>

      {/* Navigation */}
      <Navbar />

      <div className="relative z-10">
        {/* Hero */}
        <Hero />

        {/* AI workspace */}
        <section
          id="ai-workspace"
          aria-labelledby="workspace-heading"
          className="mx-auto w-full max-w-6xl scroll-mt-24 px-4 pb-20 pt-12 sm:px-6 sm:pt-16 lg:pb-28"
        >
          {/* Section introduction */}
          <div className="mx-auto mb-8 max-w-2xl text-center sm:mb-10">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[#D4AF37]/20 bg-[#D4AF37]/[0.06] px-3.5 py-1.5">
              <span
                aria-hidden="true"
                className="h-1.5 w-1.5 rounded-full bg-[#D4AF37]"
              />
              <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#D4AF37] sm:text-[11px]">
                Your creative workspace
              </span>
            </div>

            <h2
              id="workspace-heading"
              className="text-balance text-2xl font-semibold tracking-[-0.04em] text-white sm:text-3xl md:text-4xl"
            >
              What are you building today?
            </h2>

            <p className="mx-auto mt-4 max-w-xl text-sm leading-6 text-zinc-400 sm:text-base sm:leading-7">
              Bring your idea to ANVIX. Describe what you need and choose
              how you want to work.
            </p>
          </div>

          {/* Prompt workspace */}
          <div className="relative mx-auto max-w-5xl">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -inset-3 -z-10 rounded-[2rem] bg-[#D4AF37]/[0.035] blur-2xl sm:-inset-5 sm:blur-3xl"
            />

            <div className="relative overflow-hidden rounded-2xl border border-white/[0.09] bg-[#0E0E10]/95 shadow-[0_24px_80px_-32px_rgba(0,0,0,0.85)] backdrop-blur-xl sm:rounded-3xl">
              {/* Top highlight */}
              <div
                aria-hidden="true"
                className="h-px bg-gradient-to-r from-transparent via-[#D4AF37]/50 to-transparent"
              />

              <div className="p-3 sm:p-5">
                <PromptEditor />
              </div>

              <div className="border-t border-white/[0.07] bg-black/20">
                <PromptToolbar />
              </div>
            </div>

            {/* Processing panel */}
            <div className="mt-4">
              <ThinkingPanel />
            </div>
          </div>

          {/* AI status */}
          <div className="mt-12 sm:mt-16">
            <AIStatus />
          </div>
        </section>

        {/* Capabilities */}
        <section
          aria-labelledby="capabilities-heading"
          className="mx-auto max-w-6xl px-4 pb-24 sm:px-6 lg:pb-32"
        >
          <div className="mb-8 max-w-xl sm:mb-10">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#D4AF37]">
              The workflow
            </p>

            <h2
              id="capabilities-heading"
              className="mt-3 text-2xl font-semibold tracking-[-0.035em] text-white sm:text-3xl"
            >
              From idea to execution.
            </h2>

            <p className="mt-3 text-sm leading-6 text-zinc-500 sm:text-base">
              A simple way to start exploring, thinking, and building
              with AI.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3">
            {capabilities.map((item) => (
              <article
                key={item.number}
                className="
                  group relative overflow-hidden rounded-2xl
                  border border-white/[0.07]
                  bg-[#0E0E10]/75 p-5 sm:p-6
                  transition-all duration-300
                  hover:-translate-y-1
                  hover:border-[#D4AF37]/20
                  hover:bg-[#111113]
                  motion-reduce:transform-none
                  motion-reduce:transition-none
                "
              >
                {/* Hover glow */}
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute -right-12 -top-12 h-32 w-32 rounded-full bg-[#D4AF37]/[0.06] opacity-0 blur-3xl transition-opacity duration-300 group-hover:opacity-100"
                />

                <div className="relative flex items-center justify-between">
                  <span className="font-mono text-xs tracking-wider text-[#D4AF37]/80">
                    {item.number}
                  </span>

                  <span
                    aria-hidden="true"
                    className="h-px w-8 bg-zinc-700 transition-all duration-300 group-hover:w-12 group-hover:bg-[#D4AF37]/50"
                  />
                </div>

                <h3 className="relative mt-6 text-base font-semibold tracking-tight text-zinc-100">
                  {item.title}
                </h3>

                <p className="relative mt-2 text-sm leading-6 text-zinc-500 transition-colors duration-300 group-hover:text-zinc-400">
                  {item.description}
                </p>
              </article>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}