import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { enforceRateLimit } from "@/lib/rate-limit";
import { getAuthedCaller } from "@/lib/supabase/server-user";
import {
  buildLiveTokenConfig,
  extractEphemeralTokenName,
} from "@/lib/live/token";
import {
  LIVE_MODEL_FALLBACK,
  LIVE_MODEL_PRIMARY,
  LIVE_SESSION_CAP_SECONDS,
  isLiveModelId,
} from "@/lib/live/live-models";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/live/token — mint a one-use ephemeral token for Gemini Live.
 * Body (optional): `{ "model": "gemini-3.8-live" }` — must be one of the
 * two allow-listed Live models; defaults to the primary.
 *
 * The app's real `GEMINI_API_KEY` never leaves this route: the client
 * receives only `token` (the `authTokens/...` name), usable for a single
 * Live session, audio-only, locked to the requested model. Ephemeral
 * tokens are v1alpha-only in this SDK version, so both the mint and the
 * client connect with `apiVersion: "v1alpha"`.
 *
 * Signed-in users only; 10 tokens/hour per user (Live minutes are the
 * most expensive thing on the free tier after image generation).
 */
export async function POST(request: Request) {
  const limited = await enforceRateLimit(request, "live-token", 10, 3_600_000);
  if (limited) return limited;

  const caller = await getAuthedCaller(request);
  if (!caller) {
    return NextResponse.json(
      { error: "Sign in to use voice chat." },
      { status: 401 }
    );
  }

  let body: { model?: unknown } = {};
  try {
    body = (await request.json()) as { model?: unknown };
  } catch {
    // Empty body is fine — the primary model is used.
  }
  const model = isLiveModelId(body.model)
    ? body.model
    : LIVE_MODEL_PRIMARY;

  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    return NextResponse.json(
      { error: "Voice chat is not configured on this deployment." },
      { status: 503 }
    );
  }

  try {
    // Ephemeral tokens are supported in v1alpha only (SDK docs).
    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: { apiVersion: "v1alpha" },
    });
    const { params, expiresAt } = buildLiveTokenConfig(model);
    const token = await ai.authTokens.create(params);
    const tokenName = extractEphemeralTokenName(token);
    if (!tokenName) {
      return NextResponse.json(
        { error: "Google did not return a usable voice token." },
        { status: 502 }
      );
    }
    return NextResponse.json({
      token: tokenName,
      model,
      fallbackModel: LIVE_MODEL_FALLBACK,
      expiresAt,
      sessionCapSeconds: LIVE_SESSION_CAP_SECONDS,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Voice token request failed.";
    const quota = /quota|429|resource.?exhausted/i.test(message);
    return NextResponse.json(
      {
        error: quota
          ? "Voice chat is busy right now. Please try again shortly."
          : "Could not start voice chat. Please try again.",
      },
      { status: quota ? 503 : 502 }
    );
  }
}
