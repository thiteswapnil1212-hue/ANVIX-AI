
import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import {
  CHAT_API_MODEL_IDS,
  DEFAULT_CHAT_MODEL_ID,
  getChatModel,
} from "@/lib/chat-models";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ChatRequestBody = {
  prompt?: unknown;
  model?: unknown;
};

const MAX_PROVIDER_RETRIES = 2;
const RETRY_DELAYS_MS = [250, 750];

function getProviderStatus(error: unknown): number | undefined {
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

function isRetryableProviderError(error: unknown): boolean {
  const status = getProviderStatus(error);
  return status === 429 || status === 503;
}

async function generateContentWithRetry(
  model: ReturnType<GoogleGenerativeAI["getGenerativeModel"]>,
  prompt: string
) {
  for (let attempt = 0; attempt <= MAX_PROVIDER_RETRIES; attempt += 1) {
    try {
      return await model.generateContentStream(prompt);
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

  const prompt =
    typeof body.prompt === "string" ? body.prompt.trim() : "";

  const requestedModel =
    typeof body.model === "string" && body.model.trim()
      ? body.model.trim()
      : DEFAULT_CHAT_MODEL_ID;

  if (!prompt) {
    return NextResponse.json(
      { error: "Prompt is required" },
      { status: 400 }
    );
  }

  const selectedModel = getChatModel(requestedModel);

  if (
    !selectedModel ||
    !CHAT_API_MODEL_IDS.has(requestedModel)
  ) {
    return NextResponse.json(
      {
        error: selectedModel
          ? `${selectedModel.name} is not supported by the configured Google API`
          : "Unsupported chat model",
      },
      { status: 400 }
    );
  }

  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { error: "Gemini is not configured on this deployment." },
      { status: 500 }
    );
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);

    const model = genAI.getGenerativeModel({
      model: selectedModel.apiModelId ?? DEFAULT_CHAT_MODEL_ID,
    });

    // Start the Gemini stream before returning the HTTP response.
    const result = await generateContentWithRetry(model, prompt);

    const encoder = new TextEncoder();

    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        try {
          for await (const chunk of result.stream) {
            const text = chunk.text();

            if (text) {
              controller.enqueue(encoder.encode(text));
            }
          }

          controller.close();
        } catch (error) {
          console.error("Gemini stream error:", error);

          controller.error(
            new Error("Gemini stream interrupted. Please try again.")
          );
        }
      },
    });

    // Return plain text chunks, NOT a JSON success envelope.
    return new Response(stream, {
      status: 200,
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    console.error("Gemini chat API error:", error);

    const status = getProviderStatus(error);
    const temporarilyUnavailable = status === 429 || status === 503;

    return NextResponse.json(
      {
        error: temporarilyUnavailable
          ? "Gemini is temporarily unavailable. Please try again shortly."
          : "Gemini provider request failed.",
      },
      {
        status: temporarilyUnavailable ? 503 : 502,
      }
    );
  }
}