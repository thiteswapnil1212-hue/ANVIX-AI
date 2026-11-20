// ANVIX web agent — shared types.
//
// The web agent turns one plain-language task ("message X on LinkedIn",
// "find the cheapest flight to Goa") into a short plan of browser steps
// and runs them in a real Chromium window. It never runs shell commands
// and never touches the real filesystem — the only tools are the browser
// steps listed in WebToolName.

export type WebToolName =
  | "navigate"
  | "read_page"
  | "click"
  | "type"
  | "wait"
  | "screenshot"
  | "report";

export interface WebStep {
  tool: WebToolName;
  /** Per-tool input — validated by validateWebPlan before anything runs. */
  input: Record<string, unknown>;
  /**
   * True when this step must pause for the user's approval before it
   * runs (e.g. clicking Send, submitting a form). The runner also
   * forces approval for risky clicks even when the planner forgets.
   */
  requiresApproval?: boolean;
}

export interface WebPlan {
  /** One-line summary of what the plan will do, shown to the user. */
  message: string;
  /** 1–10 steps, in order. */
  steps: WebStep[];
}

export interface WebStepResult {
  index: number;
  tool: WebToolName;
  success: boolean;
  /** Human-readable outcome, e.g. "Opened https://example.com". */
  detail: string;
  /** Structured data for read_page (headings, links) — shown in the summary. */
  data?: unknown;
  /** Set when the step was skipped because approval was denied/timed out. */
  approval?: "allowed" | "denied" | "timeout";
}

export interface WebTaskResult {
  success: boolean;
  /** Final summary for the chat — steps + any failure, in plain words. */
  message: string;
  steps: WebStepResult[];
  error?: string;
}

export interface ApprovalRequest {
  id: string;
  runId: string;
  stepIndex: number;
  title: string;
  description: string;
}

export type WebTaskEvent =
  | { type: "web_task_start"; runId: string }
  | { type: "planning" }
  | { type: "step_start"; index: number; tool: WebToolName; detail: string }
  | {
      type: "step_complete";
      index: number;
      tool: WebToolName;
      detail: string;
      data?: unknown;
    }
  | { type: "approval_needed"; approval: ApprovalRequest }
  | { type: "task_complete"; result: WebTaskResult }
  | { type: "error"; message: string };
