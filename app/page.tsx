"use client";

import { useState } from "react";
import Navbar from "@/components/layout/Navbar";
import Hero from "@/features/landing/Hero";
import PromptEditor from "@/components/ai/PromptEditor";
import PromptToolbar from "@/components/ai/PromptToolbar";
import ThinkingPanel from "@/components/ai/ThinkingPanel";
import BackgroundGlow from "@/components/background/BackgroundGlow";
import AIStatus from "@/features/landing/AIStatus";

export default function Home() {
  const [isThinking, setIsThinking] = useState(false);

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#090909] text-white">
      {/* Background */}
      <BackgroundGlow />

      {/* Navigation */}
      <Navbar />

      {/* Main content */}
      <div className="relative z-10">
        {/* Hero */}
        <Hero />

        {/* AI workspace */}
        <section
          id="ai-workspace"
          className="relative mx-auto mt-10 w-full max-w-6xl px-4 pb-24 sm:px-6 lg:mt-16"
        >
          {/* Section heading */}
          <div className="mx-auto mb-8 max-w-2xl text-center">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-[#D4AF37]/20 bg-[#D4AF37]/5 px-3 py-1.5">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#D4AF37] opacity-60" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-[#D4AF37]" />
              </span>

              <span className="text-[11px] font-medium uppercase tracking-[0.18em] text-[#D4AF37]">
                AI workspace
              </span>
            </div>

            <h2 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">
              Tell ANVIX what you want to build
            </h2>

            <p className="mt-3 text-sm leading-6 text-zinc-500 sm:text-base">
              Describe your idea, choose your workflow, and let ANVIX turn
              your intent into something useful.
            </p>
          </div>

          {/* Prompt container */}
          <div className="relative">
            {/* Outer glow */}
            <div
              aria-hidden="true"
              className="
                pointer-events-none
                absolute
                -inset-6
                rounded-[2rem]
                bg-[#D4AF37]/[0.035]
                blur-3xl
              "
            />

            {/* Main prompt card */}
            <div
              className="
                relative
                overflow-hidden
                rounded-[1.75rem]
                border
                border-zinc-800/90
                bg-[#0E0E10]/90
                shadow-[0_25px_80px_rgba(0,0,0,0.45)]
                backdrop-blur-2xl
              "
            >
              {/* Top accent */}
              <div className="h-px w-full bg-gradient-to-r from-transparent via-[#D4AF37]/50 to-transparent" />

              <div className="p-3 sm:p-5">
                <PromptEditor />
              </div>

              {/* Toolbar */}
              <div className="border-t border-zinc-800/70 bg-[#0B0B0D]/80">
                <PromptToolbar />
              </div>
            </div>
          </div>

          {/* Thinking / processing state */}
          <div
            className={`
              mt-5
              overflow-hidden
              transition-all
              duration-500
              ${
                isThinking
                  ? "max-h-[500px] opacity-100"
                  : "max-h-[220px] opacity-100"
              }
            `}
          >
            <ThinkingPanel />
          </div>

          {/* AI status */}
          <div className="mt-8">
            <AIStatus />
          </div>
        </section>

        {/* Product capabilities */}
        <section className="mx-auto max-w-6xl px-4 pb-24 sm:px-6">
          <div className="grid gap-4 md:grid-cols-3">
            {[
              {
                number: "01",
                title: "Understand",
                description:
                  "ANVIX interprets your prompt and understands the intent behind your request.",
              },
              {
                number: "02",
                title: "Reason",
                description:
                  "Your request is processed through the AI workflow before a response is generated.",
              },
              {
                number: "03",
                title: "Build",
                description:
                  "Turn ideas into practical outputs, workflows, and software experiences.",
              },
            ].map((item) => (
              <div
                key={item.number}
                className="
                  group
                  rounded-2xl
                  border
                  border-zinc-800/80
                  bg-[#0E0E10]/70
                  p-5
                  transition-all
                  duration-300
                  hover:-translate-y-1
                  hover:border-[#D4AF37]/20
                  hover:bg-[#111113]
                "
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono text-[#D4AF37]/70">
                    {item.number}
                  </span>

                  <span className="h-px w-8 bg-zinc-800 transition-all duration-300 group-hover:w-12 group-hover:bg-[#D4AF37]/40" />
                </div>

                <h3 className="mt-5 text-base font-semibold text-zinc-100">
                  {item.title}
                </h3>

                <p className="mt-2 text-sm leading-6 text-zinc-500">
                  {item.description}
                </p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}