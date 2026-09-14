import type {
  GeneratedProject,
  ProjectFile,
} from "@/lib/project/project-schema";

import type {
  AgentToolName,
  AgentToolResult,
  DeleteFileInput,
  DeleteFileOutput,
  EditFileInput,
  ListFilesInput,
  ListFilesOutput,
  ReadFileInput,
  ReadFileOutput,
  WriteFileInput,
  WriteFileOutput,
} from "./types";

const INVALID_PATH_ERROR = "Invalid path: path traversal is not allowed";

function normalizeProjectPath(rawPath: string): string {
  if (typeof rawPath !== "string") {
    throw new Error(INVALID_PATH_ERROR);
  }

  const normalized = rawPath.trim();

  if (!normalized) {
    throw new Error("Invalid path: empty path is not allowed");
  }

  if (
    normalized.includes("..") ||
    normalized.startsWith("/") ||
    normalized.startsWith("\\") ||
    normalized.includes("\\")
  ) {
    throw new Error(INVALID_PATH_ERROR);
  }

  const cleaned = normalized.replace(/\/+/g, "/");

  if (cleaned === "." || cleaned === "..") {
    throw new Error(INVALID_PATH_ERROR);
  }

  return cleaned;
}

function getFileLanguage(path: string, fallback?: string): string {
  const known = fallback?.trim();
  if (known && known.length > 0) {
    return known;
  }

  const lowerPath = path.toLowerCase();

  if (lowerPath.endsWith(".tsx")) return "tsx";
  if (lowerPath.endsWith(".ts")) return "ts";
  if (lowerPath.endsWith(".jsx")) return "jsx";
  if (lowerPath.endsWith(".js")) return "js";
  if (lowerPath.endsWith(".css")) return "css";
  if (lowerPath.endsWith(".json")) return "json";
  if (lowerPath.endsWith(".md")) return "md";
  if (lowerPath.endsWith(".png")) return "image/png";
  if (lowerPath.endsWith(".jpg") || lowerPath.endsWith(".jpeg")) return "image/jpeg";
  if (lowerPath.endsWith(".webp")) return "image/webp";
  if (lowerPath.endsWith(".gif")) return "image/gif";
  if (lowerPath.endsWith(".ico")) return "image/x-icon";

  return "text";
}

function buildProjectFile(path: string, content: string, language?: string): ProjectFile {
  return {
    path,
    content,
    language: getFileLanguage(path, language),
  };
}

export function listFiles(
  project: GeneratedProject,
  _input: ListFilesInput
): AgentToolResult<ListFilesOutput> {
  const files = project.files
    .map((file) => file.path)
    .filter((path) => typeof path === "string" && path.trim().length > 0)
    .sort((a, b) => a.localeCompare(b));

  return {
    success: true,
    data: { files },
  };
}

export function readFile(
  project: GeneratedProject,
  input: ReadFileInput
): AgentToolResult<ReadFileOutput> {
  try {
    const path = normalizeProjectPath(input.path);
    const file = project.files.find((candidate) => candidate.path === path);

    if (!file) {
      return {
        success: false,
        error: `File not found: ${path}`,
      };
    }

    return {
      success: true,
      data: { ...file },
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Invalid path: path traversal is not allowed",
    };
  }
}

export function writeFile(
  project: GeneratedProject,
  input: WriteFileInput
): AgentToolResult<WriteFileOutput> {
  try {
    const path = normalizeProjectPath(input.path);
    const nextFile = buildProjectFile(
      path,
      input.content ?? "",
      input.language
    );

    const existingIndex = project.files.findIndex(
      (candidate) => candidate.path === path
    );

    const nextProject: GeneratedProject = {
      ...project,
      files: [...project.files],
    };

    if (existingIndex >= 0) {
      nextProject.files[existingIndex] = nextFile;
    } else {
      nextProject.files.push(nextFile);
    }

    return {
      success: true,
      data: {
        project: nextProject,
        file: nextFile,
      },
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Unable to write file",
    };
  }
}

export function editFile(
  project: GeneratedProject,
  input: EditFileInput
): AgentToolResult<WriteFileOutput> {
  return writeFile(project, input);
}

export function deleteFile(
  project: GeneratedProject,
  input: DeleteFileInput
): AgentToolResult<DeleteFileOutput> {
  try {
    const path = normalizeProjectPath(input.path);
    const fileIndex = project.files.findIndex(
      (candidate) => candidate.path === path
    );

    if (fileIndex === -1) {
      return {
        success: false,
        error: `File not found: ${path}`,
      };
    }

    const nextProject: GeneratedProject = {
      ...project,
      files: project.files.filter((candidate) => candidate.path !== path),
    };

    return {
      success: true,
      data: {
        project: nextProject,
        deletedPath: path,
      },
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Unable to delete file",
    };
  }
}

export const agentTools: Record<
  AgentToolName,
  (project: GeneratedProject, input: Record<string, unknown>) => AgentToolResult<unknown>
> = {
  list_files: (project, input) =>
    listFiles(project, input as unknown as ListFilesInput),
  read_file: (project, input) =>
    readFile(project, input as unknown as ReadFileInput),
  write_file: (project, input) =>
    writeFile(project, input as unknown as WriteFileInput),
  edit_file: (project, input) =>
    editFile(project, input as unknown as EditFileInput),
  delete_file: (project, input) =>
    deleteFile(project, input as unknown as DeleteFileInput),
};

export function runAgentTool(
  toolName: AgentToolName,
  project: GeneratedProject,
  input: Record<string, unknown>
): AgentToolResult<unknown> {
  const executor = agentTools[toolName];

  if (!executor) {
    return {
      success: false,
      error: `Unsupported tool: ${toolName}`,
    };
  }

  return executor(project, input);
}
