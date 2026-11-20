// ANVIX web agent — approval gate.
//
// Some steps must never run without the user saying yes first: clicking
// Send, submitting a form, signing in, paying, deleting. When the
// runner reaches one, it pauses the task and waits for the decision to
// arrive from the client (POST /api/web-agent/approve). The client shows
// the request inline in the AGI chat with Approve / Deny buttons.
//
// Pending approvals live in a module-level map — same single-instance
// pattern as the in-memory rate limiter. If the server restarts, pending
// approvals are gone and the run reports a timeout; nothing is
// auto-approved, ever.

import { randomUUID } from "node:crypto";

import type { ApprovalRequest, WebStep } from "./types";

export type ApprovalDecision = "allowed" | "denied";

export const APPROVAL_TIMEOUT_MS = 120_000;

interface PendingApproval {
  request: ApprovalRequest;
  resolve: (decision: ApprovalDecision | "timeout") => void;
  timer: ReturnType<typeof setTimeout>;
}

const pending = new Map<string, PendingApproval>();

function pendingKey(runId: string, approvalId: string): string {
  return `${runId}:${approvalId}`;
}

/** Which click text is always approval-gated, even if the planner forgot. */
const RISKY_CLICK_TEXT =
  /submit|send|sign ?in|log ?in|buy|purchase|pay|checkout|delete|remove|confirm/i;

/** True when this step must pause for approval before running. */
export function stepNeedsApproval(step: WebStep): boolean {
  if (step.requiresApproval === true) {
    return true;
  }

  if (step.tool === "click") {
    const haystack = `${String(step.input.selector ?? "")} ${String(
      step.input.text ?? ""
    )}`;
    return RISKY_CLICK_TEXT.test(haystack);
  }

  return false;
}

export function approvalTitleFor(step: WebStep, stepIndex: number): string {
  const label =
    step.tool === "click"
      ? `Click "${String(step.input.selector ?? step.tool)}"`
      : step.tool === "type"
        ? `Type into "${String(step.input.selector ?? "")}"`
        : step.tool === "navigate"
          ? `Open ${String(step.input.url ?? "")}`
          : step.tool;

  return `Step ${stepIndex + 1}: ${label}`;
}

export function approvalDescriptionFor(step: WebStep): string {
  if (step.tool === "click") {
    return "AGI wants to click this on the page. Approve only if you can see what it will do — a click can send a message, submit a form, or buy something.";
  }
  if (step.tool === "type") {
    return "AGI wants to type into this field. Check the text first — typing can send a message or submit personal details.";
  }
  if (step.tool === "navigate") {
    return "AGI wants to open this page in the browser.";
  }
  return "AGI wants to run this step. Approve only if you recognise what it does.";
}

/**
 * Register an approval request and wait for the user's decision.
 * Resolves "timeout" if nobody answers within APPROVAL_TIMEOUT_MS.
 */
export function requestApproval(
  request: ApprovalRequest,
  timeoutMs: number = APPROVAL_TIMEOUT_MS
): Promise<ApprovalDecision | "timeout"> {
  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      pending.delete(pendingKey(request.runId, request.id));
      resolve("timeout");
    }, timeoutMs);

    // A fresh timer must not keep the server process alive on its own.
    timer.unref?.();

    pending.set(pendingKey(request.runId, request.id), {
      request,
      resolve: (decision) => {
        clearTimeout(timer);
        resolve(decision);
      },
      timer,
    });
  });
}

/** Resolve a pending approval. Returns false when it is unknown/expired. */
export function resolveApproval(
  runId: string,
  approvalId: string,
  decision: ApprovalDecision
): boolean {
  const key = pendingKey(runId, approvalId);
  const entry = pending.get(key);

  if (!entry) {
    return false;
  }

  pending.delete(key);
  entry.resolve(decision);
  return true;
}

/** Reject every pending approval for a run (abort / disconnect / done). */
export function cancelRunApprovals(runId: string): void {
  for (const [key, entry] of pending.entries()) {
    if (key.startsWith(`${runId}:`)) {
      clearTimeout(entry.timer);
      pending.delete(key);
      entry.resolve("denied");
    }
  }
}

export function newApprovalId(): string {
  return randomUUID();
}
