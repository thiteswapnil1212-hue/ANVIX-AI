import type { GeneratedProject, ProjectFile } from "@/lib/project/project-schema";

export type AgentToolName =
  | "list_files"
  | "read_file"
  | "write_file"
  | "edit_file"
  | "delete_file";

export interface AgentToolCall {
  tool: AgentToolName;
  input: Record<string, unknown>;
}

export interface AgentToolResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface ListFilesInput {}

export interface ListFilesOutput {
  files: string[];
}

export interface ReadFileInput {
  path: string;
}

export interface ReadFileOutput extends ProjectFile {}

export interface WriteFileInput {
  path: string;
  content: string;
  language?: string;
}

export interface WriteFileOutput {
  project: GeneratedProject;
  file: ProjectFile;
}

export interface EditFileInput {
  path: string;
  content: string;
  language?: string;
}

export interface DeleteFileInput {
  path: string;
}

export interface DeleteFileOutput {
  project: GeneratedProject;
  deletedPath: string;
}
