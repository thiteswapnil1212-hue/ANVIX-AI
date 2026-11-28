import type { Tool } from "@google/generative-ai";

/**
 * Built-in Python code execution for chat (agentic-loop lane,
 * 2026-11-28).
 *
 * VERIFIED in the installed `@google/generative-ai` 0.24.1 types
 * (not a shim): the SDK's `Tool` union is
 * `FunctionDeclarationsTool | CodeExecutionTool |
 * GoogleSearchRetrievalTool`, and `CodeExecutionTool` is
 * `{ codeExecution: {} }` (`dist/types/requests.d.ts:212-223`).
 * Response parts carry `executableCode: { language, code }` and
 * `codeExecutionResult: { outcome, output }`
 * (`dist/types/content.d.ts`). The API executes the code server-side
 * inside the GenerateContent call (30 s timeout, Python only, no file
 * I/O) and returns the result as parts — no client-side execution
 * loop is needed, unlike function calling.
 *
 * Free-tier note: code execution has no additional charge beyond the
 * input/output tokens of the call (per Google's docs and the
 * next-level capabilities report §2). It is also the only tool in the
 * loop that does not depend on the grounding/search quota — a
 * grounded attempt can 429 while a code step still runs.
 *
 * Safety: the code runs on Google's sandbox, never on this server,
 * and the model only ever executes code it generated itself for the
 * current question. The loop caps what comes back (see
 * `formatCodeExecutionFinding`) and a non-OK outcome fails the loop
 * step, which falls back to the plain Deep answer.
 */

/** The code-execution tool, typed — no cast shim needed. */
export function codeExecutionTool(): Tool[] {
  return [{ codeExecution: {} }];
}

export type CodeExecutionExtract = {
  /** The code the model asked to run ("" when none was emitted). */
  code: string;
  /** Language the model declared ("" when none). */
  language: string;
  /** stdout on success, stderr/description otherwise ("" when none). */
  output: string;
  /**
   * Raw outcome string from the API (`OUTCOME_OK`,
   * `OUTCOME_FAILED`, `OUTCOME_DEADLINE_EXCEEDED`, ...), or null
   * when no execution result part arrived.
   */
  outcome: string | null;
};

type RawPart = {
  text?: unknown;
  executableCode?: unknown;
  codeExecutionResult?: unknown;
};

function readParts(response: unknown): RawPart[] {
  if (!response || typeof response !== "object") return [];
  const candidates = (response as Record<string, unknown>).candidates;
  if (!Array.isArray(candidates) || candidates.length === 0) return [];
  const first = candidates[0];
  if (!first || typeof first !== "object") return [];
  const content = (first as Record<string, unknown>).content;
  if (!content || typeof content !== "object") return [];
  const parts = (content as Record<string, unknown>).parts;
  if (!Array.isArray(parts)) return [];
  return parts as RawPart[];
}

function asString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

/**
 * Pull the executed code + its result out of one non-streaming
 * GenerateContent response. Unknown/malformed responses extract to
 * empty strings — never throw on provider data.
 */
export function extractCodeExecution(
  response: unknown
): CodeExecutionExtract {
  let code = "";
  let language = "";
  let output = "";
  let outcome: string | null = null;

  for (const part of readParts(response)) {
    if (part.executableCode && typeof part.executableCode === "object") {
      const exec = part.executableCode as Record<string, unknown>;
      code = asString(exec.code);
      language = asString(exec.language);
    }
    if (
      part.codeExecutionResult &&
      typeof part.codeExecutionResult === "object"
    ) {
      const result = part.codeExecutionResult as Record<string, unknown>;
      output = asString(result.output);
      outcome = asString(result.outcome) || null;
    }
  }

  return { code, language, output, outcome };
}

/** True only when the API reports a successful execution. */
export function isCodeExecutionOk(extract: CodeExecutionExtract): boolean {
  return extract.outcome === "OUTCOME_OK";
}

/** Max output chars kept in a finding — a runaway print must not flood the brief. */
export const CODE_EXECUTION_OUTPUT_CAP = 1500;

/**
 * One short finding block for the loop brief: what was run and what
 * it printed. The code itself is not repeated (the brief is context
 * for the final answer, not a transcript) — only the outcome and the
 * capped output.
 */
export function formatCodeExecutionFinding(
  extract: CodeExecutionExtract
): string {
  const status = extract.outcome ?? "no result";
  const output = extract.output.slice(0, CODE_EXECUTION_OUTPUT_CAP);
  const truncated =
    extract.output.length > CODE_EXECUTION_OUTPUT_CAP ? "\n…[output truncated]" : "";
  return (
    `[Executed Python — outcome: ${status}]\n` +
    (output ? "```\n" + output + "\n```" + truncated : "[no output]")
  );
}
