
import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import {
  CHAT_API_MODEL_IDS,
  DEFAULT_CHAT_MODEL_ID,
  getChatModel,
} from "@/lib/chat-models";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isAbortError(error: unknown) {
  return (
    error instanceof Error &&
    (error.name === "AbortError" || error.name === "CanceledError")
  );
}

export async function POST(request: Request) {
  let body: { prompt?: unknown; model?: unknown };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body." },
      { status: 400 }
    );
  }

  const prompt = typeof body.prompt === "string" ? body.prompt.trim() : "";
  const modelId =
    typeof body.model === "string"
      ? body.model
      : DEFAULT_CHAT_MODEL_ID;

  if (!prompt) {
    return NextResponse.json(
      { error: "Prompt is required." },
      { status: 400 }
    );
  }

  if (!CHAT_API_MODEL_IDS.has(modelId)) {
    return NextResponse.json(
      { error: "This model is not available." },
      { status: 400 }
    );
  }

  const selectedModel = getChatModel(modelId);

  if (
    !selectedModel ||
    selectedModel.locked ||
    !selectedModel.apiModelId
  ) {
    return NextResponse.json(
      { error: "This model is not connected." },
      { status: 400 }
    );
  }

  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { error: "Gemini API key is not configured." },
      { status: 500 }
    );
  }

  const client = new GoogleGenerativeAI(apiKey);
  const model = client.getGenerativeModel({
    model: selectedModel.apiModelId,
  });

  let cancelled = false;
  let reader: ReadableStreamDefaultReader<Uint8Array> | null = null;

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const encoder = new TextEncoder();

      try {
        if (request.signal.aborted || cancelled) {
          controller.close();
          return;
        }

        const result = await model.generateContentStream(prompt);

        if (request.signal.aborted || cancelled) {
          controller.close();
          return;
        }

        reader = result.stream
          ? null
          : null;

        for await (const chunk of result.stream) {
          if (request.signal.aborted || cancelled) break;

          const text = chunk.text();

          if (text) {
            controller.enqueue(encoder.encode(text));
          }
        }

        if (!cancelled) {
          controller.close();
        }
      } catch (error) {
        if (cancelled || request.signal.aborted || isAbortError(error)) {
          try {
            controller.close();
          } catch {
            // Stream may already be closed.
          }
          return;
        }

        console.error("Gemini stream error:", error);

        try {
          controller.enqueue(
            encoder.encode("\n\n[An error occurred while generating the response.]")
          );
          controller.close();
        } catch {
          // Client may have disconnected.
        }
      }
    },

    async cancel() {
      cancelled = true;

      try {
        await reader?.cancel();
      } catch {
        // Reader may already be closed.
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      "X-Content-Type-Options": "nosniff",
    },
  });
}