import { enforceRateLimit } from "@/lib/rate-limit";

import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";

import { generateProjectTextWithFallback } from "@/lib/gemini/fallback";

type BuildRequestBody = {
  prompt?: unknown;
};

const PROJECT_RESPONSE_SCHEMA = {
  type: "OBJECT",
  properties: {
    project: {
      type: "OBJECT",
      properties: {
        name: { type: "STRING" },
        framework: { type: "STRING" },
        files: {
          type: "ARRAY",
          items: {
            type: "OBJECT",
            properties: {
              path: { type: "STRING" },
              content: { type: "STRING" },
              language: { type: "STRING" },
            },
            required: ["path", "content", "language"],
          },
        },
      },
      required: ["name", "framework", "files"],
    },
  },
  required: ["project"],
} as const;

const GENERATION_MODELS = [
  "gemini-2.5-flash",
  "gemini-2.5-flash-lite",
  "gemini-2.0-flash",
] as const;
const MAX_PROMPT_LENGTH = 20000;
const SYSTEM_INSTRUCTION = `You are the project generation engine for ANVIX AI.

Your responsibility is to generate a complete, coherent, runnable Next.js application from the user's requirements.

You must think about the application as a real software project.

Generate all required files and ensure imports, file paths, components, styling, and package dependencies are consistent.

The output will be consumed programmatically by ANVIX.

Return ONLY valid JSON.

Never return:
- Markdown
- code fences
- explanations outside JSON
- comments outside JSON

The JSON must follow exactly:

{
  "project": {
    "name": "string",
    "framework": "nextjs",
    "files": [
      {
        "path": "string",
        "content": "string",
        "language": "string"
      }
    ]
  }
}

Important rules:
1. Generate a complete runnable Next.js application.
2. Keep the project reasonably small and coherent.
3. Every imported local file must exist in the output.
4. Do not reference files that were not generated.
5. If a dependency is required, declare it in package.json.
6. Prefer existing/common dependencies.
7. Do not invent unavailable packages.
8. Include the necessary package.json.
9. Include the required app files.
10. Keep TypeScript valid.
11. Keep JSX valid.
12. Keep CSS valid.
13. Avoid unnecessary complexity.
14. Do not use placeholder text such as "implement this later".
15. Do not omit important files required to run the application.
16. The final project should be suitable for npm install followed by npm run build.`;

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
    console.info("[ANVIX BUILD] Successful generation", {
      projectName: project.name,
      fileCount: project.files.length,
      models: GENERATION_MODELS.join(", "),
    });

    return NextResponse.json({
      success: true,
      project,
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
