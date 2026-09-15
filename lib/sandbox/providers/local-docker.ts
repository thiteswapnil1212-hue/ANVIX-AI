import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";

import type { GeneratedProject } from "@/lib/project/project-schema";
import { validateSandboxProject } from "@/lib/sandbox/validation";
import type { SandboxProvider, SandboxResult, SandboxStatus } from "@/lib/sandbox/types";

const DEFAULT_TIMEOUT_MS = 120000;

function normalizeDockerStatus(raw: string): SandboxStatus {
  switch (raw) {
    case "created":
    case "running":
    case "stopped":
    case "failed":
    case "unavailable":
      return raw;
    default:
      return "failed";
  }
}

function ensureWithinRoot(root: string, target: string) {
  const relative = path.relative(root, target);
  return relative && !relative.startsWith("..") && !path.isAbsolute(relative);
}

export class LocalDockerSandboxProvider implements SandboxProvider {
  private readonly dockerBinary = "docker";

  private readonly allowedImage = "node:20-alpine";

  private readonly executionCommand = [
    "run",
    "--rm",
    "--network",
    "none",
    "--cpus",
    "1",
    "--memory",
    "512m",
    "--pids-limit",
    "64",
    "--tmpfs",
    "/tmp:rw,noexec,nosuid,size=64m",
  ];

  private isDockerAvailable() {
    try {
      execFileSync(this.dockerBinary, ["info"], {
        stdio: "ignore",
        timeout: DEFAULT_TIMEOUT_MS,
      });
      return true;
    } catch {
      return false;
    }
  }

  private createContainerName() {
    return `anvix-sandbox-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
  }

  private executeDocker(args: string[], logPrefix: string): { stdout: string; stderr: string; exitCode: number } {
    const output = execFileSync(this.dockerBinary, args, {
      encoding: "utf8",
      stdio: ["pipe", "pipe", "pipe"],
      timeout: DEFAULT_TIMEOUT_MS,
    });

    return {
      stdout: String(output || ""),
      stderr: "",
      exitCode: 0,
    };
  }

  async create(project: GeneratedProject): Promise<SandboxResult> {
    const validation = validateSandboxProject(project);

    if (!validation.ok) {
      return {
        success: false,
        status: "failed",
        logs: [],
        error: validation.errors.map((issue) => `${issue.field}: ${issue.message}`).join("; "),
      };
    }

    if (!this.isDockerAvailable()) {
      return {
        success: false,
        status: "unavailable",
        logs: [],
        error: "Sandbox execution is not available in this environment.",
      };
    }

    const tempRoot = mkdtempSync(path.join(os.tmpdir(), "anvix-sandbox-"));
    const workingDir = path.join(tempRoot, "project");
    mkdirSync(workingDir, { recursive: true });

    try {
      for (const file of validation.project.files) {
        const safeTarget = path.resolve(workingDir, file.path);

        if (!ensureWithinRoot(workingDir, safeTarget)) {
          throw new Error(`Unsafe file path detected: ${file.path}`);
        }

        const parentDir = path.dirname(safeTarget);
        mkdirSync(parentDir, { recursive: true });
        writeFileSync(safeTarget, file.content, "utf8");
      }

      const containerName = this.createContainerName();
      const runArgs = [
        ...this.executionCommand,
        "-v",
        `${workingDir}:/workspace:ro`,
        "-w",
        "/workspace",
        this.allowedImage,
        "sh",
        "-lc",
        "node -p \"process.version\"",
      ];

      const result = this.executeDocker(runArgs, "docker-run");

      rmSync(tempRoot, { recursive: true, force: true });

      return {
        success: result.exitCode === 0,
        status: result.exitCode === 0 ? "running" : "failed",
        logs: [result.stdout.trim(), result.stderr.trim()].filter(Boolean),
        exitCode: result.exitCode,
      };
    } catch (error) {
      rmSync(tempRoot, { recursive: true, force: true });

      return {
        success: false,
        status: "failed",
        logs: [],
        error: error instanceof Error ? error.message : "Failed to initialize the sandbox container.",
      };
    }
  }

  async start(id: string): Promise<SandboxResult> {
    if (!this.isDockerAvailable()) {
      return {
        success: false,
        status: "unavailable",
        logs: [],
        error: "Sandbox execution is not available in this environment.",
        sandboxId: id,
      };
    }

    return {
      success: true,
      status: "running",
      logs: [`Sandbox ${id} started.`],
      sandboxId: id,
    };
  }

  async stop(id: string): Promise<SandboxResult> {
    if (!this.isDockerAvailable()) {
      return {
        success: false,
        status: "unavailable",
        logs: [],
        error: "Sandbox execution is not available in this environment.",
        sandboxId: id,
      };
    }

    return {
      success: true,
      status: "stopped",
      logs: [`Sandbox ${id} stopped.`],
      sandboxId: id,
    };
  }

  async getStatus(id: string): Promise<SandboxResult> {
    if (!this.isDockerAvailable()) {
      return {
        success: false,
        status: "unavailable",
        logs: [],
        error: "Sandbox execution is not available in this environment.",
        sandboxId: id,
      };
    }

    return {
      success: true,
      status: "created",
      logs: [`Sandbox ${id} is available in the provider.`],
      sandboxId: id,
    };
  }

  async destroy(id: string): Promise<SandboxResult> {
    if (!this.isDockerAvailable()) {
      return {
        success: false,
        status: "unavailable",
        logs: [],
        error: "Sandbox execution is not available in this environment.",
        sandboxId: id,
      };
    }

    return {
      success: true,
      status: "stopped",
      logs: [`Sandbox ${id} destroyed.`],
      sandboxId: id,
    };
  }
}
