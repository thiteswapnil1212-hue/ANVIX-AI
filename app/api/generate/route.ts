import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

type GenerateRequestBody = {
  prompt?: unknown;
  model?: unknown;
};

const MODEL_MAP: Record<string, string> = {
  "Gemini 2.5 Flash": "gemini-2.5-flash",
};

const DEFAULT_MODEL = "Gemini 2.5 Flash";
const MAX_PROMPT_LENGTH = 20000;

export async function POST(req: Request) {
  let body: GenerateRequestBody;

  try {
    body = (await req.json()) as GenerateRequestBody;
  } catch (err) {
    console.error("Invalid JSON in request to /api/generate:", err);
    return NextResponse.json(
      { success: false, error: "Invalid JSON" },
      { status: 400 }
    );
  }

  const prompt = body?.prompt;
  const clientModel = body?.model;

  if (!prompt || typeof prompt !== "string" || !prompt.trim()) {
    return NextResponse.json(
      { success: false, error: "Prompt is required" },
      { status: 400 }
    );
  }

  const normalizedPrompt = prompt.trim();

  if (normalizedPrompt.length > MAX_PROMPT_LENGTH) {
    return NextResponse.json(
      { success: false, error: "Prompt is too long" },
      { status: 400 }
    );
  }

  const chosenModelName =
    typeof clientModel === "string" && clientModel.trim()
      ? clientModel.trim()
      : DEFAULT_MODEL;

  const mappedModel = MODEL_MAP[chosenModelName];

  if (!mappedModel) {
    return NextResponse.json(
      { success: false, error: "Unsupported model" },
      { status: 400 }
    );
  }

  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    console.error("GEMINI_API_KEY is not set on the server");
    return NextResponse.json(
      {
        success: false,
        error: "Server configuration error: missing GEMINI_API_KEY",
      },
      { status: 500 }
    );
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);

    const model = genAI.getGenerativeModel({ model: mappedModel });

    const result = await model.generateContent(normalizedPrompt);
    const response = result.response;
    const text = response.text();

    return NextResponse.json({ success: true, response: text });
  } catch (err) {
    console.error("Gemini API error:", err);
    const errorMessage =
      err instanceof Error
        ? err.message
        : "Unknown Gemini API error";

    return NextResponse.json(
      {
        success: false,
        error:
          process.env.NODE_ENV === "development"
            ? errorMessage
            : "AI service is currently unavailable",
      },
      { status: 503 }
    );
  }
}
