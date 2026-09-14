"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Sparkles } from "lucide-react";

import AppShell from "@/components/layout/AppShell";
import type { BuildApiResponse } from "@/lib/project/project-schema";

import GenerateHero from "@/components/generate/GenerateHero";
import PromptBuilder from "@/components/generate/PromptBuilder";
import ExamplePrompts from "@/components/generate/ExamplePrompts";
import BuildOptions, {
  BuildConfiguration,
  defaultBuildConfiguration,
} from "@/components/generate/BuildOptions";
import GenerateProgress from "@/components/generate/GenerationProgress";

const MAX_CHARS = 2200;
const GENERATED_PROJECT_STORAGE_KEY = "anvix.generatedProject";

function createProjectSlug(projectName: string) {
  const slug = projectName
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return slug || "anvix-generated";
}

export default function GeneratePage() {
  const router = useRouter();

  const [prompt, setPrompt] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

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

  async function handleGenerate() {
    if (!canGenerate) return;

    setIsSubmitting(true);
    setErrorMessage("");

    try {
      const response = await fetch("/api/build", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prompt: trimmedPrompt,
        }),
      });

      const data = (await response.json()) as BuildApiResponse;

      if (!response.ok || !data.success) {
        throw new Error(
          data.success
            ? "Project generation failed"
            : data.error
        );
      }

      sessionStorage.setItem(
        GENERATED_PROJECT_STORAGE_KEY,
        JSON.stringify(data.project)
      );

      router.push(
        `/workspace/${createProjectSlug(data.project.name)}`
      );
    } catch (error) {
      console.error("ANVIX build generation failed:", error);

      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Unable to generate the project right now."
      );
      setIsSubmitting(false);
    }
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
      <main className="w-full">
        <div
          className="
            mx-auto
            w-full
            max-w-[1400px]
            px-4
            py-6
            sm:px-6
            sm:py-8
            lg:px-8
            lg:py-10
            xl:px-10
          "
        >
          <div className="space-y-6 lg:space-y-7">

            {/* Generate Hero */}

            <GenerateHero
              promptLength={prompt.length}
              maxChars={MAX_CHARS}
            />

            {/* Prompt Builder */}

            <PromptBuilder
              value={prompt}
              maxChars={MAX_CHARS}
              onChange={setPrompt}
              onGenerate={handleGenerate}
              onKeyDown={handleKeyDown}
              isSubmitting={isSubmitting}
              canGenerate={canGenerate}
            />

            {/* Example Prompts */}

            <ExamplePrompts
              onSelect={setPrompt}
              disabled={isSubmitting}
            />

            {/* Build Options */}

            <BuildOptions
              value={buildConfig}
              onChange={handleBuildConfigChange}
              disabled={isSubmitting}
            />

            {/* Generation Progress */}

            {isSubmitting && (
              <GenerateProgress />
            )}

            {errorMessage && (
              <div
                role="alert"
                className="
                  rounded-2xl
                  border
                  border-red-500/20
                  bg-red-500/[0.06]
                  px-4
                  py-3
                  text-xs
                  leading-5
                  text-red-200
                "
              >
                {errorMessage}
              </div>
            )}

            {/* Builder Footer */}

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
                py-3.5
                lg:px-5
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
                  border
                  border-[#D4AF37]/10
                  bg-[#D4AF37]/[0.06]
                "
              >
                <Sparkles
                  className="h-3.5 w-3.5 text-[#D4AF37]"
                  strokeWidth={1.8}
                  aria-hidden="true"
                />
              </div>

              <div className="min-w-0">
                <p className="text-xs leading-5 text-zinc-500">
                  <span className="font-medium text-zinc-300">
                    Pro tip:
                  </span>{" "}
                  The more context you provide about your users,
                  features, integrations, workflows, and desired
                  experience, the more useful your first build becomes.
                </p>
              </div>
            </div>

          </div>
        </div>
      </main>
    </AppShell>
  );
}
