import { NextResponse } from "next/server";

import { runAgentService } from "@/lib/agent/agent";
import type { GeneratedProject } from "@/lib/project/project-schema";

const VALID_FRAMEWORKS = new Set(["nextjs"]);

function jsonError(error: string, status: number) {
  return NextResponse.json(
    {
      success: false,
      error,
    },
    { status }
  );
}

function validateProjectFilePath(filePath: string) {
  if (typeof filePath !== "string") {
    throw new Error("Generated project contains an invalid file path");
  }

  const trimmed = filePath.trim();

  if (!trimmed) {
    throw new Error("Generated project contains an empty file path");
  }

  if (
    trimmed.includes("..") ||
    trimmed.startsWith("/") ||
    trimmed.startsWith("\\") ||
    /^[a-zA-Z]:[\\/]/.test(trimmed) ||
    trimmed.includes("\\")
  ) {
    throw new Error("Generated project contains a dangerous file path");
  }
}

function validateGeneratedProject(payload: unknown): GeneratedProject {
  if (!payload || typeof payload !== "object") {
    throw new Error("Project payload must be an object");
  }

  const project = payload as Record<string, unknown>;

  if (typeof project.name !== "string" || !project.name.trim()) {
    throw new Error("Project name is required");
  }

  if (project.framework !== "nextjs") {
    throw new Error("Only nextjs projects are supported");
  }

  if (!Array.isArray(project.files)) {
    throw new Error("Project files must be an array");
  }

  const files = project.files.map((file, index) => {
    if (!file || typeof file !== "object") {
      throw new Error(`File at index ${index} is invalid`);
    }

    const candidate = file as Record<string, unknown>;

    if (
      typeof candidate.path !== "string" ||
      typeof candidate.content !== "string" ||
      typeof candidate.language !== "string"
    ) {
      throw new Error(`File at index ${index} is missing required fields`);
    }

    validateProjectFilePath(candidate.path);

    return {
      path: candidate.path.trim(),
      content: candidate.content,
      language: candidate.language.trim(),
    };
  });

  return {
    name: project.name.trim(),
    framework: "nextjs",
    files,
  };
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Record<string, unknown>;

    if (!body || typeof body !== "object") {
      return jsonError("Request body is required", 400);
    }

    if (typeof body.prompt !== "string" || !body.prompt.trim()) {
      return jsonError("Prompt is required", 400);
    }

    if (!body.project || typeof body.project !== "object") {
      return jsonError("Project payload is required", 400);
    }

    const project = validateGeneratedProject(body.project);

    if (!VALID_FRAMEWORKS.has(project.framework)) {
      return jsonError("Unsupported project framework", 400);
    }

    const response = await runAgentService({
      prompt: body.prompt.trim(),
      project,
    });

    if (!response.success) {
      return NextResponse.json(
        {
          success: false,
          error: response.error || response.message || "Agent failed",
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: response.message,
      project: response.project,
      toolCalls: response.toolCalls,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Agent request failed";

    return jsonError(message, 400);
  }
}
