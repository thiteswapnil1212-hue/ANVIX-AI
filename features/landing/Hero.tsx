import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Hero() {
  return (
    <section className="relative flex min-h-[calc(100vh-64px)] items-center justify-center overflow-hidden px-6">

      {/* Background Glow */}
      <div className="absolute left-1/2 top-40 h-96 w-96 -translate-x-1/2 rounded-full bg-[#D4AF37]/10 blur-[140px]" />

      <div className="relative z-10 mx-auto flex max-w-5xl flex-col items-center text-center">

        {/* Badge */}
        <div className="mb-8 flex items-center gap-2 rounded-full border border-[#D4AF37]/30 bg-[#D4AF37]/10 px-5 py-2 text-sm text-[#D4AF37]">
          <Sparkles size={16} />
          AI Software Engineering Platform
        </div>

        {/* Heading */}
        <h1 className="text-5xl font-bold leading-tight tracking-tight text-white md:text-7xl">
          Build Production
          <br />
          <span className="text-[#D4AF37]">
            Software with AI
          </span>
        </h1>

        {/* Description */}
        <p className="mt-8 max-w-2xl text-lg leading-8 text-zinc-400">
          Generate production-ready applications, modern websites,
          APIs and full-stack software using intelligent AI agents.
        </p>

        {/* Prompt Box */}
        <div className="mt-12 w-full max-w-3xl rounded-2xl border border-zinc-800 bg-[#111111] p-4 shadow-2xl">

          <textarea
            placeholder="Describe the software you want to build..."
            className="h-32 w-full resize-none bg-transparent text-lg text-white outline-none placeholder:text-zinc-500"
          />

          <div className="mt-4 flex items-center justify-between">

            <p className="text-sm text-zinc-500">
              AI can generate complete production-ready projects.
            </p>

            <Button className="rounded-xl bg-[#D4AF37] px-8 py-6 text-black hover:bg-[#e7c95a]">
              Generate Project
            </Button>

          </div>

        </div>

      </div>

    </section>
  );
}