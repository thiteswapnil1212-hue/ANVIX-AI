// ANVIX web agent — plain JSON route.
//
// POST { task, startUrl? } → runs the task and returns the full result
// as JSON. Non-interactive: any step that needs approval is auto-denied
// and the task stops with a plain message — approval without a human in
// the loop is never granted. For the interactive stream (progress +
// approve/deny), use /api/web-agent/stream instead.

import { NextResponse } from "next/server";

import { enforceRateLimit } from "@/lib/rate-limit";
import { isWebAgentAvailable } from "@/lib/web-agent/availability";
import { isAllowedWebUrl } from "@/lib/web-agent/urls";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_TASK_LENGTH = 2000;

function jsonError(error: string, status: number) {
  return NextResponse.json({ success: false, error }, { status });
}

export async function GET() {
  return NextResponse.json(
    { success: false, error: "Method not allowed. Use POST." },
    { status: 405, headers: { Allow: "POST" } }
  );
}

export async function POST(req: Request) {
  // Availability FIRST — before rate-limit and body parsing. On the
  // hosted deployment this always answers the honest 503, and the
  // heavy runner (browser + planner + Gemini) is never loaded there.
  const availability = isWebAgentAvailable();
  if (!availability.available) {
    return NextResponse.json(
      {
        success: false,
        error: availability.reason ?? "Web agent is not available here.",
      },
      { status: 503 }
    );
  }

  const limited = enforceRateLimit(req, "web-agent", 5, 60_000);
  if (limited) return limited;

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return jsonError("Invalid JSON body.", 400);
  }

  if (!body || typeof body !== "object") {
    return jsonError("Request body must be a JSON object.", 400);
  }

  if (typeof body.task !== "string" || !body.task.trim()) {
    return jsonError("Task is required.", 400);
  }

  if (body.task.trim().length > MAX_TASK_LENGTH) {
    return jsonError("Task is too long.", 400);
  }

  if (
    body.startUrl !== undefined &&
    !isAllowedWebUrl(body.startUrl)
  ) {
    return jsonError("startUrl must be a public http(s) URL.", 400);
  }

  try {
    // Dynamic import only after the guard passed — on Vercel this
    // line is never reached, so the runner chain never loads there.
    const { runWebTask } = await import("@/lib/web-agent/runner");
    const result = await runWebTask({
      task: body.task.trim(),
      startUrl:
        typeof body.startUrl === "string" ? body.startUrl : undefined,
      signal: req.signal,
      interactive: false,
    });

    if (!result.success) {
      // result.message is the plain client-facing message the runner
      // already mapped (quota → 503 message, missing key → 500
      // message). Status follows those plain messages — no regex on
      // raw internals, and the unavailable case never reaches here:
      // the route answers 503 itself before runWebTask runs.
      const message = result.message || "Web task failed";
      const status =
        message ===
        "AI service is busy right now (quota limit). Please wait a bit and try again."
          ? 503
          : message === "Gemini API key is not configured on the server."
            ? 500
            : 400;
      return NextResponse.json(
        { success: false, error: message, steps: result.steps },
        { status }
      );
    }

    return NextResponse.json({
      success: true,
      message: result.message,
      steps: result.steps,
    });
  } catch (error) {
    // Never leak raw internals to the client (e.g. Playwright launch
    // paths). Log server-side, answer with a plain message.
    console.error(
      "[ANVIX WEB AGENT] Task failed",
      error instanceof Error ? error.message : error
    );
    const raw = error instanceof Error ? error.message : "Web task failed.";
    if (/GEMINI_API_KEY|Gemini API key/i.test(raw)) {
      return jsonError("Gemini API key is not configured on the server.", 500);
    }
    if (/quota|busy right now/i.test(raw)) {
      return jsonError(
        "AI service is busy right now (quota limit). Please wait a bit and try again.",
        503
      );
    }
    return jsonError("Web task failed.", 400);
  }
}
