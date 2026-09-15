import type { GeneratedProject } from "@/lib/project/project-schema";

export type SandboxStatus =
  | "created"
  | "running"
  | "stopped"
  | "failed"
  | "unavailable";

export interface SandboxProject {
  id: string;
  project: GeneratedProject;
  status: SandboxStatus;
  createdAt: string;
}

export interface SandboxResult {
  success: boolean;
  status: SandboxStatus;
  logs: string[];
  error?: string;
  exitCode?: number;
  sandboxId?: string;
}

export interface SandboxProvider {
  create(project: GeneratedProject): Promise<SandboxResult>;
  start(id: string): Promise<SandboxResult>;
  stop(id: string): Promise<SandboxResult>;
  getStatus(id: string): Promise<SandboxResult>;
  destroy(id: string): Promise<SandboxResult>;
}
