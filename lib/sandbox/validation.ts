import path from "node:path";

import type { GeneratedProject, ProjectFile } from "@/lib/project/project-schema";

export const MAX_SANDBOX_FILES = 200;
export const MAX_FILE_SIZE_BYTES = 1024 * 1024;
export const MAX_TOTAL_PROJECT_BYTES = 10 * 1024 * 1024;

export interface SandboxValidationIssue {
  field: string;
  message: string;
}

export type SandboxValidationResult =
  | {
      ok: true;
      project: GeneratedProject;
    }
  | {
      ok: false;
      errors: SandboxValidationIssue[];
    };

function normalizeProjectPath(rawPath: string): string {
  if (typeof rawPath !== "string") {
    throw new Error("Project file path must be a string");
  }

  const trimmed = rawPath.trim();

  if (!trimmed || trimmed.includes("\0")) {
    throw new Error("Project file path is empty or invalid");
  }

  if (
    trimmed.startsWith("/") ||
    trimmed.startsWith("\\") ||
    /^([A-Za-z]:[\\/]|\\\\)/.test(trimmed) ||
    path.posix.isAbsolute(trimmed) ||
    path.win32.isAbsolute(trimmed)
  ) {
    throw new Error("Project file path must be relative");
  }

  const normalized = trimmed.replace(/\\/g, "/");

  if (
    normalized === "." ||
    normalized === ".." ||
    normalized.startsWith("../") ||
    normalized.startsWith("./") ||
    normalized.includes("..")
  ) {
    throw new Error("Project file path contains traversal");
  }

  const posix = path.posix.normalize(normalized);

  if (
    posix === "." ||
    posix === ".." ||
    posix.startsWith("../") ||
    posix.includes("//")
  ) {
    throw new Error("Project file path is unsafe");
  }

  return posix;
}

function validateProjectFile(file: unknown, index: number): ProjectFile {
  if (!file || typeof file !== "object") {
    throw new Error(`File at index ${index} is not an object`);
  }

  const candidate = file as Record<string, unknown>;

  if (typeof candidate.path !== "string") {
    throw new Error(`File at index ${index} is missing a path`);
  }

  if (typeof candidate.content !== "string") {
    throw new Error(`File at index ${index} is missing content`);
  }

  if (typeof candidate.language !== "string") {
    throw new Error(`File at index ${index} is missing a language`);
  }

  const normalizedPath = normalizeProjectPath(candidate.path);
  const language = candidate.language.trim();
  const content = candidate.content;

  if (!language) {
    throw new Error(`File at index ${index} has an empty language`);
  }

  if (Buffer.byteLength(content, "utf8") > MAX_FILE_SIZE_BYTES) {
    throw new Error(`File ${normalizedPath} exceeds the maximum size`);
  }

  return {
    path: normalizedPath,
    content,
    language,
  };
}

export function validateSandboxProject(
  payload: unknown
): SandboxValidationResult {
  const errors: SandboxValidationIssue[] = [];

  if (!payload || typeof payload !== "object") {
    return {
      ok: false,
      errors: [{ field: "project", message: "Project payload is required." }],
    };
  }

  const project = payload as Record<string, unknown>;

  if (typeof project.name !== "string" || !project.name.trim()) {
    errors.push({ field: "name", message: "Project name is required." });
  }

  if (project.framework !== "nextjs") {
    errors.push({ field: "framework", message: "Only Next.js projects are supported." });
  }

  if (!Array.isArray(project.files)) {
    errors.push({ field: "files", message: "Project files must be an array." });
    return { ok: false, errors };
  }

  if (project.files.length === 0) {
    errors.push({ field: "files", message: "Project must include at least one file." });
  }

  if (project.files.length > MAX_SANDBOX_FILES) {
    errors.push({
      field: "files",
      message: `Project exceeds the maximum of ${MAX_SANDBOX_FILES} files.`,
    });
  }

  const seen = new Set<string>();
  let totalBytes = 0;
  const files: ProjectFile[] = [];

  for (let index = 0; index < project.files.length; index += 1) {
    const file = project.files[index];

    try {
      const validated = validateProjectFile(file, index);

      if (seen.has(validated.path)) {
        throw new Error(`Duplicate file path detected: ${validated.path}`);
      }

      seen.add(validated.path);
      files.push(validated);
      totalBytes += Buffer.byteLength(validated.content, "utf8");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Invalid project file";
      errors.push({ field: `files[${index}]`, message });
    }
  }

  if (totalBytes > MAX_TOTAL_PROJECT_BYTES) {
    errors.push({
      field: "files",
      message: `Project exceeds the maximum total size of ${MAX_TOTAL_PROJECT_BYTES} bytes.`,
    });
  }

  if (errors.length > 0) {
    return { ok: false, errors };
  }

  return {
    ok: true,
    project: {
      name: String(project.name).trim(),
      framework: "nextjs",
      files,
    },
  };
}
