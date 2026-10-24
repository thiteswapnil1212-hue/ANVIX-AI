import { enforceRateLimit } from "@/lib/rate-limit";

import { GoogleGenerativeAI } from "@google/generative-ai";

import { streamProjectWithFallback } from "@/lib/gemini/stream";
import {
  applyFixFiles,
  autoFixProject,
} from "@/lib/gemini/autofix";
import {
  GENERATION_MODELS,
  MAX_PROMPT_LENGTH,
  PROJECT_RESPONSE_SCHEMA,
  SYSTEM_INSTRUCTION,
} from "@/lib/gemini/build-prompt";
import {
  validateGeneratedProjectFiles,
} from "@/lib/project/validate";
import type { GeneratedProject, ProjectFile } from "@/lib/project/project-schema";

/**
 * Streaming build generation (SSE).
 *
 * Same model chain, prompt and validation as /api/build — only the
 * delivery differs: file events arrive as the model finishes each file,
 * then one auto-fix pass runs when validation finds errors, then a
 * done event carries the final project plus the auto-fix summary.
 * If generation fails after files were already emitted, the client
 * keeps the partial file list and shows a retry; the stream never
 * pretends a partial project is complete.
 */

type StreamEvent =
  | { type: "status"; message: string }
  | { type: "model"; model: string }
  | { type: "file"; file: ProjectFile; replaces?: boolean }
  | {
      type: "done";
      project: GeneratedProject;
      autoFix: {
        issues: string[];
        fixedFileCount: number;
        remainingIssues: string[];
        applied: boolean;
      };
    }
  | { type: "error"; message: string };

function encodeEvent(event: StreamEvent): string {
  return `data: ${JSON.stringify(event)}\n\n`;
}

export async function POST(req: Request) {
  const limited = enforceRateLimit(req, "build-stream", 6, 60_000);
  if (limited) return limited;

  let prompt: unknown;
  try {
    prompt = (await req.json() as { prompt?: unknown }).prompt;
  } catch {
    return Response.json(
      { success: false, error: "Invalid JSON" },
      { status: 400 }
    );
  }

  if (typeof prompt !== "string") {
    return Response.json(
      { success: false, error: "Prompt is required" },
      { status: 400 }
    );
  }

  const normalizedPrompt = prompt.trim();
  if (!normalizedPrompt) {
    return Response.json(
      { success: false, error: "Prompt cannot be empty" },
      { status: 400 }
    );
  }
  if (normalizedPrompt.length < 3) {
    return Response.json(
      { success: false, error: "Prompt is too short" },
      { status: 400 }
    );
  }
  if (normalizedPrompt.length > MAX_PROMPT_LENGTH) {
    return Response.json(
      { success: false, error: "Prompt is too long" },
      { status: 400 }
    );
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error("GEMINI_API_KEY is not set on the server");
    return Response.json(
      { success: false, error: "Server configuration error" },
      { status: 500 }
    );
  }

  const encoder = new TextEncoder();
  let streamClosed = false;

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const emit = (event: StreamEvent) => {
        if (streamClosed || req.signal.aborted) return;
        controller.enqueue(encoder.encode(encodeEvent(event)));
      };

      const closeStream = () => {
        if (!streamClosed) {
          streamClosed = true;
          controller.close();
        }
      };

      req.signal.addEventListener(
        "abort",
        () => {
          streamClosed = true;
        },
        { once: true }
      );

      void (async () => {
        try {
          emit({ type: "status", message: "Understanding your idea…" });

          const project = await streamProjectWithFallback(
            apiKey,
            normalizedPrompt,
            (key, modelName) => {
              const genAI = new GoogleGenerativeAI(key);
              return genAI.getGenerativeModel({
                model: modelName,
                systemInstruction: SYSTEM_INSTRUCTION,
                generationConfig: {
                  responseMimeType: "application/json",
                  responseSchema: PROJECT_RESPONSE_SCHEMA as never,
                  temperature: 0.2,
                  maxOutputTokens: 12000,
                },
              });
            },
            {
              onModel: (model) => emit({ type: "model", model }),
              onFile: (file) => emit({ type: "file", file }),
            }
          );

          if (streamClosed || req.signal.aborted) return;

          let finalProject = project;
          const issues = validateGeneratedProjectFiles(project);
          const errorMessages = issues
            .filter((issue) => issue.severity === "error")
            .map((issue) => issue.message);

          let autoFix = {
            issues: errorMessages,
            fixedFileCount: 0,
            remainingIssues: errorMessages,
            applied: false,
          };

          if (errorMessages.length > 0) {
            emit({
              type: "status",
              message: `Checking the project — fixing ${errorMessages.length} issue${errorMessages.length === 1 ? "" : "s"}…`,
            });

            const fix = await autoFixProject(apiKey, project, issues);
            if (fix) {
              finalProject = applyFixFiles(project, fix.files);
              for (const file of fix.files) {
                emit({ type: "file", file, replaces: true });
              }
              const remaining = validateGeneratedProjectFiles(finalProject)
                .filter((issue) => issue.severity === "error")
                .map((issue) => issue.message);
              autoFix = {
                issues: errorMessages,
                fixedFileCount: fix.files.length,
                remainingIssues: remaining,
                applied: true,
              };
            }
          }

          emit({ type: "done", project: finalProject, autoFix });
        } catch (error) {
          const message =
            error instanceof Error ? error.message : "Generation failed";
          console.error("[ANVIX BUILD STREAM] Generation failed", {
            models: GENERATION_MODELS.join(", "),
            promptLength: normalizedPrompt.length,
            error: message,
          });
          emit({
            type: "error",
            message:
              message === "Gemini request timed out"
                ? "Generation timed out. Please try again."
                : message.startsWith("Gemini returned") ||
                    message.startsWith("Generated project") ||
                    message.startsWith("Gemini response")
                  ? message
                  : "AI service is currently unavailable",
          });
        } finally {
          closeStream();
        }
      })();
    },
    cancel() {
      streamClosed = true;
    },
  });

  return new Response(stream, {
    headers: {
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "Content-Type": "text/event-stream; charset=utf-8",
      "X-Accel-Buffering": "no",
    },
  });
}
