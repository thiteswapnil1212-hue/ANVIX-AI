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
