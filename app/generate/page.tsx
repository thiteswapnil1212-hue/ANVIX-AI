"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import AppShell from "@/components/layout/AppShell";
import { Sparkles, ArrowRight, Keyboard } from "lucide-react";

const examples = [
  "Build a premium AI recruiting platform with candidate scoring and analytics",
  "Create a developer workspace for shipping internal tools with auth and billing",
  "Design a private AI research cockpit with knowledge graphs and shared notebooks",
];

const MAX_CHARS = 2200;

export default function GeneratePage() {
  const router = useRouter();
  const [prompt, setPrompt] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleGenerate() {
    const trimmed = prompt.trim();
    if (!trimmed) return;

    setIsSubmitting(true);

    setTimeout(() => {
      setIsSubmitting(false);
      router.push("/workspace/anvix-generated");
    }, 900);
  }

  return (
    <AppShell
      title="Generate App"
      description="Describe the application you want to build and Anvix AI will scaffold a complete workspace tailored to your vision."
    >
      <div className="rounded-3xl border border-zinc-800/80 bg-[#111111]/80 p-6 backdrop-blur-xl">
        <div className="mb-5 flex items-center gap-2 text-[#D4AF37]">
          <Sparkles className="h-5 w-5" />
          <h2 className="text-lg font-semibold text-white">Describe your idea</h2>
        </div>

        <textarea
          value={prompt}
          onChange={(event) => setPrompt(event.target.value.slice(0, MAX_CHARS))}
          onKeyDown={(event) => {
            if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
              event.preventDefault();
              handleGenerate();
            }
          }}
          rows={10}
          placeholder="Example: Build a premium AI workspace for design teams with multi-project views, collaboration, and analytics..."
          className="w-full resize-none rounded-2xl border border-zinc-800 bg-[#0D0D0D] p-5 text-base leading-7 text-white outline-none transition focus:border-[#D4AF37]"
          aria-label="Describe your app"
        />

        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-zinc-500">Use <span className="text-[#D4AF37]">Ctrl/Cmd + Enter</span> to generate.</p>
          <div className="flex items-center gap-2 rounded-full border border-zinc-800 bg-[#0D0D0D] px-3 py-1 text-xs text-zinc-400">
            <Keyboard className="h-3.5 w-3.5" />
            {prompt.length}/{MAX_CHARS}
          </div>
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          {examples.map((example) => (
            <button
              key={example}
              type="button"
              onClick={() => setPrompt(example)}
              className="rounded-full border border-zinc-700 px-3 py-1 text-xs text-zinc-400 transition hover:border-[#D4AF37] hover:text-[#D4AF37]"
            >
              {example}
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={handleGenerate}
          disabled={isSubmitting || !prompt.trim()}
          className="mt-8 inline-flex items-center gap-2 rounded-full bg-[#D4AF37] px-5 py-3 text-sm font-semibold text-black transition hover:bg-[#E2C259] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isSubmitting ? "Generating..." : "Generate app"}
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </AppShell>
  );
}
