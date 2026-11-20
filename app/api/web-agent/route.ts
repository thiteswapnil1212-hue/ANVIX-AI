// ANVIX web agent — plain JSON route.
//
// POST { task, startUrl? } → runs the task and returns the full result
// as JSON. Non-interactive: any step that needs approval is auto-denied
// and the task stops with a plain message — approval without a human in
// the loop is never granted. For the interactive stream (progress +
// approve/deny), use /api/web-agent/stream instead.

import { NextResponse } from "next/server";

import { enforceRateLimit } from "@/lib/rate-limit";
import { isAllowedWebUrl } from "@/lib/web-agent/planner";
import { runWebTask } from "@/lib/web-agent/runner";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_TASK_LENGTH = 2000;

function jsonError(error: string, status: number) {
  return NextResponse.json({ success: false, error }, { status });
}

export async function POST(req: Request) {
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
    const result = await runWebTask({
      task: body.task.trim(),
      startUrl:
        typeof body.startUrl === "string" ? body.startUrl : undefined,
      signal: req.signal,
      interactive: false,
    });

    if (!result.success) {
      const message = result.error || result.message || "Web task failed";
      const status = /quota|busy right now/i.test(message)
        ? 503
        : /not available on the hosted deployment/i.test(message)
          ? 503
          : /Gemini API key/i.test(message)
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
    const message =
      error instanceof Error ? error.message : "Web task failed.";
    return jsonError(message, 400);
  }
}
