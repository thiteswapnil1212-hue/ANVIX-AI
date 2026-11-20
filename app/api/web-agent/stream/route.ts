// ANVIX web agent — streaming route.
//
// POST { task, startUrl? } → NDJSON stream of WebTaskEvent:
// web_task_start → planning → step_start / step_complete → (approval_needed
// → waits for POST /api/web-agent/approve) → task_complete | error.
//
// Mirrors app/api/agent/stream/route.ts: same rate-limit style, same
// NDJSON framing, same rule that provider/quota failures never leak raw
// internals to the client.

import { enforceRateLimit } from "@/lib/rate-limit";
import { isAllowedWebUrl } from "@/lib/web-agent/planner";
import { runWebTask } from "@/lib/web-agent/runner";
import type { WebTaskEvent } from "@/lib/web-agent/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_TASK_LENGTH = 2000;

function jsonError(error: string, status: number) {
  return Response.json({ success: false, error }, { status });
}

function encodeEvent(event: WebTaskEvent): string {
  return `${JSON.stringify(event)}\n`;
}

function plainErrorMessage(raw: string): string {
  if (/429|quota/i.test(raw)) {
    return "AI quota is exhausted right now — please wait a bit and try again.";
  }
  if (
    /GoogleGenerativeAI Error|\b404\b|\b500\b|\b502\b|\b503\b|\b504\b|not found|no longer available/i.test(
      raw
    )
  ) {
    return "AI service is currently unavailable. Please try again shortly.";
  }
  return raw;
}

export async function POST(request: Request) {
  const limited = enforceRateLimit(request, "web-agent-stream", 5, 60_000);
  if (limited) return limited;

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return jsonError("Invalid JSON", 400);
  }

  if (typeof body.task !== "string" || !body.task.trim()) {
    return jsonError("Task is required", 400);
  }

  if (body.task.trim().length > MAX_TASK_LENGTH) {
    return jsonError("Task is too long", 400);
  }

  if (
    body.startUrl !== undefined &&
    !isAllowedWebUrl(body.startUrl)
  ) {
    return jsonError("startUrl must be a public http(s) URL.", 400);
  }

  const encoder = new TextEncoder();
  let streamClosed = false;

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const emit = (event: WebTaskEvent) => {
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
        try {
          await runWebTask({
            task: body.task as string,
            startUrl:
              typeof body.startUrl === "string"
                ? body.startUrl
                : undefined,
            signal: request.signal,
            interactive: true,
            onEvent: emit,
          });
          // The runner emits the terminal event itself (task_complete on
          // success, error on failure). Emitting one here too sent every
          // terminal event twice — verified live: a missing-key run
          // produced two error events, the second with the raw message.
        } catch (error) {
          if (streamClosed || request.signal.aborted) {
            return;
          }
          const rawMessage =
            error instanceof Error ? error.message : "Web task failed";
          emit({ type: "error", message: plainErrorMessage(rawMessage) });
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
