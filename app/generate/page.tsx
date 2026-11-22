
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
import GenerateProgress from "@/components/generate/GenerationProgress";
import { useAuth } from "@/components/auth/AuthProvider";
import { getAuthHeaders } from "@/lib/api/auth-headers";
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
 * early, so the caller can retry the stream or show the error.
 */
async function streamBuildProject(
  prompt: string,
  callbacks: StreamBuildCallbacks
): Promise<BuildProjectResponse> {
  const response = await fetch("/api/build/stream", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(await getAuthHeaders()),
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
            | { applied?: boolean; fixedFileCount?: number; issues?: string[]; remainingIssues?: string[]; error?: string }
            | undefined;
          return {
            success: true,
            project,
            autoFixNote: autoFix?.applied
              ? `Auto-fixed ${autoFix.fixedFileCount ?? 0} file(s) — ${autoFix.remainingIssues?.length ?? 0} issue(s) left.`
              : autoFix && (autoFix.issues?.length ?? 0) > 0
                ? `Checked the project: ${autoFix.issues?.length} issue(s) found, fix pass did not apply.${autoFix.error ? ` (${autoFix.error})` : ""}`
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

/**
 * Classic one-shot build (/api/build): full generation, then autofix,
 * zero output until done. Kept alive server-side for non-browser
 * clients and as a manual option in the error state — the UI no
 * longer falls back to it silently (step 3.11).
 */
async function classicBuildProject(
  prompt: string
): Promise<BuildApiResponse> {
  const response = await fetch("/api/build", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(await getAuthHeaders()),
    },
    body: JSON.stringify({ prompt }),
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

  return data;
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
  // Offered in the error state after the stream fails twice: the
  // classic one-shot build is a manual choice now, never a silent
  // fallback (step 3.11).
  const [showClassicBuildOption, setShowClassicBuildOption] =
    useState(false);

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

  // Shared completion for both build paths: validate, persist
  // locally (+ cloud for signed-in users), then open the workspace.
  const completeBuild = useCallback(
    (data: BuildApiResponse) => {
      if (!data.success || !data.project?.name) {
        throw new Error(
          data.success === false && data.error
            ? data.error
            : "The project response is incomplete. Please try again."
        );
      }

      localStorage.setItem(
        GENERATED_PROJECT_STORAGE_KEY,
        JSON.stringify(data.project)
      );

      localStorage.setItem(AGENT_PROMPT_STORAGE_KEY, trimmedPrompt);

      // Signed-in users also get the project in their account, so it
      // appears on the dashboard from any device. Fire-and-forget: the
      // local copy above is already saved if the cloud write fails.
      // The returned cloud id is written back into the local copy so
      // Share and GitHub export can point at this exact cloud row.
      if (user) {
        void insertProject(user.id, {
          name: data.project.name,
          framework: data.project.framework,
          files: data.project.files,
          prompt: trimmedPrompt,
        }).then((saved) => {
          if (!saved) return;
          try {
            localStorage.setItem(
              GENERATED_PROJECT_STORAGE_KEY,
              JSON.stringify({ ...data.project, id: saved.id })
            );
          } catch {
            // The workspace still opens from the copy saved above.
          }
        });
      }

      router.push(`/workspace/${createProjectSlug(data.project.name)}`);
    },
    [router, trimmedPrompt, user]
  );

  // Manual classic-build option from the error state: the classic
  // one-shot endpoint is kept alive server-side for non-browser
  // clients, and offered here as an explicit choice — never a silent
  // fallback.
  const handleClassicBuild = useCallback(async () => {
    if (submissionLock.current || isPromptEmpty || isPromptTooLong) {
      return;
    }

    submissionLock.current = true;
    setIsSubmitting(true);
    setErrorMessage("");
    setShowClassicBuildOption(false);

    try {
      const data = await classicBuildProject(trimmedPrompt);
      completeBuild(data);
    } catch (error) {
      console.error("ANVIX classic build failed:", error);

      setErrorMessage(getErrorMessage(error));
      submissionLock.current = false;
      setIsSubmitting(false);
    }
  }, [completeBuild, isPromptEmpty, isPromptTooLong, trimmedPrompt]);

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
      setShowClassicBuildOption(false);

      let data: BuildApiResponse | null = null;
      let streamError: unknown = null;

      // Stream is the only UI path now: retry it once on failure
      // (transient failures often clear), then show the error. The
      // classic one-shot endpoint is no longer a silent fallback —
      // it is the slowest, most silent wait in the app (full
      // generation, then autofix, zero output until done). It stays
      // available server-side and as a manual option in the error
      // state below.
      for (let attempt = 1; attempt <= 2; attempt += 1) {
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
          break;
        } catch (error) {
          streamError = error;
          if (attempt === 1) {
            setStreamNote("Stream interrupted — retrying…");
          }
        }
      }

      if (!data) {
        setShowClassicBuildOption(true);
        throw streamError instanceof Error
          ? streamError
          : new Error("Stream unavailable");
      }

      completeBuild(data);
    } catch (error) {
      console.error("ANVIX build generation failed:", error);

      setErrorMessage(getErrorMessage(error));
      submissionLock.current = false;
      setIsSubmitting(false);
    }
  }, [
    completeBuild,
    isPromptEmpty,
    isPromptTooLong,
    trimmedPrompt,
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
                  {showClassicBuildOption && (
                    <button
                      type="button"
                      onClick={() => void handleClassicBuild()}
                      disabled={!canGenerate}
                      className="mt-2 inline-flex cursor-pointer items-center gap-2 rounded-full border border-white/10 px-4 py-2 text-sm font-medium text-white/70 transition hover:bg-white/10 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Try the classic build instead
                      <ArrowRight className="h-3.5 w-3.5" />
                    </button>
                  )}
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