"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import AppShell from "@/components/layout/AppShell";
import {
  Check,
  Sparkles,
} from "lucide-react";

import PromptBuilder from "@/components/generate/PromptBuilder";
import BuildOptions, {
  BuildConfiguration,
  defaultBuildConfiguration,
} from "@/components/generate/BuildOptions";
import ExamplePrompts from "@/components/generate/ExamplePrompts";
import GenerateProgress from "@/components/generate/GenerationProgress";

const MAX_CHARS = 2200;

export default function GeneratePage() {
  const router = useRouter();

  const [prompt, setPrompt] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [buildConfig, setBuildConfig] =
    useState<BuildConfiguration>(
      defaultBuildConfiguration
    );

  const trimmedPrompt = prompt.trim();

  const canGenerate =
    trimmedPrompt.length > 0 && !isSubmitting;

  function handleBuildConfigChange(
    category: keyof BuildConfiguration,
    option: string
  ) {
    setBuildConfig((current) => ({
      ...current,
      [category]: option,
    }));
  }

  function handleGenerate() {
    if (!canGenerate) return;

    setIsSubmitting(true);

    /*
     * Later this object will be sent to the generation API.
     *
     * Example:
     *
     * {
     *   prompt,
     *   buildConfig
     * }
     */

    setTimeout(() => {
      router.push("/workspace/anvix-generated");
    }, 1600);
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
      <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
        <div className="space-y-6">

          {/* =====================================================
              HERO
          ===================================================== */}

          <section
            className="
              relative
              overflow-hidden
              rounded-3xl
              border
              border-zinc-800/80
              bg-[#111113]
              px-6
              py-8
              sm:px-8
              sm:py-10
            "
          >
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
                bg-[#D4AF37]/10
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
                bg-[#D4AF37]/5
                blur-[100px]
              "
            />

            <div className="relative">
              <div className="mb-5 flex items-center gap-3">
                <div
                  className="
                    flex
                    h-10
                    w-10
                    items-center
                    justify-center
                    rounded-xl
                    border
                    border-[#D4AF37]/20
                    bg-[#D4AF37]/10
                  "
                >
                  <Sparkles
                    className="h-5 w-5 text-[#D4AF37]"
                    strokeWidth={1.8}
                  />
                </div>

                <div>
                  <p
                    className="
                      text-[11px]
                      font-semibold
                      uppercase
                      tracking-[0.2em]
                      text-[#D4AF37]
                    "
                  >
                    ANVIX AI BUILDER
                  </p>

                  <p className="mt-0.5 text-xs text-zinc-500">
                    Advanced generation workspace
                  </p>
                </div>
              </div>

              <h1
                className="
                  max-w-3xl
                  text-3xl
                  font-semibold
                  tracking-tight
                  text-white
                  sm:text-4xl
                "
              >
                What do you want to{" "}
                <span className="text-[#D4AF37]">
                  build?
                </span>
              </h1>

              <p
                className="
                  mt-3
                  max-w-2xl
                  text-sm
                  leading-6
                  text-zinc-400
                  sm:text-base
                "
              >
                Describe your idea, configure the architecture,
                and let ANVIX create the foundation for your
                application.
              </p>

              <div className="mt-5 flex flex-wrap gap-2">
                {[
                  "Describe your idea",
                  "Configure your stack",
                  "Generate your workspace",
                ].map((item) => (
                  <div
                    key={item}
                    className="
                      flex
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
                    <Check
                      className="h-3 w-3 text-[#D4AF37]"
                      strokeWidth={2.5}
                    />

                    <span className="text-[11px] text-zinc-400">
                      {item}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* =====================================================
              PROMPT BUILDER
          ===================================================== */}

          <PromptBuilder
            value={prompt}
            maxChars={MAX_CHARS}
            onChange={setPrompt}
            onGenerate={handleGenerate}
            onKeyDown={handleKeyDown}
            isSubmitting={isSubmitting}
            canGenerate={canGenerate}
          />

          {/* =====================================================
              EXAMPLE PROMPTS
          ===================================================== */}

          <ExamplePrompts
            onSelect={setPrompt}
            disabled={isSubmitting}
          />

          {/* =====================================================
              BUILD OPTIONS
          ===================================================== */}

          <BuildOptions
            value={buildConfig}
            onChange={handleBuildConfigChange}
            disabled={isSubmitting}
          />

          {/* =====================================================
              GENERATION PROGRESS
          ===================================================== */}

          {isSubmitting && (
            <GenerateProgress />
          )}

          {/* =====================================================
              BUILDER FOOTER
          ===================================================== */}

          <div
            className="
              flex
              items-start
              gap-3
              rounded-2xl
              border
              border-zinc-800/70
              bg-[#0D0D0F]
              px-4
              py-3
            "
          >
            <div
              className="
                flex
                h-8
                w-8
                shrink-0
                items-center
                justify-center
                rounded-lg
                bg-[#D4AF37]/10
              "
            >
              <Sparkles
                className="h-3.5 w-3.5 text-[#D4AF37]"
                strokeWidth={1.8}
              />
            </div>

            <p className="text-xs leading-5 text-zinc-500">
              <span className="font-medium text-zinc-300">
                Pro tip:
              </span>{" "}
              The more context you provide about your users,
              features, integrations, and desired experience,
              the more useful your generated workspace becomes.
            </p>
          </div>

        </div>
      </div>
    </AppShell>
  );
}