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
      // result.message is the plain client-facing message; result.error
      // can still hold the raw detail (e.g. "GEMINI_API_KEY is not set").
      // The old code surfaced the raw error and its /Gemini API key/
      // check missed the underscored form, so a missing key came back
      // as a 400 with the raw message — verified live.
      const message = result.message || result.error || "Web task failed";
      const detail = `${result.error ?? ""} ${message}`;
      const status = /quota|busy right now/i.test(detail)
        ? 503
        : /not available on the hosted deployment/i.test(detail)
          ? 503
          : /GEMINI_API_KEY|Gemini API key/i.test(detail)
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
    return jsonError(raw, 400);
  }
}
