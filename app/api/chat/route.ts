import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import {
  CHAT_API_MODEL_IDS,
  DEFAULT_CHAT_MODEL_ID,
  getChatModel,
} from "@/lib/chat-models";

type ChatRequestBody = {
  prompt?: unknown;
  model?: unknown;
};

const MAX_PROVIDER_RETRIES = 2;
const RETRY_DELAYS_MS = [250, 750];

function getProviderStatus(error: unknown) {
  if (
    typeof error === "object" &&
    error !== null &&
    "status" in error &&
    typeof error.status === "number"
  ) {
    return error.status;
  }

  return undefined;
}

function isRetryableProviderError(error: unknown) {
  const status = getProviderStatus(error);

  return status === 429 || status === 503;
}

function isTemporaryProviderError(error: unknown) {
  const status = getProviderStatus(error);

  return status === 429 || status === 503;
}

async function generateContentWithRetry(
  model: ReturnType<GoogleGenerativeAI["getGenerativeModel"]>,
  prompt: string
) {
  for (let attempt = 0; attempt <= MAX_PROVIDER_RETRIES; attempt += 1) {
    try {
      return await model.generateContent(prompt);
    } catch (error) {
      if (
        !isRetryableProviderError(error) ||
        attempt === MAX_PROVIDER_RETRIES
      ) {
        throw error;
      }

      await new Promise((resolve) =>
        setTimeout(resolve, RETRY_DELAYS_MS[attempt])
      );
    }
  }

  throw new Error("Gemini provider request failed");
}

export async function POST(req: Request) {
  let body: ChatRequestBody;

  try {
    body = (await req.json()) as ChatRequestBody;
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON" },
      { status: 400 }
    );
  }

  try {
    const prompt = body.prompt;
    const requestedModel =
      typeof body.model === "string" && body.model.trim()
        ? body.model.trim()
        : DEFAULT_CHAT_MODEL_ID;

    if (!prompt || typeof prompt !== "string" || !prompt.trim()) {
      return NextResponse.json(
        { error: "Prompt is required" },
        { status: 400 }
      );
    }

    const selectedModel = getChatModel(requestedModel);

    if (!selectedModel || !CHAT_API_MODEL_IDS.has(requestedModel)) {
      return NextResponse.json(
        {
          error: selectedModel
            ? `${selectedModel.name} is not supported by the configured Google API`
            : "Unsupported chat model",
        },
        { status: 400 }
      );
    }

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json(
        { error: "Gemini is not configured on this deployment." },
        { status: 500 }
      );
    }

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({
      model: selectedModel.apiModelId ?? DEFAULT_CHAT_MODEL_ID,
    });

    const result = await generateContentWithRetry(
      model,
      prompt.trim()
    );

    const response = result.response.text();

    return NextResponse.json({
      success: true,
      response,
      model: requestedModel,
    });
  } catch (error) {
    console.error("Gemini chat API error:", error);

    const providerIsTemporarilyUnavailable =
      isTemporaryProviderError(error);
    const errorMessage = providerIsTemporarilyUnavailable
      ? "Gemini is temporarily unavailable. Please try again shortly."
      : "Gemini provider request failed.";
    const errorStatus = providerIsTemporarilyUnavailable ? 503 : 502;

    return NextResponse.json(
      {
        error: errorMessage,
      },
      { status: errorStatus }
    );
  }
}
