import { enforceRateLimit } from "@/lib/rate-limit";
import { enforceDailyCap, COMPARE_DAILY_CAP } from "@/lib/daily-cap";
import { decryptUserKey } from "@/lib/crypto/user-keys";
import {
  buildCompareRequestBody,
  OPENROUTER_API_URL,
  OPENROUTER_COMPARE_TIMEOUT_MS,
  parseCompareAnswer,
  resolveCompareModel,
  validateComparePrompt,
} from "@/lib/openrouter";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type CompareRequestBody = {
  prompt?: unknown;
  model?: unknown;
  /**
   * The caller's own OpenRouter key, used for this request only.
   * Never stored, never logged. Prefer `encryptedKey` once the BYOK
   * table lands (see below).
   */
  openRouterKey?: unknown;
  /**
   * A blob from `encryptUserKey` — the same AES-GCM helper the BYOK
   * builder uses for the `user_api_keys` table. MERGE POINT: when
   * that table lands, this route should read the caller's stored key
   * (decrypted server-side) instead of taking a key in the request,
   * and this field becomes the handoff format between the two lanes.
   */
  encryptedKey?: unknown;
};

/**
 * Side-by-side second answer from an OpenRouter `:free` model.
 *
 * BYOK ONLY, opt-in per message, demo lane:
 * - No key → 400 with `needsKey: true`. ANVIX holds no shared
 *   OpenRouter key, so the shared 50 requests/day is never burned.
 * - Only `:free` models are ever requested; anything else is a 400.
 * - Hard per-user cap: 5 compares/day on top of OpenRouter's own
 *   50/day per key. Two models per question doubles token burn, so
 *   compare is never a default — the client asks per message only.
 * - Free providers may train on prompts; the UI says so.
 */
export async function POST(request: Request) {
  const limited = await enforceRateLimit(request, "compare", 5, 60_000);
  if (limited) return limited;
  const capped = await enforceDailyCap(
    request,
    "compare",
    COMPARE_DAILY_CAP
  );
  if (capped) return capped;

  let body: CompareRequestBody;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const validated = validateComparePrompt(body.prompt);
  if (!validated.ok) {
    return Response.json({ error: validated.error }, { status: 400 });
  }

  // Resolve the caller's own key: encrypted blob first (the BYOK
  // handoff format), else the per-request key. No key anywhere else.
  let openRouterKey: string | null = null;
  if (typeof body.encryptedKey === "string" && body.encryptedKey) {
    openRouterKey = await decryptUserKey(body.encryptedKey);
  }
  if (!openRouterKey && typeof body.openRouterKey === "string") {
    openRouterKey = body.openRouterKey.trim() || null;
  }

  if (!openRouterKey) {
    return Response.json(
      {
        error:
          "Compare needs your own free OpenRouter key — ANVIX has no shared key for this demo lane. Add one in the Compare panel (openrouter.ai/keys, free, no card).",
        needsKey: true,
      },
      { status: 400 }
    );
  }

  const model = resolveCompareModel(body.model);

  let upstream: Response;
  try {
    upstream = await fetch(
      `${OPENROUTER_API_URL}/chat/completions`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${openRouterKey}`,
          "HTTP-Referer": "https://anvix.ai",
          "X-Title": "ANVIX AI",
        },
        body: JSON.stringify(
          buildCompareRequestBody(model, validated.prompt)
        ),
        signal: AbortSignal.timeout(OPENROUTER_COMPARE_TIMEOUT_MS),
      }
    );
  } catch (error) {
    console.error("OpenRouter fetch failed:", error);
    return Response.json(
      {
        error:
          "OpenRouter is unreachable right now. Your key was not charged — try again later.",
      },
      { status: 502 }
    );
  }

  if (upstream.status === 401 || upstream.status === 403) {
    return Response.json(
      {
        error:
          "OpenRouter rejected the key. Check it is a valid key from openrouter.ai/keys and try again.",
        needsKey: true,
      },
      { status: 401 }
    );
  }

  if (upstream.status === 402) {
    return Response.json(
      {
        error:
          "That model is not free on your key right now. Pick a :free model — compare never uses paid models.",
      },
      { status: 402 }
    );
  }

  if (upstream.status === 429) {
    return Response.json(
      {
        error:
          "OpenRouter's free lane is rate-limited right now (20/min, 50/day per key). Try again in a minute, or try another free model.",
        retryable: true,
      },
      { status: 429 }
    );
  }

  if (upstream.status === 404) {
    return Response.json(
      {
        error:
          "That free model is no longer listed on OpenRouter — the free lineup rotates every few weeks. Pick another :free model.",
        retryable: false,
      },
      { status: 502 }
    );
  }

  if (!upstream.ok) {
    console.error("OpenRouter error status:", upstream.status);
    return Response.json(
      { error: "OpenRouter could not answer. Please try again later." },
      { status: 502 }
    );
  }

  const answer = parseCompareAnswer(
    await upstream.json().catch(() => null),
    model
  );
  if (!answer) {
    return Response.json(
      {
        error:
          "OpenRouter answered, but with no usable text. Try another free model.",
      },
      { status: 502 }
    );
  }

  return Response.json({
    ...answer,
    demoLane: true,
    note: "Demo lane — free OpenRouter model on your own key (50 requests/day per key). Free providers may train on prompts.",
  });
}
