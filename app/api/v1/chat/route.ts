import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { rateLimit } from "@/lib/rate-limit";
import {
  extractApiKey,
  verifyApiKey,
  PUBLIC_API_GLOBAL_DAILY_CAP,
} from "@/lib/api-keys";
import { CHAT_MODEL_ID } from "@/lib/gemini/model-config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const MAX_PROMPT_CHARS = 8000;

/**
 * POST /api/v1/chat — the public API.
 * Auth: `X-API-Key: anvix_live_...` (or `Authorization: Bearer ...`).
 * Body: `{ prompt: string }`. Returns `{ reply, model }`.
 *
 * Quota (the reason this endpoint is safe to expose while BYOK is still
 * missing): per-key per-minute limit + per-key hard daily cap from the
 * key's row, plus a global daily ceiling across all keys, all on the
 * app's shared Gemini key. See docs/public-api.md for the BYOK tie-in.
 */
export async function POST(request: Request) {
  const candidate = extractApiKey(request);
  if (!candidate) {
    return NextResponse.json(
      { error: "Missing API key. Send X-API-Key: anvix_live_..." },
      { status: 401 }
    );
  }

  const verified = await verifyApiKey(candidate);
  if (!verified) {
    return NextResponse.json(
      { error: "Invalid or revoked API key." },
      { status: 401 }
    );
  }
  if (!verified.scopes.includes("chat")) {
    return NextResponse.json(
      { error: "This API key does not have the chat scope." },
      { status: 403 }
    );
  }

  // Per-key per-minute limit.
  const minute = rateLimit(
    `apikey:${verified.keyId}:min`,
    verified.rateLimitPerMin,
    60_000
  );
  if (!minute.ok) {
    return NextResponse.json(
      {
        error: "Too many requests for this API key. Slow down and try again.",
        retryAfterSeconds: minute.retryAfterSeconds,
      },
      {
        status: 429,
        headers: { "Retry-After": String(minute.retryAfterSeconds) },
      }
    );
  }

  // Per-key hard daily cap.
  const day = rateLimit(
    `apikey:${verified.keyId}:day`,
    verified.dailyCap,
    86_400_000
  );
  if (!day.ok) {
    return NextResponse.json(
      {
        error:
          "This API key has used its daily allowance. It resets tomorrow.",
        retryAfterSeconds: day.retryAfterSeconds,
      },
      {
        status: 429,
        headers: { "Retry-After": String(day.retryAfterSeconds) },
      }
    );
  }

  // Global ceiling: every key shares one Gemini key, so the whole public
  // API together cannot burn the day's quota.
  const global = rateLimit(
    "public-api:global:day",
    PUBLIC_API_GLOBAL_DAILY_CAP,
    86_400_000
  );
  if (!global.ok) {
    return NextResponse.json(
      {
        error:
          "The public API has used its shared daily allowance. Try again tomorrow.",
        retryAfterSeconds: global.retryAfterSeconds,
      },
      {
        status: 429,
        headers: { "Retry-After": String(global.retryAfterSeconds) },
      }
    );
  }

  let body: { prompt?: unknown };
  try {
    body = (await request.json()) as { prompt?: unknown };
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }
  const prompt = typeof body.prompt === "string" ? body.prompt.trim() : "";
  if (!prompt) {
    return NextResponse.json({ error: "Prompt is required." }, { status: 400 });
  }
  if (prompt.length > MAX_PROMPT_CHARS) {
    return NextResponse.json(
      { error: `Prompt must be at most ${MAX_PROMPT_CHARS} characters.` },
      { status: 400 }
    );
  }

  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    return NextResponse.json(
      { error: "The AI service is not configured on this deployment." },
      { status: 503 }
    );
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: CHAT_MODEL_ID });
    const result = await model.generateContent(prompt);
    return NextResponse.json({
      reply: result.response.text(),
      model: CHAT_MODEL_ID,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Chat failed.";
    const quota = /quota|429|resource.?exhausted/i.test(message);
    return NextResponse.json(
      {
        error: quota
          ? "The AI service is busy right now. Please try again shortly."
          : "Chat failed. Please try again.",
      },
      { status: quota ? 503 : 502 }
    );
  }
}
