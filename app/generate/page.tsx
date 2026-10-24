
"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import type { KeyboardEvent } from "react";
import { AlertCircle, ArrowRight } from "lucide-react";

import AppShell from "@/components/layout/AppShell";
import type {
  BuildApiResponse,
  BuildProjectResponse,
} from "@/lib/project/project-schema";

import GenerateHero from "@/components/generate/GenerateHero";
import PromptBuilder from "@/components/generate/PromptBuilder";
import ExamplePrompts from "@/components/generate/ExamplePrompts";
import BuildOptions, {
  type BuildConfiguration,
  defaultBuildConfiguration,
} from "@/components/generate/BuildOptions";
import GenerateProgress from "@/components/generate/GenerationProgress";
import { useAuth } from "@/components/auth/AuthProvider";
import { insertProject } from "@/lib/supabase/cloud";

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

interface StreamBuildCallbacks {
  onFile: (path: string) => void;
  onStatus: (message: string) => void;
}

/**
 * Consume /api/build/stream (SSE). Resolves with the finished project
 * on the done event; throws on any error event or a stream that ends
 * early, so the caller can fall back to the classic endpoint.
 */
async function streamBuildProject(
  prompt: string,
  callbacks: StreamBuildCallbacks
): Promise<BuildProjectResponse> {
  const response = await fetch("/api/build/stream", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ prompt }),
  });

  const contentType = response.headers.get("content-type") ?? "";
  if (!response.ok || !response.body || !contentType.includes("text/event-stream")) {
    throw new Error("Stream unavailable");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let filesSeen = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    let boundary = buffer.indexOf("\n\n");

    while (boundary !== -1) {
      const chunk = buffer.slice(0, boundary);
      buffer = buffer.slice(boundary + 2);

      for (const line of chunk.split("\n")) {
        if (!line.startsWith("data: ")) continue;

        let event: Record<string, unknown>;
        try {
          event = JSON.parse(line.slice(6)) as Record<string, unknown>;
        } catch {
          continue;
        }

        if (event.type === "file" && typeof event.file === "object" && event.file) {
          const path = (event.file as Record<string, unknown>).path;
          if (typeof path === "string") {
            filesSeen += 1;
            callbacks.onFile(path);
          }
        } else if (event.type === "status" && typeof event.message === "string") {
          callbacks.onStatus(event.message);
        } else if (event.type === "done") {
          const project = event.project as BuildProjectResponse["project"];
          const autoFix = event.autoFix as
            | { applied?: boolean; fixedFileCount?: number; issues?: string[]; remainingIssues?: string[] }
            | undefined;
          return {
            success: true,
            project,
            autoFixNote: autoFix?.applied
              ? `Auto-fixed ${autoFix.fixedFileCount ?? 0} file(s) — ${autoFix.remainingIssues?.length ?? 0} issue(s) left.`
              : autoFix && (autoFix.issues?.length ?? 0) > 0
                ? `Checked the project: ${autoFix.issues?.length} issue(s) found, fix pass did not apply.`
                : null,
          } as BuildProjectResponse & { autoFixNote: string | null };
        } else if (event.type === "error") {
          throw new Error(
            typeof event.message === "string" ? event.message : "Generation failed"
          );
        }
      }

      boundary = buffer.indexOf("\n\n");
    }
  }

  throw new Error(
    filesSeen > 0
      ? "Stream ended before the project was complete. Please try again."
      : "Stream unavailable"
  );
}

export default function GeneratePage() {
  const router = useRouter();
  const { user } = useAuth();

  const [prompt, setPrompt] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [streamedFiles, setStreamedFiles] = useState<string[]>([]);
  const [streamNote, setStreamNote] = useState("");
  const [streamAutoFix, setStreamAutoFix] = useState<string | null>(null);

  const [buildConfig, setBuildConfig] =
    useState<BuildConfiguration>(
      defaultBuildConfiguration
    );

  const submissionLock = useRef(false);

  // Landing blueprint "Continue to Build" hands the prompt over via storage.
  useEffect(() => {
    try {
      const prefill = sessionStorage.getItem("anvix.generatePrefill");
      if (prefill) {
        sessionStorage.removeItem("anvix.generatePrefill");
        // eslint-disable-next-line react-hooks/set-state-in-effect -- browser storage is an external system that only exists after mount; lazy init would break hydration
        setPrompt(prefill.slice(0, MAX_CHARS));
      }
    } catch {
      // Storage unavailable (private mode) — start with an empty prompt.
    }
  }, []);

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
      setStreamedFiles([]);
      setStreamNote("");
      setStreamAutoFix(null);

      let data: BuildApiResponse | null = null;

      try {
        const streamed = await streamBuildProject(trimmedPrompt, {
          onFile: (path) =>
            setStreamedFiles((prev) =>
              prev.includes(path) ? prev : [...prev, path]
            ),
          onStatus: (message) => setStreamNote(message),
        });
        data = streamed;
        setStreamAutoFix(
          (streamed as BuildProjectResponse & { autoFixNote?: string | null })
            .autoFixNote ?? null
        );
      } catch {
        // Stream unavailable or failed before producing a project —
        // fall back to the classic one-shot endpoint below.
        data = null;
      }

      if (!data) {
        const response = await fetch("/api/build", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            prompt: trimmedPrompt,
          }),
        });

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
      }

      if (!data.project?.name) {
        throw new Error(
          "The project response is incomplete. Please try again."
        );
      }

      localStorage.setItem(
        GENERATED_PROJECT_STORAGE_KEY,
        JSON.stringify(data.project)
      );

      localStorage.setItem(
        AGENT_PROMPT_STORAGE_KEY,
        trimmedPrompt
      );

      // Signed-in users also get the project in their account, so it
      // appears on the dashboard from any device. Fire-and-forget: the
      // local copy above is already saved if the cloud write fails.
      if (user) {
        void insertProject(user.id, {
          name: data.project.name,
          framework: data.project.framework,
          files: data.project.files,
          prompt: trimmedPrompt,
        });
      }

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
    user,
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
                <GenerateProgress
                  currentStep={streamedFiles.length > 0 ? 3 : 1}
                />

                {(streamNote || streamedFiles.length > 0 || streamAutoFix) && (
                  <div className="border-t border-white/[0.06] px-5 py-4">
                    {streamNote && (
                      <p className="text-xs text-zinc-400">{streamNote}</p>
                    )}

                    {streamedFiles.length > 0 && (
                      <ul className="mt-3 max-h-40 space-y-1 overflow-y-auto pr-1">
                        {streamedFiles.map((path) => (
                          <li
                            key={path}
                            className="truncate font-mono text-[11px] text-zinc-500"
                          >
                            {path}
                          </li>
                        ))}
                      </ul>
                    )}

                    {streamAutoFix && (
                      <p className="mt-3 text-xs text-[#d4b35e]">
                        {streamAutoFix}
                      </p>
                    )}
                  </div>
                )}
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