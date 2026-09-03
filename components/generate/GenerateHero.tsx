"use client";

import {
  Check,
  Sparkles,
  WandSparkles,
} from "lucide-react";

interface GenerateHeroProps {
  promptActive?: boolean;
}

const capabilities = [
  "Describe your idea",
  "Add key features",
  "Mention your target users",
];

export default function GenerateHero({
  promptActive = false,
}: GenerateHeroProps) {
  return (
    <section
      aria-labelledby="generate-hero-title"
      className="
        relative
        overflow-hidden
        rounded-[28px]
        border
        border-zinc-800/80
        bg-[#111113]
        px-6
        py-8
        shadow-[0_20px_60px_rgba(0,0,0,0.16)]
        sm:px-8
        sm:py-10
      "
    >
      {/* Background atmosphere */}
      <div
        aria-hidden="true"
        className="
          pointer-events-none
          absolute
          -right-28
          -top-36
          h-80
          w-80
          rounded-full
          bg-[#D4AF37]/[0.075]
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
          bg-[#D4AF37]/[0.035]
          blur-[100px]
        "
      />

      {/* Subtle grid */}
      <div
        aria-hidden="true"
        className="
          pointer-events-none
          absolute
          inset-0
          opacity-[0.025]
          [background-image:linear-gradient(rgba(255,255,255,0.5)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.5)_1px,transparent_1px)]
          [background-size:32px_32px]
        "
      />

      <div className="relative">
        {/* Top identity row */}
        <div className="flex items-start justify-between gap-5">
          <div className="flex items-center gap-3">
            <div
              className="
                flex
                h-10
                w-10
                shrink-0
                items-center
                justify-center
                rounded-xl
                border
                border-[#D4AF37]/20
                bg-[#D4AF37]/[0.08]
                shadow-[0_0_25px_rgba(212,175,55,0.04)]
              "
            >
              <WandSparkles
                className="h-[18px] w-[18px] text-[#D4AF37]"
                strokeWidth={1.7}
                aria-hidden="true"
              />
            </div>

            <div>
              <p
                className="
                  text-[10px]
                  font-semibold
                  uppercase
                  tracking-[0.2em]
                  text-[#D4AF37]
                "
              >
                ANVIX AI BUILDER
              </p>

              <p className="mt-1 text-[11px] text-zinc-600">
                From idea to intelligent workspace
              </p>
            </div>
          </div>

          {/* Live state */}
          <div
            className="
              hidden
              items-center
              gap-2
              rounded-full
              border
              border-zinc-800
              bg-[#0D0D0F]/80
              px-3
              py-1.5
              sm:flex
            "
          >
            <span
              className={`
                h-1.5
                w-1.5
                rounded-full
                ${
                  promptActive
                    ? "bg-[#D4AF37] shadow-[0_0_8px_rgba(212,175,55,0.65)]"
                    : "bg-zinc-700"
                }
              `}
            />

            <span className="text-[10px] font-medium text-zinc-600">
              {promptActive
                ? "Ready to build"
                : "Builder ready"}
            </span>
          </div>
        </div>

        {/* Main heading */}
        <div className="mt-7 max-w-4xl">
          <h1
            id="generate-hero-title"
            className="
              text-3xl
              font-semibold
              tracking-[-0.035em]
              text-white
              sm:text-5xl
              sm:leading-[1.08]
            "
          >
            What do you want to{" "}
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
              build?
            </span>
          </h1>

          <p
            className="
              mt-4
              max-w-2xl
              text-sm
              leading-6
              text-zinc-400
              sm:text-[15px]
              sm:leading-7
            "
          >
            Describe your product, workflow, or idea in plain
            language. ANVIX will transform your vision into the
            foundation of a structured workspace.
          </p>
        </div>

        {/* Capability pills */}
        <div className="mt-6 flex flex-wrap gap-2">
          {capabilities.map((capability) => (
            <div
              key={capability}
              className="
                inline-flex
                items-center
                gap-2
                rounded-full
                border
                border-zinc-800
                bg-[#0D0D0F]/80
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
                  bg-[#D4AF37]/[0.08]
                "
              >
                <Check
                  className="h-2.5 w-2.5 text-[#D4AF37]"
                  strokeWidth={2.5}
                  aria-hidden="true"
                />
              </span>

              <span className="text-[10px] font-medium text-zinc-500">
                {capability}
              </span>
            </div>
          ))}
        </div>

        {/* Bottom product hint */}
        <div
          className="
            mt-7
            flex
            items-center
            gap-3
            border-t
            border-zinc-800/70
            pt-5
          "
        >
          <Sparkles
            className="h-3.5 w-3.5 shrink-0 text-[#D4AF37]"
            aria-hidden="true"
          />

          <p className="text-[11px] leading-5 text-zinc-600">
            <span className="text-zinc-400">
              Better context → better generation.
            </span>{" "}
            Tell ANVIX what you're building, who it's for,
            and what it needs to do.
          </p>
        </div>
      </div>
    </section>
  );
}