
import { enforceRateLimit } from "@/lib/rate-limit";
import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import {
  BUILD_MODEL_CHAIN,
  CHAT_THINKING_LEVEL,
  thinkingConfig,
} from "@/lib/gemini/model-config";
import {
  CHAT_API_MODEL_IDS,
  DEFAULT_CHAT_MODEL_ID,
  getChatModel,
} from "@/lib/chat-models";
import { buildBlueprintResult } from "@/lib/api/generate";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

type ChatRequestBody = {
  prompt?: unknown;
  model?: unknown;
};

async function startGeminiStream(
  models: Array<ReturnType<GoogleGenerativeAI["getGenerativeModel"]>>,
  prompt: string
) {
  // Try each model once, in order: the selected model, then the other
  // model of the pair (3.5-flash-lite <-> 3.8-flash, the same pair
  // BUILD_MODEL_CHAIN already defines). A 503 usually means that
  // model is overloaded — retrying the same overloaded model is the
  // lowest-yield move, so there is no second same-model retry.
  // Non-retryable failures fail immediately, without trying the
  // fallback. The last retryable error is thrown so the caller can
  // return its clean 503.
  let lastError: unknown = null;

  for (const model of models) {
    try {
      return await model.generateContentStream(prompt);
    } catch (error) {
      if (!isRetryableProviderError(error)) {
        throw error;
      }
      lastError = error;
    }
  }

  throw lastError ?? new Error("Gemini provider request failed");
}

// App-side timeout for one generation attempt, under the 60 s
// platform budget (maxDuration): a hang surfaces as parseable JSON
// from the catch below, not a platform 504 page. The underlying
// generation is not aborted — it is bounded by maxDuration instead.
const GENERATE_TIMEOUT_MS = 50_000;

async function withTimeout<T>(
  promise: Promise<T>,
  message: string
): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<never>((_, reject) => {
        timeoutId = setTimeout(
          () => reject(new Error(message)),
          GENERATE_TIMEOUT_MS
        );
      }),
    ]);
  } finally {
    if (timeoutId !== undefined) clearTimeout(timeoutId);
  }
}

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

export async function POST(req: Request) {
  const limited = await enforceRateLimit(req, "generate", 15, 60_000);
  if (limited) return limited;

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

    // Selected model first, then the other model of the pair — so a
    // retryable failure switches model instead of retrying the same
    // overloaded one (step 3.10).
    const selectedModelId =
      selectedModel.apiModelId ?? DEFAULT_CHAT_MODEL_ID;
    const modelIds = [
      selectedModelId,
      ...BUILD_MODEL_CHAIN.filter((id) => id !== selectedModelId),
    ];
    const models = modelIds.map((id) =>
      genAI.getGenerativeModel({
        model: id,
        generationConfig: {
          ...thinkingConfig(CHAT_THINKING_LEVEL),
        },
      })
    );

    // The client (lib/api/generate) expects a JSON blueprint, not a
    // text stream — accumulate the reply and return it as JSON.
    // Streaming here used to make every home-page generation fail in
    // response.json() with a parse error.
    const runGeneration = async () => {
      const result = await startGeminiStream(models, prompt);

      let text = "";
      for await (const chunk of result.stream) {
        text += chunk.text();
      }
      return text;
    };

    const text = await withTimeout(
      runGeneration(),
      "Generate request timed out."
    );

    if (!text.trim()) {
      return NextResponse.json(
        { error: "Gemini returned an empty response." },
        { status: 502 }
      );
    }

    return NextResponse.json({
      success: true,
      result: buildBlueprintResult(text, selectedModel.name),
    });
  } catch (error) {
    console.error("Gemini chat API error:", error);

    if (
      error instanceof Error &&
      error.message === "Generate request timed out."
    ) {
      return NextResponse.json(
        { error: "Generation timed out. Please try again." },
        { status: 503 }
      );
    }

    const status = getProviderStatus(error);
    const temporarilyUnavailable =
      status === 429 || status === 503;

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