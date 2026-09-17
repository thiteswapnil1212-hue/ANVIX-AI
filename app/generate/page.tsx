
"use client";

import {
  useCallback,
  useRef,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import type { KeyboardEvent } from "react";
import { AlertCircle, ArrowRight, LoaderCircle } from "lucide-react";

import AppShell from "@/components/layout/AppShell";
import type { BuildApiResponse } from "@/lib/project/project-schema";

import GenerateHero from "@/components/generate/GenerateHero";
import PromptBuilder from "@/components/generate/PromptBuilder";
import ExamplePrompts from "@/components/generate/ExamplePrompts";
import BuildOptions, {
  type BuildConfiguration,
  defaultBuildConfiguration,
} from "@/components/generate/BuildOptions";
import GenerateProgress from "@/components/generate/GenerationProgress";

const MAX_CHARS = 2200;

const GENERATED_PROJECT_STORAGE_KEY =
  "anvix.generatedProject";

const AGENT_PROMPT_STORAGE_KEY =
  "anvix.agentPrompt";

function createProjectSlug(projectName: string) {
  const slug = projectName
    .normalize("NFKD")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80)
    .replace(/-+$/g, "");

  return slug || "anvix-generated";
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return "Something went wrong. Please try again.";
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

  const submissionLock = useRef(false);

  const trimmedPrompt = prompt.trim();
  const isPromptEmpty = trimmedPrompt.length === 0;
  const isPromptTooLong = prompt.length > MAX_CHARS;

  const canGenerate =
    !isPromptEmpty &&
    !isPromptTooLong &&
    !isSubmitting;

  const handlePromptChange = useCallback(
    (nextPrompt: string) => {
      setPrompt(nextPrompt);
      setErrorMessage("");
    },
    []
  );

  const handleBuildConfigChange = useCallback(
    (
      category: keyof BuildConfiguration,
      option: string
    ) => {
      setBuildConfig((current) => ({
        ...current,
        [category]: option,
      }));
    },
    []
  );

  const handleGenerate = useCallback(async () => {
    if (
      submissionLock.current ||
      isPromptEmpty ||
      isPromptTooLong
    ) {
      return;
    }

    submissionLock.current = true;
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

      let data: BuildApiResponse;

      try {
        data = (await response.json()) as BuildApiResponse;
      } catch {
        throw new Error(
          "The server returned an invalid response. Please try again."
        );
      }

      if (!response.ok || !data.success) {
        const message =
          data.success === false && data.error
            ? data.error
            : "Unable to generate your project. Please try again.";

        throw new Error(message);
      }

      if (!data.project?.name) {
        throw new Error(
          "The project response is incomplete. Please try again."
        );
      }

      sessionStorage.setItem(
        GENERATED_PROJECT_STORAGE_KEY,
        JSON.stringify(data.project)
      );

      sessionStorage.setItem(
        AGENT_PROMPT_STORAGE_KEY,
        trimmedPrompt
      );

      router.push(
        `/workspace/${createProjectSlug(data.project.name)}`
      );
    } catch (error) {
      console.error("ANVIX build generation failed:", error);

      setErrorMessage(getErrorMessage(error));
      submissionLock.current = false;
      setIsSubmitting(false);
    }
  }, [
    isPromptEmpty,
    isPromptTooLong,
    trimmedPrompt,
    router,
  ]);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLTextAreaElement>) => {
      if (
        event.key === "Enter" &&
        (event.metaKey || event.ctrlKey)
      ) {
        event.preventDefault();
        void handleGenerate();
      }
    },
    [handleGenerate]
  );

  return (
    <AppShell
      title="Generate"
      description="Turn your idea into an app."
    >
      <main className="w-full">
        <div
          className="
            mx-auto
            w-full
            max-w-[1400px]
            px-4
            py-5
            sm:px-6
            sm:py-7
            lg:px-8
            lg:py-9
            xl:px-10
          "
        >
          <div className="space-y-6 lg:space-y-7">
            {/* Hero */}

            <GenerateHero
              promptLength={prompt.length}
              maxChars={MAX_CHARS}
            />

            {/* Prompt */}

            <section className="space-y-3">
              <PromptBuilder
                value={prompt}
                maxChars={MAX_CHARS}
                onChange={handlePromptChange}
                onGenerate={handleGenerate}
                onKeyDown={handleKeyDown}
                isSubmitting={isSubmitting}
                canGenerate={canGenerate}
              />

              {isPromptTooLong && (
                <p
                  role="alert"
                  className="text-xs text-amber-300"
                >
                  Character limit exceeded ({MAX_CHARS}).
                </p>
              )}
            </section>

            {/* Examples */}

            <ExamplePrompts
              onSelect={handlePromptChange}
              disabled={isSubmitting}
            />

            {/* Build configuration */}

            <BuildOptions
              value={buildConfig}
              onChange={handleBuildConfigChange}
              disabled={isSubmitting}
            />

            {/* Progress */}

            {isSubmitting && (
              <div
                aria-live="polite"
                aria-busy="true"
                className="
                  overflow-hidden
                  rounded-2xl
                  border
                  border-[#D4AF37]/15
                  bg-[#0D0D0F]
                "
              >
                <GenerateProgress />
              </div>
            )}

            {/* Error */}

            {errorMessage && !isSubmitting && (
              <div
                role="alert"
                className="
                  flex
                  items-start
                  gap-3
                  rounded-xl
                  border
                  border-red-500/20
                  bg-red-500/[0.06]
                  px-4
                  py-3
                "
              >
                <AlertCircle
                  className="mt-0.5 h-4 w-4 shrink-0 text-red-300"
                  aria-hidden="true"
                />

                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-red-200">
                    Generation failed
                  </p>

                  <p className="mt-1 break-words text-xs leading-5 text-red-200/70">
                    {errorMessage}
                  </p>

                  <button
                    type="button"
                    onClick={() => void handleGenerate()}
                    disabled={!canGenerate}
                    className="
                      mt-3
                      inline-flex
                      items-center
                      gap-1.5
                      text-xs
                      font-semibold
                      text-red-200
                      transition
                      hover:text-white
                      disabled:cursor-not-allowed
                      disabled:opacity-40
                    "
                  >
                    Try again
                    <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            )}

            {/* Minimal keyboard hint */}

            {!isSubmitting && !errorMessage && (
              <div className="flex justify-center">
                <p className="text-[11px] text-zinc-600">
                  <span className="text-zinc-500">
                    Ctrl
                  </span>
                  {" + "}
                  <span className="text-zinc-500">
                    Enter
                  </span>
                  {" to generate"}
                </p>
              </div>
            )}
          </div>
        </div>
      </main>
    </AppShell>
  );
}