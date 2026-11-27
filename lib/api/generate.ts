import { getAuthHeaders } from "./auth-headers.ts";
import { recordSessionUsage } from "../usage/session-usage.ts";

export interface GenerationResult {
  summary: string;
  response: string;
  model: string;
  /**
   * Structured blueprint fields. Only present when the source actually
   * produced them — the home blueprint endpoint returns prose, so these
   * stay absent instead of being invented. The result card hides the
   * matching sections when they are missing.
   */
  confidence?: string;
  stack?: string[];
  estimatedTime?: string;
  modules?: string[];
}

export interface GenerateProjectResponse {
  success: boolean;
  result: GenerationResult;
}

const SUMMARY_MAX_LENGTH = 140;

/**
 * Build the blueprint result the home page renders from the model's
 * plain-text reply. The summary is the reply's own first line (never
 * invented); the structured fields stay absent because a prose reply
 * has no confidence score, stack list, estimate, or module list.
 */
export function buildBlueprintResult(
  text: string,
  modelName: string
): GenerationResult {
  const firstLine =
    text
      .split("\n")
      .map((line) => line.trim())
      .find((line) => line.length > 0) ?? "";

  const summary =
    firstLine.length > SUMMARY_MAX_LENGTH
      ? `${firstLine.slice(0, SUMMARY_MAX_LENGTH).trimEnd()}…`
      : firstLine;

  return {
    summary: summary || "Product blueprint",
    response: text,
    model: modelName,
  };
}

export async function generateProject(
  prompt: string
): Promise<GenerateProjectResponse> {
  const response = await fetch("/api/generate", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(await getAuthHeaders()),
    },
    body: JSON.stringify({ prompt }),
  });

  if (!response.ok) {
    // Surface the server's own message (including the rate-limit
    // retry delay) instead of a generic failure — a 429 used to read
    // exactly like a broken server.
    let message = "Failed to generate project";
    let retryAfterSeconds: number | undefined;

    try {
      const data = (await response.json()) as {
        error?: unknown;
        retryAfterSeconds?: unknown;
      };
      if (typeof data.error === "string" && data.error.trim()) {
        message = data.error;
      }
      if (typeof data.retryAfterSeconds === "number") {
        retryAfterSeconds = data.retryAfterSeconds;
      }
    } catch {
      // Non-JSON error body — keep the generic message.
    }

    if (response.status === 429 && retryAfterSeconds !== undefined) {
      throw new Error(
        `${message} Try again in ${retryAfterSeconds} second${retryAfterSeconds === 1 ? "" : "s"}.`
      );
    }

    throw new Error(message);
  }

  // Session usage: the server meter reads a per-instance in-memory
  // limiter, so it usually shows 0 for guests — this browser's own
  // count is what the Settings meter merges in (display only).
  recordSessionUsage("generate");
  return response.json();
}
