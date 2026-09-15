import { runAgentService, type AgentProgressEvent } from "@/lib/agent/agent";
import { isGeneratedProject, type GeneratedProject } from "@/lib/project/project-schema";

const MAX_PROMPT_LENGTH = 20000;

type StreamEvent =
  | { type: "agent_start" }
  | AgentProgressEvent
  | { type: "agent_complete" }
  | { type: "error"; message: string };

function jsonError(error: string, status: number) {
  return Response.json(
    { success: false, error },
    { status }
  );
}

function validateProjectPath(filePath: string) {
  const normalized = filePath.trim().replace(/\\/g, "/");

  if (
    !normalized ||
    normalized.includes("\0") ||
    normalized.includes("..") ||
    normalized.startsWith("/") ||
    /^[a-zA-Z]:\//.test(normalized) ||
    normalized.split("/").some((part) => !part || part === ".")
  ) {
    throw new Error("Project contains an invalid file path");
  }
}

function validateProject(payload: unknown): GeneratedProject {
  if (!isGeneratedProject(payload)) {
    throw new Error("Project payload is invalid");
  }

  if (!payload.name.trim() || payload.files.length === 0) {
    throw new Error("Project must include a name and at least one file");
  }

  const paths = new Set<string>();

  for (const file of payload.files) {
    validateProjectPath(file.path);

    if (!file.language.trim() || !file.content.trim()) {
      throw new Error("Project files must include language and content");
    }

    const normalizedPath = file.path.trim().replace(/\\/g, "/");
    if (paths.has(normalizedPath)) {
      throw new Error(`Project contains a duplicate file: ${normalizedPath}`);
    }
    paths.add(normalizedPath);
  }

  return {
    name: payload.name.trim(),
    framework: "nextjs",
    files: payload.files.map((file) => ({
      path: file.path.trim().replace(/\\/g, "/"),
      content: file.content,
      language: file.language.trim(),
    })),
  };
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Agent request failed";
}

function encodeEvent(event: StreamEvent) {
  return `${JSON.stringify(event)}\n`;
}

export async function POST(request: Request) {
  let body: Record<string, unknown>;

  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return jsonError("Invalid JSON", 400);
  }

  if (typeof body.prompt !== "string" || !body.prompt.trim()) {
    return jsonError("Prompt is required", 400);
  }

  if (body.prompt.trim().length > MAX_PROMPT_LENGTH) {
    return jsonError("Prompt is too long", 400);
  }

  let project: GeneratedProject;
  try {
    project = validateProject(body.project);
  } catch (error) {
    return jsonError(getErrorMessage(error), 400);
  }

  const encoder = new TextEncoder();
  let streamClosed = false;

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const emit = (event: StreamEvent) => {
        if (streamClosed || request.signal.aborted) {
          return;
        }
        controller.enqueue(encoder.encode(encodeEvent(event)));
      };

      const closeStream = () => {
        if (!streamClosed) {
          streamClosed = true;
          controller.close();
        }
      };

      request.signal.addEventListener(
        "abort",
        () => {
          streamClosed = true;
        },
        { once: true }
      );

      void (async () => {
        emit({ type: "agent_start" });

        try {
          const response = await runAgentService({
            prompt: body.prompt as string,
            project,
            signal: request.signal,
            onEvent: emit,
          });

          if (streamClosed || request.signal.aborted) {
            return;
          }

          if (!response.success) {
            emit({
              type: "error",
              message: response.error || response.message || "Agent failed",
            });
            return;
          }

          emit({ type: "agent_complete" });
        } catch (error) {
          emit({ type: "error", message: getErrorMessage(error) });
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
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "X-Accel-Buffering": "no",
    },
  });
}