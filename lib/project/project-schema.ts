import path from "node:path";

export interface ProjectFile {
  path: string;
  content: string;
  language: string;
}

export interface GeneratedProject {
  name: string;
  framework: "nextjs";
  files: ProjectFile[];
}

export interface BuildProjectResponse {
  success: true;
  project: GeneratedProject;
}

export interface BuildProjectErrorResponse {
  success: false;
  error: string;
}

export type BuildApiResponse =
  | BuildProjectResponse
  | BuildProjectErrorResponse;

const REQUIRED_PROJECT_FILES = [
  "package.json",
  "app/layout.tsx",
  "app/page.tsx",
  "app/globals.css",
] as const;

function validateAndNormalizePath(filePath: string) {
  const trimmedPath = filePath.trim();

  if (!trimmedPath || trimmedPath.includes("\0")) {
    throw new Error("Generated project contains an invalid file path");
  }

  if (
    /^[a-zA-Z]:[\\/]/.test(trimmedPath) ||
    trimmedPath.startsWith("\\\\") ||
    path.win32.isAbsolute(trimmedPath) ||
    path.posix.isAbsolute(trimmedPath)
  ) {
    throw new Error("Generated project contains an absolute file path");
  }

  const slashPath = trimmedPath.replace(/\\/g, "/");

  if (slashPath.includes(":")) {
    throw new Error("Generated project contains an invalid file path");
  }

  const rawPathParts = slashPath.split("/");

  if (
    rawPathParts.some(
      (part) => part === "." || part === ".." || part === ""
    )
  ) {
    throw new Error("Generated project contains a dangerous file path");
  }

  const normalizedPath = path.posix.normalize(slashPath);
  const pathParts = normalizedPath.split("/");

  if (
    normalizedPath === "." ||
    normalizedPath.startsWith("../") ||
    normalizedPath === ".." ||
    normalizedPath.endsWith("/") ||
    pathParts.some((part) => part === ".." || part === "")
  ) {
    throw new Error("Generated project contains a dangerous file path");
  }

  return normalizedPath;
}

function validateProjectFile(file: unknown): ProjectFile {
  if (!file || typeof file !== "object") {
    throw new Error("Generated project contains an invalid file entry");
  }

  const candidate = file as Record<string, unknown>;

  if (
    typeof candidate.path !== "string" ||
    typeof candidate.content !== "string" ||
    typeof candidate.language !== "string"
  ) {
    throw new Error(
      "Generated project files must include path, content and language"
    );
  }

  const normalizedPath = validateAndNormalizePath(candidate.path);
  const language = candidate.language.trim();
  const content = candidate.content;

  if (!language) {
    throw new Error("Generated project contains an empty file language");
  }

  if (!content.trim()) {
    throw new Error(
      `Generated project file contains empty content: ${normalizedPath}`
    );
  }

  return {
    path: normalizedPath,
    content,
    language,
  };
}

export function validateGeneratedProject(payload: unknown): GeneratedProject {
  if (!payload || typeof payload !== "object") {
    throw new Error("Gemini returned malformed project data");
  }

  const candidate = payload as Record<string, unknown>;
  const project =
    candidate.project && typeof candidate.project === "object"
      ? (candidate.project as Record<string, unknown>)
      : candidate;

  if (!project || typeof project !== "object") {
    throw new Error("Gemini response is missing project data");
  }

  const projectCandidate = project as Record<string, unknown>;

  if (typeof projectCandidate.name !== "string") {
    throw new Error("Generated project is missing a valid name");
  }

  const projectName = projectCandidate.name.trim();

  if (!projectName) {
    throw new Error("Generated project name cannot be empty");
  }

  if (projectCandidate.framework !== "nextjs") {
    throw new Error("Generated project framework must be nextjs");
  }

  if (!Array.isArray(projectCandidate.files)) {
    throw new Error("Generated project files must be an array");
  }

  if (projectCandidate.files.length === 0) {
    throw new Error("Generated project must include at least one file");
  }

  const seenPaths = new Set<string>();
  const files = projectCandidate.files.map((file) => {
    const validatedFile = validateProjectFile(file);

    if (seenPaths.has(validatedFile.path)) {
      throw new Error(
        `Generated project contains a duplicate file: ${validatedFile.path}`
      );
    }

    seenPaths.add(validatedFile.path);
    return validatedFile;
  });

  const missingRequiredFile = REQUIRED_PROJECT_FILES.find(
    (filePath) => !seenPaths.has(filePath)
  );

  if (missingRequiredFile) {
    throw new Error(
      `Generated project is missing required file: ${missingRequiredFile}`
    );
  }

  return {
    name: projectName,
    framework: "nextjs",
    files,
  };
}

export function isGeneratedProject(
  value: unknown
): value is GeneratedProject {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Record<string, unknown>;

  if (typeof candidate.name !== "string") {
    return false;
  }

  if (candidate.framework !== "nextjs") {
    return false;
  }

  if (!Array.isArray(candidate.files)) {
    return false;
  }

  return candidate.files.every((file) => {
    if (!file || typeof file !== "object") {
      return false;
    }

    const projectFile = file as Record<string, unknown>;

    return (
      typeof projectFile.path === "string" &&
      typeof projectFile.content === "string" &&
      typeof projectFile.language === "string"
    );
  });
}

export function normalizeGeneratedProject(
  value: unknown
): GeneratedProject | null {
  if (!isGeneratedProject(value)) {
    return null;
  }

  const normalizedFiles = value.files
    .map((file) => ({
      path: file.path.trim(),
      content: file.content,
      language: file.language.trim(),
    }))
    .filter((file) => file.path.length > 0);

  if (normalizedFiles.length === 0) {
    return null;
  }

  return {
    name: value.name.trim(),
    framework: "nextjs",
    files: normalizedFiles,
  };
}
