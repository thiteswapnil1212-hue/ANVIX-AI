"use client";

import { useState } from "react";
import { Sparkles } from "lucide-react";
import GenerateButton from "@/features/landing/GenerateButton";

const MAX_CHARS = 2000;

export default function PromptEditor() {
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);

  const examples = [
    "Build a SaaS CRM using Next.js and Supabase",
    "Create an AI Resume Builder with Stripe",
    "Design a Hospital Management Dashboard",
  ];

  async function handleGenerate() {
    if (!prompt.trim()) return;

    setLoading(true);

    console.log(prompt);

    // TODO: API call

    setTimeout(() => {
      setLoading(false);
    }, 2000);
  }

  return (
    <div className="relative overflow-hidden rounded-3xl border border-[#D4AF37]/20 bg-[#111111]/80 p-6 backdrop-blur-xl">
      <div className="absolute -top-32 left-1/2 h-64 w-64 -translate-x-1/2 rounded-full bg-[#D4AF37]/10 blur-3xl" />

      <div className="relative">
        <div className="mb-5 flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-[#D4AF37]" />
          <h2 className="text-lg font-semibold text-white">
            Describe your idea
          </h2>
        </div>

        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value.slice(0, MAX_CHARS))}
          onKeyDown={(e) => {
            if (e.key === "Enter" && e.ctrlKey) {
              handleGenerate();
            }
          }}
          rows={8}
          placeholder="Example: Build an AI SaaS for hospitals using Next.js, Supabase, Stripe and OpenAI..."
          className="
            w-full
            resize-none
            rounded-2xl
            border
            border-zinc-800
            bg-[#0D0D0D]
            p-5
            text-base
            leading-7
            text-white
            placeholder:text-zinc-500
            outline-none
            transition
            focus:border-[#D4AF37]
          "
        />

        <div className="mt-4 flex items-center justify-between">
          <p className="text-sm text-zinc-500">
            Press <span className="text-[#D4AF37]">Ctrl + Enter</span> to generate.
          </p>

          <span className="rounded-full border border-[#D4AF37]/30 bg-[#D4AF37]/10 px-3 py-1 text-xs text-[#D4AF37]">
            GPT-5
          </span>
        </div>

        <div className="mt-2 flex justify-end">
          <span
            className={`text-xs ${
              prompt.length > 1800
                ? "text-yellow-400"
                : "text-zinc-500"
            }`}
          >
            {prompt.length}/{MAX_CHARS}
          </span>
        </div>

        {/* Prompt Suggestions */}
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

        <div className="mt-8">
          <GenerateButton
            onClick={handleGenerate}
            loading={loading}
            disabled={!prompt.trim()}
          />
        </div>
      </div>
    </div>
  );
}