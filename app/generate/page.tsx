
"use client";

import {
  useCallback,
  useRef,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import type { KeyboardEvent } from "react";
import { Sparkles } from "lucide-react";

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

  // Prevent duplicate requests from rapid clicks or shortcuts.
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

      if (errorMessage) {
        setErrorMessage("");
      }
    },
    [errorMessage]
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
          response.ok
            ? "The server returned an invalid response. Please try again."
            : "The server could not complete your request. Please try again."
        );
      }

      if (!response.ok || !data.success) {
        const message =
          data.success === false && data.error
            ? data.error
            : "Project generation failed. Please try again.";

        throw new Error(message);
      }

      if (!data.project?.name) {
        throw new Error(
          "The generated project response is incomplete. Please try again."
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
      console.error(
        "ANVIX build generation failed:",
        error
      );

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
            {/* Hero */}

            <GenerateHero
              promptLength={prompt.length}
              maxChars={MAX_CHARS}
            />

            {/* Prompt builder */}

            <PromptBuilder
              value={prompt}
              maxChars={MAX_CHARS}
              onChange={handlePromptChange}
              onGenerate={handleGenerate}
              onKeyDown={handleKeyDown}
              isSubmitting={isSubmitting}
              canGenerate={canGenerate}
            />

            {/* Validation feedback */}

            {isPromptTooLong && (
              <p
                role="alert"
                className="text-xs text-amber-300"
              >
                Your prompt is over the {MAX_CHARS} character
                limit. Please shorten it before generating.
              </p>
            )}

            {/* Example prompts */}

            <ExamplePrompts
              onSelect={handlePromptChange}
              disabled={isSubmitting}
            />

            {/* Build options */}

            <BuildOptions
              value={buildConfig}
              onChange={handleBuildConfigChange}
              disabled={isSubmitting}
            />

            {/* Generation progress */}

            {isSubmitting && (
              <div
                aria-live="polite"
                aria-busy="true"
              >
                <GenerateProgress />
              </div>
            )}

            {/* Error state */}

            {errorMessage && (
              <div
                role="alert"
                className="
                  flex
                  items-start
                  gap-3
                  rounded-2xl
                  border
                  border-red-500/20
                  bg-red-500/[0.06]
                  px-4
                  py-3.5
                  text-sm
                  leading-5
                  text-red-200
                "
              >
                <span
                  className="
                    mt-0.5
                    flex
                    h-5
                    w-5
                    shrink-0
                    items-center
                    justify-center
                    rounded-full
                    border
                    border-red-400/30
                    text-xs
                    font-semibold
                  "
                  aria-hidden="true"
                >
                  !
                </span>

                <div className="min-w-0 flex-1">
                  <p className="font-medium">
                    Generation couldn’t be completed
                  </p>

                  <p className="mt-1 break-words text-red-200/80">
                    {errorMessage}
                  </p>

                  <button
                    type="button"
                    onClick={() => void handleGenerate()}
                    disabled={!canGenerate}
                    className="
                      mt-3
                      rounded-lg
                      border
                      border-red-400/20
                      px-3
                      py-1.5
                      text-xs
                      font-medium
                      text-red-100
                      transition
                      hover:bg-red-400/10
                      disabled:cursor-not-allowed
                      disabled:opacity-40
                    "
                  >
                    Try again
                  </button>
                </div>
              </div>
            )}

            {/* Builder footer */}

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
                  Describe your users, key features, integrations,
                  workflows, and the experience you want. A
                  clear prompt gives ANVIX more context for
                  your first build.
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </AppShell>
  );
}