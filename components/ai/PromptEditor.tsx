"use client";

import { useState } from "react";
import { Sparkles } from "lucide-react";
import GenerateButton from "@/features/landing/GenerateButton";

export default function PromptEditor() {
  const [prompt, setPrompt] = useState("");

  function handleGenerate() {
    console.log(prompt);

    // API call yaha aayegi
  }

  return (
    <div className="relative overflow-hidden rounded-3xl border border-[#D4AF37]/20 bg-[#111111]/80 p-6 backdrop-blur-xl">

      {/* Golden Glow */}
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
          onChange={(e) => setPrompt(e.target.value)}
          rows={8}
          placeholder="Example: Build a SaaS for hospitals using Next.js, Supabase and Stripe..."
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
            AI can generate complete production-ready applications.
          </p>

          <span className="rounded-full border border-[#D4AF37]/30 bg-[#D4AF37]/10 px-3 py-1 text-xs text-[#D4AF37]">
            GPT-5
          </span>

        </div>

       <div className="mt-8">
  <GenerateButton
    onClick={handleGenerate}
    disabled={!prompt.trim()}
  />
</div>

      </div>
    </div>
  );
}