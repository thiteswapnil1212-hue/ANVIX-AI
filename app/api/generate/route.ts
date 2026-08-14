import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

const MODEL_MAP: Record<string, string> = {
  "Gemini 1.5 Flash": "gemini-1.5-flash",
};

const DEFAULT_MODEL = "Gemini 1.5 Flash";
const MAX_PROMPT_LENGTH = 20000;

export async function POST(req: Request) {
  let body: any;

  try {
    body = await req.json();
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
    const genAI = new GoogleGenerativeAI(apiKey as string);

    const model = genAI.getGenerativeModel({ model: mappedModel });

    // Use the simple generateContent flow. The library may return different
    // shapes; follow the common pattern: result.response.text()
    const result = await model.generateContent(normalizedPrompt as string);

    const response = result?.response;

    if (!response || typeof response.text !== "function") {
      console.error("Unexpected response shape from Gemini API", result);
      return NextResponse.json(
        { success: false, error: "AI service returned an unexpected response" },
        { status: 502 }
      );
    }

    const text = await response.text();

    return NextResponse.json({ success: true, response: text });
  } catch (err) {
    console.error("Gemini API error:", err);
    return NextResponse.json(
      { success: false, error: "AI service is currently unavailable" },
      { status: 503 }
    );
  }
}