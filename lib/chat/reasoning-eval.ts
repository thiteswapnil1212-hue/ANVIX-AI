/**
 * Reasoning eval scoring (reasoning-deep lane, 2026-11-27).
 *
 * Pure functions only — no network, no secrets. The live harness
 * (`scripts/reasoning-eval.ts`) calls the public /api/chat endpoint
 * as a guest and scores each reply with `scoreAnswer`.
 */

export type EvalMatch =
  | { kind: "number"; value: number; tolerance?: number }
  | { kind: "contains"; phrases: string[] };

export type EvalQuestion = {
  id: string;
  prompt: string;
  /** Human-readable expected answer, shown in reports. */
  expected: string;
  match: EvalMatch;
};

export type EvalScore = {
  pass: boolean;
  detail: string;
};

/** Markers the chat route emits when no answer was produced at all. */
const ENDPOINT_ERROR_MARKERS = [
  "[An error occurred while generating the response.]",
  "Failed to generate response. Please try again.",
  "[Response interrupted. Please try again.]",
];

/**
 * The model's final answer number: the LAST number in the reply.
 * Reasoning replies show working first ("150 km / 2 h") and the
 * answer last ("= 75 km/h"), so the last number is the verdict —
 * the first number would score the working, not the answer.
 */
export function extractFinalNumber(reply: string): number | null {
  const matches = reply.match(/-?\d[\d,]*(?:\.\d+)?/g);
  if (!matches || matches.length === 0) return null;
  const last = matches[matches.length - 1].replace(/,/g, "");
  const value = Number(last);
  return Number.isFinite(value) ? value : null;
}

function normalizeText(text: string): string {
  return text.toLowerCase().replace(/\s+/g, " ").trim();
}

export function scoreAnswer(
  question: EvalQuestion,
  reply: string
): EvalScore {
  if (!reply || !reply.trim()) {
    return { pass: false, detail: "empty reply" };
  }

  for (const marker of ENDPOINT_ERROR_MARKERS) {
    if (reply.includes(marker)) {
      return { pass: false, detail: `endpoint error, no answer (${marker})` };
    }
  }

  if (question.match.kind === "number") {
    const got = extractFinalNumber(reply);
    if (got === null) {
      return { pass: false, detail: "no number in reply" };
    }
    const tolerance = question.match.tolerance ?? 0.01;
    const pass = Math.abs(got - question.match.value) <= tolerance;
    return {
      pass,
      detail: `expected ${question.match.value}, final number ${got}`,
    };
  }

  const normalized = normalizeText(reply);
  const missing = question.match.phrases.filter(
    (phrase) => !normalized.includes(normalizeText(phrase))
  );
  if (missing.length > 0) {
    return {
      pass: false,
      detail: `missing phrase(s): ${missing.join("; ")}`,
    };
  }
  return { pass: true, detail: "all expected phrases present" };
}
