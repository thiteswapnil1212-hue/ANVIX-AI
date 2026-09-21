
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

  const genAI = new GoogleGenerativeAI(apiKey);

  const model = genAI.getGenerativeModel({
    model: selectedModel.apiModelId ?? DEFAULT_CHAT_MODEL_ID,
  });

  const encoder = new TextEncoder();

  let cancelled = false;
  let iterator:
    | AsyncIterator<{
        text: () => string;
      }>
    | undefined;

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        // Start generating inside the stream lifecycle.
        const result = await generateContentWithRetry(model, prompt);

        if (cancelled) return;

        iterator = result.stream[Symbol.asyncIterator]();

        while (!cancelled) {
          const { value, done } = await iterator.next();

          if (done || cancelled) break;

          const text = value.text();

          if (text) {
            controller.enqueue(encoder.encode(text));
          }
        }

        if (!cancelled) {
          controller.close();
        }
      } catch (error) {
        if (cancelled) return;

        console.error("Gemini stream error:", error);

        controller.error(
          new Error("Gemini stream interrupted. Please try again.")
        );
      }
    },

    async cancel() {
      cancelled = true;

      // Stop consuming the SDK's async iterator.
      // This does not guarantee upstream Gemini generation
      // is cancelled if the SDK has no provider abort support.
      try {
        await iterator?.return?.();
      } catch (error) {
        console.warn("Unable to close Gemini stream iterator.", error);
      }
    },
  });

  return new Response(stream, {
    status: 200,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      "X-Content-Type-Options": "nosniff",
    },
  });
}