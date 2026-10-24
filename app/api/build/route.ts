import { enforceRateLimit } from "@/lib/rate-limit";

import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";

import { generateProjectTextWithFallback } from "@/lib/gemini/fallback";
import { applyFixFiles, autoFixProject } from "@/lib/gemini/autofix";
import { validateGeneratedProjectFiles } from "@/lib/project/validate";
import {
  GENERATION_MODELS,
  MAX_PROMPT_LENGTH,
  PROJECT_RESPONSE_SCHEMA,
  SYSTEM_INSTRUCTION,
} from "@/lib/gemini/build-prompt";


type BuildRequestBody = {
  prompt?: unknown;
};

function jsonError(error: string, status: number) {
  return NextResponse.json(
    {
      success: false,
      error,
    },
    { status }
  );
}

export async function POST(req: Request) {
  const limited = enforceRateLimit(req, "build", 6, 60_000);
  if (limited) return limited;

  let body: BuildRequestBody;

  try {
    body = (await req.json()) as BuildRequestBody;
  } catch (error) {
    console.error("Invalid JSON in request to /api/build:", error);
    return jsonError("Invalid JSON", 400);
  }

  const prompt = body?.prompt;

  if (typeof prompt !== "string") {
    return jsonError("Prompt is required", 400);
  }

  const normalizedPrompt = prompt.trim();

  if (!normalizedPrompt) {
    return jsonError("Prompt cannot be empty", 400);
  }

  if (normalizedPrompt.length < 3) {
    return jsonError("Prompt is too short", 400);
  }

  if (normalizedPrompt.length > MAX_PROMPT_LENGTH) {
    return jsonError("Prompt is too long", 400);
  }

  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    console.error("GEMINI_API_KEY is not set on the server");
    return jsonError("Server configuration error", 500);
  }

  try {
    console.info("[ANVIX BUILD] Starting generation", {
      models: GENERATION_MODELS.join(", "),
      promptLength: normalizedPrompt.length,
    });

    const project = await generateProjectTextWithFallback(apiKey, normalizedPrompt, (key, modelName) => {
      const genAI = new GoogleGenerativeAI(key);
      return genAI.getGenerativeModel({
        model: modelName,
        systemInstruction: SYSTEM_INSTRUCTION,
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema: PROJECT_RESPONSE_SCHEMA as never,
          temperature: 0.2,
          maxOutputTokens: 12000,
        },
      });
    });
    // Auto-fix: deterministic validation first, one model fix pass
    // only when real errors exist. A failed fix pass keeps the original
    // project — the summary below says what is still broken.
    let finalProject = project;
    const issues = validateGeneratedProjectFiles(project);
    const errorMessages = issues
      .filter((issue) => issue.severity === "error")
      .map((issue) => issue.message);

    let autoFix = {
      issues: errorMessages,
      fixedFileCount: 0,
      remainingIssues: errorMessages,
      applied: false,
    };

    if (errorMessages.length > 0) {
      const fix = await autoFixProject(apiKey, project, issues);
      if (fix) {
        finalProject = applyFixFiles(project, fix.files);
        autoFix = {
          issues: errorMessages,
          fixedFileCount: fix.files.length,
          remainingIssues: validateGeneratedProjectFiles(finalProject)
            .filter((issue) => issue.severity === "error")
            .map((issue) => issue.message),
          applied: true,
        };
      }
    }

    console.info("[ANVIX BUILD] Successful generation", {
      projectName: finalProject.name,
      fileCount: finalProject.files.length,
      models: GENERATION_MODELS.join(", "),
      autoFixApplied: autoFix.applied,
      autoFixRemaining: autoFix.remainingIssues.length,
    });

    return NextResponse.json({
      success: true,
      project: finalProject,
      autoFix,
    });
  } catch (error) {
    console.error("[ANVIX BUILD] Project generation failed", {
      models: GENERATION_MODELS.join(", "),
      promptLength: normalizedPrompt.length,
      error: error instanceof Error ? error.message : "Unknown error",
    });

    const message =
      error instanceof Error
        ? error.message
        : "Failed to generate project";

    const status =
      message === "Gemini request timed out"
        ? 504
        : message.startsWith("Gemini returned") ||
            message.startsWith("Generated project") ||
            message.startsWith("Gemini response")
          ? 502
          : 503;

    return jsonError(
      status === 503
        ? "AI service is currently unavailable"
        : message,
      status
    );
  }
}
