// ANVIX web agent — runner.
//
// Orchestrates one task end to end: plan it with Gemini, open the
// browser, run the steps in order, pause for approval when a step needs
// it, and report what happened in plain words. The browser is always
// closed at the end — even when the plan fails or the user stops the run.

import { randomUUID } from "node:crypto";

import {
  approvalDescriptionFor,
  approvalTitleFor,
  cancelRunApprovals,
  newApprovalId,
  requestApproval,
  stepNeedsApproval,
} from "./approvals";
import { isWebAgentAvailable, WebBrowser } from "./browser";
import { planWebTask } from "./planner";
import { runWebStep } from "./tools";
import type {
  WebStepResult,
  WebTaskEvent,
  WebTaskResult,
} from "./types";

export interface RunWebTaskOptions {
  task: string;
  startUrl?: string;
  signal?: AbortSignal;
  /**
   * True when a user is watching the stream and can answer approval
   * prompts. False (plain JSON route) auto-denies approval steps and
   * stops — approval without a human in the loop is never granted.
   */
  interactive: boolean;
  onEvent?: (event: WebTaskEvent) => void;
}

function isQuotaLike(message: string): boolean {
  return /429|quota|rate limit|resource exhausted|overloaded|service unavailable|503/i.test(
    message
  );
}

export async function runWebTask(
  options: RunWebTaskOptions
): Promise<WebTaskResult> {
  const runId = randomUUID();
  const emit = options.onEvent ?? (() => {});
  const steps: WebStepResult[] = [];

  const fail = (message: string, error?: string): WebTaskResult => ({
    success: false,
    message,
    steps,
    error,
  });

  emit({ type: "web_task_start", runId });

  const availability = isWebAgentAvailable();
  if (!availability.available) {
    const message =
      availability.reason ?? "Web agent is not available here.";
    emit({ type: "error", message });
    return fail(message, message);
  }

  if (options.signal?.aborted) {
    const message = "Task stopped before it started.";
    emit({ type: "error", message });
    return fail(message, message);
  }

  emit({ type: "planning" });

  let plan;
  try {
    plan = await planWebTask(options.task, {
      startUrl: options.startUrl,
      signal: options.signal,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Task planning failed";
    const plain = isQuotaLike(message)
      ? "AI service is busy right now (quota limit). Please wait a bit and try again."
      : /GEMINI_API_KEY/i.test(message)
        ? "Gemini API key is not configured on the server."
        : message;
    emit({ type: "error", message: plain });
    return fail(plain, message);
  }

  let browser: WebBrowser | null = null;

  // If the client disconnects mid-run, any approval we are waiting on
  // must not hang forever — deny it and let the run unwind.
  const onAbort = () => cancelRunApprovals(runId);
  options.signal?.addEventListener("abort", onAbort, { once: true });

  try {
    try {
      browser = await WebBrowser.launch();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Browser failed to start";
      emit({ type: "error", message });
      return fail(message, message);
    }

    const page = await browser.newPage();

    for (let index = 0; index < plan.steps.length; index += 1) {
      if (options.signal?.aborted) {
        return fail("Task stopped.", "Task stopped by the user.");
      }

      const step = plan.steps[index]!;
      const detail = `${step.tool}${
        step.tool === "navigate" ? ` ${String(step.input.url ?? "")}` : ""
      }`;

      emit({ type: "step_start", index, tool: step.tool, detail });

      if (stepNeedsApproval(step)) {
        if (!options.interactive) {
          const message =
            "This task needs your approval before it can continue " +
            "(a step would click, send, or submit something). " +
            "Run it from the AGI chat to approve it.";
          steps.push({
            index,
            tool: step.tool,
            success: false,
            detail: message,
            approval: "denied",
          });
          emit({ type: "error", message });
          return fail(message, message);
        }

        const approval = {
          id: newApprovalId(),
          runId,
          stepIndex: index,
          title: approvalTitleFor(step, index),
          description: approvalDescriptionFor(step),
        };

        emit({ type: "approval_needed", approval });

        const decision = await requestApproval(approval);

        if (decision !== "allowed") {
          const message =
            decision === "timeout"
              ? "Approval timed out after 2 minutes, so the task stopped before this step."
              : "You denied this step, so the task stopped.";
          steps.push({
            index,
            tool: step.tool,
            success: false,
            detail: message,
            approval: decision,
          });
          emit({ type: "error", message });
          return fail(message, message);
        }

        steps.push({
          index,
          tool: step.tool,
          success: true,
          detail: "Approved — continuing.",
          approval: "allowed",
        });
      }

      const outcome = await runWebStep(page, step);
      const result: WebStepResult = {
        index,
        tool: step.tool,
        success: outcome.success,
        detail: outcome.detail,
        ...(outcome.data !== undefined ? { data: outcome.data } : {}),
      };
      steps.push(result);

      emit({
        type: "step_complete",
        index,
        tool: step.tool,
        detail: outcome.detail,
        ...(outcome.data !== undefined ? { data: outcome.data } : {}),
      });

      if (!outcome.success) {
        const message =
          `The task stopped at step ${index + 1} (${step.tool}): ` +
          outcome.detail;
        emit({ type: "error", message });
        return fail(message, message);
      }
    }

    const lines = steps
      .filter((step) => step.success)
      .map((step) => `• ${step.detail}`);

    // Surface what read_page found — headings are the actual answer for
    // "find / extract" tasks, not just a "read the page" line.
    const readData = steps
      .filter((step) => step.tool === "read_page" && step.data)
      .map((step) => step.data as Record<string, unknown>)
      .filter((data) => typeof data.summary === "string");

    const summaryParts = [plan.message, ...lines];
    if (readData.length > 0) {
      summaryParts.push("", "What I found:");
      for (const data of readData) {
        summaryParts.push(String(data.summary));
      }
    }

    const result: WebTaskResult = {
      success: true,
      message: summaryParts.join("\n"),
      steps,
    };

    emit({ type: "task_complete", result });
    return result;
  } finally {
    options.signal?.removeEventListener("abort", onAbort);
    cancelRunApprovals(runId);
    if (browser) {
      await browser.close();
    }
  }
}
