// ANVIX web agent — approval decision route.
//
// POST { runId, approvalId, decision: "allowed" | "denied" } → resolves
// the pending approval the stream route is waiting on. The client calls
// this from the Approve / Deny buttons in the AGI chat, and records the
// outcome in the local Approvals history at the same time.
//
// A decision for an unknown or already-expired approval is a 404 —
// approvals expire after 2 minutes and are never auto-approved.

import { NextResponse } from "next/server";

import { enforceRateLimit } from "@/lib/rate-limit";
import { resolveApproval } from "@/lib/web-agent/approvals";

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
  const limited = enforceRateLimit(req, "web-agent-approve", 30, 60_000);
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

  if (typeof body.runId !== "string" || !body.runId.trim()) {
    return jsonError("runId is required.", 400);
  }

  if (typeof body.approvalId !== "string" || !body.approvalId.trim()) {
    return jsonError("approvalId is required.", 400);
  }

  if (body.decision !== "allowed" && body.decision !== "denied") {
    return jsonError('decision must be "allowed" or "denied".', 400);
  }

  const resolved = resolveApproval(
    body.runId.trim(),
    body.approvalId.trim(),
    body.decision
  );

  if (!resolved) {
    return jsonError(
      "Approval not found or already expired. The task has stopped.",
      404
    );
  }

  return NextResponse.json({ success: true, decision: body.decision });
}
