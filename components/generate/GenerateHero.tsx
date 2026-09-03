"use client";

import {
  Check,
  Sparkles,
  WandSparkles,
  ArrowDown,
} from "lucide-react";

interface GenerateHeroProps {
  promptLength?: number;
  maxChars?: number;
}

const DEFAULT_MAX_CHARS = 2200;

const benefits = [
  "Describe your idea",
  "Define key features",
  "Build with natural language",
];

export default function GenerateHero({
  promptLength = 0,
  maxChars = DEFAULT_MAX_CHARS,
}: GenerateHeroProps) {
  const progress = Math.min(
    (promptLength / maxChars) * 100,
    100
  );

  return (
    <section
      aria-labelledby="generate-hero-title"
      className="
        relative
        overflow-hidden
        rounded-[28px]
        border
        border-zinc-800/80
        bg-[#0F0F11]/95
        shadow-[0_20px_70px_rgba(0,0,0,0.24)]
      "
    >
      {/* Ambient background glow */}
      <div
        aria-hidden="true"
        className="
          pointer-events-none
          absolute
          -right-32
          -top-32
          h-80
          w-80
          rounded-full
          bg-[#D4AF37]/[0.08]
          blur-[110px]
        "
      />

      <div
        aria-hidden="true"
        className="
          pointer-events-none
          absolute
          -bottom-40
          left-1/3
          h-72
          w-72
          rounded-full
          bg-[#D4AF37]/[0.045]
          blur-[100px]
        "
      />

      {/* Subtle top line */}
      <div
        aria-hidden="true"
        className="
          absolute
          inset-x-0
          top-0
          h-px
          bg-gradient-to-r
          from-transparent
          via-[#D4AF37]/30
          to-transparent
        "
      />

      <div className="relative px-5 py-8 sm:px-8 sm:py-10 lg:px-10 lg:py-12">
        {/* Header */}
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-3xl">
            {/* Product badge */}
            <div
              className="
                inline-flex
                items-center
                gap-2
                rounded-full
                border
                border-[#D4AF37]/20
                bg-[#D4AF37]/[0.055]
                px-3
                py-1.5
              "
            >
              <Sparkles
                className="h-3.5 w-3.5 text-[#D4AF37]"
                strokeWidth={1.8}
                aria-hidden="true"
              />

              <span
                className="
                  text-[10px]
                  font-semibold
                  uppercase
                  tracking-[0.18em]
                  text-[#D4AF37]
                "
              >
                ANVIX AI Builder
              </span>
            </div>

            {/* Heading */}
            <h1
              id="generate-hero-title"
              className="
                mt-5
                text-3xl
                font-semibold
                tracking-[-0.035em]
                text-white
                sm:text-4xl
                lg:text-5xl
              "
            >
              Turn an idea into
              <br className="hidden sm:block" />{" "}
              <span
                className="
                  bg-gradient-to-r
                  from-[#D4AF37]
                  via-[#E4C766]
                  to-[#D4AF37]
                  bg-clip-text
                  text-transparent
                "
              >
                something real.
              </span>
            </h1>

            <p
              className="
                mt-4
                max-w-2xl
                text-sm
                leading-7
                text-zinc-400
                sm:text-base
              "
            >
              Describe the product you have in mind. ANVIX
              transforms your requirements into a structured
              workspace you can continue building.
            </p>
          </div>

          {/* AI status */}
          <div
            className="
              hidden
              shrink-0
              items-center
              gap-3
              rounded-2xl
              border
              border-zinc-800
              bg-[#0B0B0D]/80
              px-4
              py-3
              sm:flex
            "
          >
            <div
              className="
                flex
                h-8
                w-8
                items-center
                justify-center
                rounded-xl
                border
                border-emerald-500/15
                bg-emerald-500/[0.06]
              "
            >
              <span
                className="
                  h-2
                  w-2
                  animate-pulse
                  rounded-full
                  bg-emerald-400
                "
                aria-hidden="true"
              />
            </div>

            <div>
              <p className="text-[11px] font-medium text-zinc-300">
                AI Builder ready
              </p>

              <p className="mt-0.5 text-[10px] text-zinc-600">
                Waiting for your idea
              </p>
            </div>
          </div>
        </div>

        {/* Benefits */}
        <div className="mt-7 flex flex-wrap gap-2.5">
          {benefits.map((benefit) => (
            <div
              key={benefit}
              className="
                inline-flex
                items-center
                gap-2
                rounded-full
                border
                border-zinc-800/90
                bg-[#0B0B0D]/70
                px-3
                py-1.5
              "
            >
              <span
                className="
                  flex
                  h-4
                  w-4
                  items-center
                  justify-center
                  rounded-full
                  bg-[#D4AF37]/10
                "
              >
                <Check
                  className="h-2.5 w-2.5 text-[#D4AF37]"
                  strokeWidth={2.5}
                  aria-hidden="true"
                />
              </span>

              <span className="text-[11px] text-zinc-400">
                {benefit}
              </span>
            </div>
          ))}
        </div>

        {/* Builder hint */}
        <div
          className="
            mt-8
            flex
            flex-col
            gap-4
            border-t
            border-zinc-800/70
            pt-5
            sm:flex-row
            sm:items-center
            sm:justify-between
          "
        >
          <div className="flex items-center gap-3">
            <div
              className="
                flex
                h-9
                w-9
                shrink-0
                items-center
                justify-center
                rounded-xl
                border
                border-[#D4AF37]/15
                bg-[#D4AF37]/[0.06]
              "
            >
              <WandSparkles
                className="h-4 w-4 text-[#D4AF37]"
                strokeWidth={1.7}
                aria-hidden="true"
              />
            </div>

            <div>
              <p className="text-xs font-medium text-zinc-300">
                Your prompt is the blueprint
              </p>

              <p className="mt-0.5 text-[10px] text-zinc-600">
                More context usually means a more useful first build.
              </p>
            </div>
          </div>

          {/* Character progress */}
          <div className="min-w-40">
            <div className="mb-1.5 flex items-center justify-between">
              <span className="text-[10px] text-zinc-600">
                Prompt capacity
              </span>

              <span className="text-[10px] text-zinc-600">
                {promptLength.toLocaleString()} /{" "}
                {maxChars.toLocaleString()}
              </span>
            </div>

            <div
              className="
                h-1
                overflow-hidden
                rounded-full
                bg-zinc-800
              "
              role="progressbar"
              aria-label="Prompt capacity"
              aria-valuemin={0}
              aria-valuemax={maxChars}
              aria-valuenow={promptLength}
            >
              <div
                className="
                  h-full
                  rounded-full
                  bg-[#D4AF37]
                  transition-all
                  duration-300
                "
                style={{
                  width: `${progress}%`,
                }}
              />
            </div>
          </div>
        </div>

        {/* Mobile scroll hint */}
        <div
          className="
            mt-5
            flex
            items-center
            gap-2
            text-[10px]
            text-zinc-700
            sm:hidden
          "
        >
          <ArrowDown className="h-3 w-3" aria-hidden="true" />
          Start below to describe your idea
        </div>
      </div>
    </section>
  );
}