import { GoogleGenerativeAI } from "@google/generative-ai";

import type { GeneratedProject, ProjectFile } from "@/lib/project/project-schema";
import { parseGeminiJson } from "./fallback";
import type { ValidationIssue } from "@/lib/project/validate";

/**
 * One-shot auto-fix pass for a generated project.
 *
 * When deterministic validation finds errors, the model gets the issue
 * list plus the project files and returns ONLY the files it changed or
 * added. The caller merges those by path and re-validates; nothing is
 * ever applied blindly, and a failed fix pass simply keeps the original
 * project (the caller reports the remaining issues instead of failing).
 *
 * Deliberately capped: one pass, one model, truncated file contents.
 * A second pass would double the cost for diminishing returns — if the
 * project is still broken after one fix, a human (or the workspace
 * agent) should look at it.
 */

const FIX_MODEL = "gemini-2.5-flash";
const FIX_TIMEOUT_MS = 60000;
const MAX_FILE_CHARS = 6000;
const MAX_TOTAL_CHARS = 30000;

export interface AutoFixSummary {
  /** Issues found before the fix pass. */
  issues: string[];
  /** How many files the fix pass returned. */
  fixedFileCount: number;
  /** Issues still present after the fix pass. */
  remainingIssues: string[];
  /** False when the fix pass failed or returned nothing usable. */
  applied: boolean;
}

function languageForPath(path: string): string {
  if (path.endsWith(".tsx")) return "tsx";
  if (path.endsWith(".ts")) return "typescript";
  if (path.endsWith(".jsx")) return "jsx";
  if (path.endsWith(".js")) return "javascript";
  if (path.endsWith(".json")) return "json";
  if (path.endsWith(".css")) return "css";
  if (path.endsWith(".md")) return "markdown";
  return "plaintext";
}

function isFixFile(value: unknown): value is {
  path: string;
  content: string;
} {
  if (!value || typeof value !== "object") return false;
  const file = value as Record<string, unknown>;
  return (
    typeof file.path === "string" &&
    file.path.length > 0 &&
    typeof file.content === "string"
  );
}

export interface AutoFixResult {
  files: ProjectFile[];
  /** Why the fix pass produced nothing usable, when it failed. */
  error?: string;
}

export async function autoFixProject(
  apiKey: string,
  project: GeneratedProject,
  issues: ValidationIssue[]
): Promise<AutoFixResult | null> {
  const errorIssues = issues.filter((issue) => issue.severity === "error");
  if (errorIssues.length === 0) return null;

  let budget = MAX_TOTAL_CHARS;
  const renderedFiles: string[] = [];

  for (const file of project.files) {
    if (budget <= 0) break;
    const content =
      file.content.length > MAX_FILE_CHARS
        ? `${file.content.slice(0, MAX_FILE_CHARS)}\n... [truncated]`
        : file.content;
    const block = `### ${file.path}\n\`\`\`\n${content}\n\`\`\``;
    if (block.length > budget && renderedFiles.length > 0) break;
    renderedFiles.push(block);
    budget -= block.length;
  }

  const prompt = `You are fixing a generated Next.js project. Fix ONLY the problems listed below. Return a JSON object with a single "files" array containing ONLY the files you changed or added (full corrected content for each). Do not return unchanged files. Do not add explanations outside the JSON.

Problems:
${errorIssues.map((issue) => `- ${issue.message}`).join("\n")}

Project name: ${project.name}
Files:
${renderedFiles.join("\n\n")}`;

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: FIX_MODEL,
      generationConfig: {
        responseMimeType: "application/json",
        temperature: 0.2,
        maxOutputTokens: 12000,
      },
    });

    const controller = new AbortController();
    const timeoutId = setTimeout(
      () => controller.abort(),
      FIX_TIMEOUT_MS
    );

    try {
      const result = await model.generateContent(prompt, {
        signal: controller.signal,
      } as never);
      const parsed = parseGeminiJson(
        result.response.text()
      ) as unknown;

      if (!parsed || typeof parsed !== "object") {
        return { files: [], error: "Fix pass did not return a JSON object." };
      }
      const files = (parsed as Record<string, unknown>).files;
      if (!Array.isArray(files) || files.length === 0) {
        return { files: [], error: "Fix pass returned no files." };
      }

      const fixedFiles: ProjectFile[] = [];
      for (const file of files) {
        if (!isFixFile(file)) {
          return {
            files: [],
            error: "Fix pass returned a file without a path or content.",
          };
        }
        fixedFiles.push({
          path: file.path,
          content: file.content,
          language: languageForPath(file.path),
        });
      }
      return { files: fixedFiles };
    } finally {
      clearTimeout(timeoutId);
    }
  } catch (error) {
    const reason = error instanceof Error ? error.message : "unknown";
    console.warn("[ANVIX AUTOFIX] Fix pass failed, keeping original project.", {
      reason,
    });
    return { files: [], error: reason };
  }
}

/** Merge fix-pass files into a project by path (replace or append). */
export function applyFixFiles(
  project: GeneratedProject,
  fixedFiles: ProjectFile[]
): GeneratedProject {
  const byPath = new Map<string, ProjectFile>();
  for (const file of project.files) {
    byPath.set(file.path, file);
  }
  for (const file of fixedFiles) {
    byPath.set(file.path, file);
  }
  return { ...project, files: [...byPath.values()] };
}
