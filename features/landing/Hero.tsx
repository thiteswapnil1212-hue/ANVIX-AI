import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Sparkles, Terminal, Zap } from "lucide-react";

export default function Hero() {
  return (
    <section className="relative min-h-[calc(100vh-64px)] overflow-hidden bg-[#09090B] px-6 py-20 sm:py-24 lg:py-28">
      {/* Subtle background lighting */}
      <div className="pointer-events-none absolute left-1/2 top-[-180px] h-[520px] w-[520px] -translate-x-1/2 rounded-full bg-[#D4AF37]/[0.07] blur-[150px]" />

      <div className="pointer-events-none absolute bottom-[-200px] left-[15%] h-[350px] w-[350px] rounded-full bg-[#D4AF37]/[0.035] blur-[130px]" />

      <div className="relative z-10 mx-auto max-w-6xl">
        {/* Small product label */}
        <div className="flex justify-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-zinc-800 bg-[#111113] px-4 py-2 text-xs font-medium text-zinc-400">
            <span className="h-1.5 w-1.5 rounded-full bg-[#D4AF37]" />
            AI Software Engineering Platform
          </div>
        </div>

        {/* Main heading */}
        <div className="mx-auto mt-9 max-w-4xl text-center">
          <h1 className="text-5xl font-semibold leading-[1.05] tracking-[-0.04em] text-white sm:text-6xl lg:text-7xl">
            Turn ideas into
            <br />
            <span className="text-[#D4AF37]">working software.</span>
          </h1>

          <p className="mx-auto mt-7 max-w-2xl text-base leading-7 text-zinc-400 sm:text-lg">
            ANVIX AI helps you design, generate, and iterate on production-ready
            software with intelligent AI assistance.
          </p>
        </div>

        {/* Main CTA */}
        <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link
            href="/generate"
            className="group inline-flex items-center gap-2 rounded-xl bg-[#D4AF37] px-6 py-3.5 text-sm font-semibold text-[#09090B] transition-all duration-200 hover:bg-[#E5C158] hover:shadow-[0_8px_30px_rgba(212,175,55,0.15)]"
          >
            Start building
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </Link>

          <Link
            href="/chat"
            className="inline-flex items-center gap-2 rounded-xl border border-zinc-800 bg-[#111113] px-6 py-3.5 text-sm font-medium text-zinc-300 transition hover:border-zinc-700 hover:bg-[#18181B] hover:text-white"
          >
            <Sparkles className="h-4 w-4 text-[#D4AF37]" />
            Talk to ANVIX
          </Link>
        </div>

        {/* Product preview */}
        <div className="relative mx-auto mt-20 max-w-5xl">
          {/* Top glow */}
          <div className="pointer-events-none absolute inset-x-20 top-0 h-32 bg-[#D4AF37]/[0.06] blur-[70px]" />

          <div className="relative overflow-hidden rounded-2xl border border-zinc-800 bg-[#111113] shadow-[0_30px_100px_rgba(0,0,0,0.45)]">
            {/* Window header */}
            <div className="flex h-12 items-center justify-between border-b border-zinc-800 bg-[#0F0F10] px-4">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-zinc-700" />
                <span className="h-2.5 w-2.5 rounded-full bg-zinc-700" />
                <span className="h-2.5 w-2.5 rounded-full bg-zinc-700" />
              </div>

              <div className="flex items-center gap-2 text-[11px] text-zinc-500">
                <Image
                  src="/logo.png"
                  alt="ANVIX AI"
                  width={18}
                  height={18}
                  className="h-[18px] w-[18px] object-contain"
                />
                ANVIX AI
              </div>

              <div className="w-12" />
            </div>

            {/* Preview body */}
            <div className="grid min-h-[330px] grid-cols-1 md:grid-cols-[190px_1fr]">
              {/* Fake sidebar */}
              <div className="hidden border-r border-zinc-800 bg-[#0D0D0F] p-4 md:block">
                <div className="flex items-center gap-2 border-b border-zinc-800 pb-4">
                  <Image
                    src="/logo.png"
                    alt="ANVIX AI"
                    width={28}
                    height={28}
                    className="h-7 w-7 object-contain"
                  />
                  <div>
                    <p className="text-xs font-semibold text-white">ANVIX AI</p>
                    <p className="text-[9px] text-zinc-600">Workspace</p>
                  </div>
                </div>

                <div className="mt-5 space-y-2">
                  <div className="rounded-lg bg-[#242426] px-3 py-2 text-[11px] text-[#D4AF37]">
                    Overview
                  </div>
                  <div className="px-3 py-2 text-[11px] text-zinc-600">
                    Projects
                  </div>
                  <div className="px-3 py-2 text-[11px] text-zinc-600">
                    Conversations
                  </div>
                </div>
              </div>

              {/* Fake workspace */}
              <div className="bg-[#09090B] p-5 sm:p-7">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.18em] text-[#D4AF37]">
                      Workspace
                    </p>
                    <h3 className="mt-2 text-lg font-semibold text-white">
                      Build your next product
                    </h3>
                  </div>

                  <div className="hidden items-center gap-2 rounded-lg border border-zinc-800 px-3 py-2 text-[10px] text-zinc-500 sm:flex">
                    <span className="h-1.5 w-1.5 rounded-full bg-[#D4AF37]" />
                    AI ready
                  </div>
                </div>

                <div className="mt-7 grid gap-3 sm:grid-cols-3">
                  <PreviewCard
                    icon={<Zap className="h-4 w-4" />}
                    title="Generate"
                    text="Turn an idea into a product blueprint."
                  />
                  <PreviewCard
                    icon={<Terminal className="h-4 w-4" />}
                    title="Build"
                    text="Work with modern production-ready code."
                  />
                  <PreviewCard
                    icon={<Sparkles className="h-4 w-4" />}
                    title="Iterate"
                    text="Refine your product with AI assistance."
                  />
                </div>

                <div className="mt-4 rounded-xl border border-zinc-800 bg-[#111113] p-4">
                  <div className="flex items-center gap-2">
                    <div className="h-6 w-6 rounded-md border border-[#D4AF37]/20 bg-[#D4AF37]/10 p-1">
                      <Image
                        src="/logo.png"
                        alt=""
                        width={16}
                        height={16}
                        className="h-full w-full object-contain"
                      />
                    </div>

                    <span className="text-[11px] font-medium text-zinc-300">
                      Describe what you want to build...
                    </span>
                  </div>

                  <div className="mt-4 h-2 w-3/4 rounded-full bg-zinc-800" />
                  <div className="mt-2 h-2 w-1/2 rounded-full bg-zinc-900" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom product statement */}
        <div className="mx-auto mt-10 flex max-w-3xl flex-col items-center justify-center gap-3 text-center sm:flex-row sm:gap-8">
          <div className="flex items-center gap-2 text-xs text-zinc-500">
            <span className="h-1.5 w-1.5 rounded-full bg-[#D4AF37]" />
            Generate software
          </div>

          <div className="hidden h-3 w-px bg-zinc-800 sm:block" />

          <div className="flex items-center gap-2 text-xs text-zinc-500">
            <span className="h-1.5 w-1.5 rounded-full bg-[#D4AF37]" />
            Build with AI
          </div>

          <div className="hidden h-3 w-px bg-zinc-800 sm:block" />

          <div className="flex items-center gap-2 text-xs text-zinc-500">
            <span className="h-1.5 w-1.5 rounded-full bg-[#D4AF37]" />
            Ship faster
          </div>
        </div>
      </div>
    </section>
  );
}

function PreviewCard({
  icon,
  title,
  text,
}: {
  icon: React.ReactNode;
  title: string;
  text: string;
}) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-[#111113] p-4">
      <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#D4AF37]/20 bg-[#D4AF37]/[0.08] text-[#D4AF37]">
        {icon}
      </div>

      <p className="mt-4 text-xs font-semibold text-white">{title}</p>
      <p className="mt-1.5 text-[11px] leading-5 text-zinc-600">{text}</p>
    </div>
  );
}