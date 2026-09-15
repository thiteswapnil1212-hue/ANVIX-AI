import { randomUUID } from "node:crypto";

import type { GeneratedProject } from "@/lib/project/project-schema";
import { LocalDockerSandboxProvider } from "@/lib/sandbox/providers/local-docker";
import { validateSandboxProject } from "@/lib/sandbox/validation";
import type {
  SandboxProject,
  SandboxProvider,
  SandboxResult,
  SandboxStatus,
} from "@/lib/sandbox/types";

export class SandboxManager {
  private readonly provider: SandboxProvider;

  private readonly sandboxes = new Map<string, SandboxProject>();

  constructor(provider?: SandboxProvider) {
    this.provider = provider ?? new LocalDockerSandboxProvider();
  }

  private normalizeStatus(status: SandboxStatus): SandboxStatus {
    return status === "created" || status === "running" || status === "stopped" || status === "failed" || status === "unavailable"
      ? status
      : "failed";
  }

  private buildSandbox(project: GeneratedProject): SandboxProject {
    return {
      id: randomUUID(),
      project,
      status: "created",
      createdAt: new Date().toISOString(),
    };
  }

  async create(project: GeneratedProject): Promise<SandboxResult & { sandbox?: SandboxProject }> {
    const validation = validateSandboxProject(project);

    if (!validation.ok) {
      return {
        success: false,
        status: "failed",
        logs: [],
        error: validation.errors.map((issue) => `${issue.field}: ${issue.message}`).join("; "),
      };
    }

    const sandbox = this.buildSandbox(validation.project);
    this.sandboxes.set(sandbox.id, sandbox);

    const result = await this.provider.create(validation.project);

    const nextStatus = this.normalizeStatus(result.status);
    const stored = this.sandboxes.get(sandbox.id);

    if (stored) {
      stored.status = nextStatus;
    }

    return {
      ...result,
      sandboxId: sandbox.id,
      status: nextStatus,
      sandbox,
    };
  }

  async getStatus(id: string): Promise<SandboxResult & { sandbox?: SandboxProject }> {
    const sandbox = this.sandboxes.get(id);

    if (!sandbox) {
      return {
        success: false,
        status: "failed",
        logs: [],
        error: "Sandbox not found.",
      };
    }

    const result = await this.provider.getStatus(id);
    const nextStatus = this.normalizeStatus(result.status);
    sandbox.status = nextStatus;

    return {
      ...result,
      sandboxId: id,
      status: nextStatus,
      sandbox,
    };
  }

  async stop(id: string): Promise<SandboxResult & { sandbox?: SandboxProject }> {
    const sandbox = this.sandboxes.get(id);

    if (!sandbox) {
      return {
        success: false,
        status: "failed",
        logs: [],
        error: "Sandbox not found.",
      };
    }

    const result = await this.provider.stop(id);
    const nextStatus = this.normalizeStatus(result.status);
    sandbox.status = nextStatus;

    return {
      ...result,
      sandboxId: id,
      status: nextStatus,
      sandbox,
    };
  }

  async destroy(id: string): Promise<SandboxResult & { sandbox?: SandboxProject }> {
    const sandbox = this.sandboxes.get(id);

    if (!sandbox) {
      return {
        success: false,
        status: "failed",
        logs: [],
        error: "Sandbox not found.",
      };
    }

    const result = await this.provider.destroy(id);
    const nextStatus = this.normalizeStatus(result.status);
    sandbox.status = nextStatus;
    this.sandboxes.delete(id);

    return {
      ...result,
      sandboxId: id,
      status: nextStatus,
      sandbox,
    };
  }
}
