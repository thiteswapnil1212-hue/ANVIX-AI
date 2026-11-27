import { enforceRateLimit } from "@/lib/rate-limit";
import {
  enforceDailyCap,
  IMAGE_DAILY_CAP,
} from "@/lib/daily-cap";
import {
  buildPollinationsUrl,
  IMAGE_PROVIDER_NOTE,
  isPollinationsRateLimit,
  parseRetryAfter,
  POLLINATIONS_FETCH_TIMEOUT_MS,
  validateImagePrompt,
} from "@/lib/pollinations";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ImageRequestBody = {
  prompt?: unknown;
  width?: unknown;
  height?: unknown;
  seed?: unknown;
};

function jsonError(
  error: string,
  status: number,
  extra: Record<string, unknown> = {}
): Response {
  return new Response(JSON.stringify({ error, ...extra }), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export async function POST(request: Request) {
  try {
    return await handleImageRequest(request);
  } catch (error) {
    // Last line of defence: an unexpected throw must still answer
    // with the route's JSON error shape, never a bare 500. (A bare
    // 500 is what users saw on 2026-11-27 when the success path
    // threw while building the response headers.)
    console.error("Image route failed:", error);
    return jsonError(
      "The image service failed unexpectedly. Please try again.",
      502,
      { provider: "pollinations", retryable: true }
    );
  }
}

async function handleImageRequest(request: Request) {
  // Blunt bursts (image gen is slow + the upstream lane is 1/45s/IP),
  // then the real guard: 10 images/day per caller.
  const limited = await enforceRateLimit(request, "image", 5, 60_000);
  if (limited) return limited;
  const capped = await enforceDailyCap(request, "image", IMAGE_DAILY_CAP);
  if (capped) return capped;

  let body: ImageRequestBody;
  try {
    body = await request.json();
  } catch {
    return jsonError("Invalid JSON body.", 400);
  }

  const validated = validateImagePrompt(body.prompt);
  if (!validated.ok) return jsonError(validated.error, 400);

  const width = typeof body.width === "number" ? body.width : undefined;
  const height = typeof body.height === "number" ? body.height : undefined;
  const seed = typeof body.seed === "number" ? body.seed : undefined;

  const imageUrl = buildPollinationsUrl(validated.prompt, {
    width,
    height,
    seed,
  });

  let upstream: Response;
  try {
    upstream = await fetch(imageUrl, {
      signal: AbortSignal.timeout(POLLINATIONS_FETCH_TIMEOUT_MS),
      headers: { Accept: "image/*" },
    });
  } catch (error) {
    if (error instanceof Error && error.name === "TimeoutError") {
      return jsonError(
        "The free image service took too long. Please try again.",
        502,
        { provider: "pollinations", retryable: true }
      );
    }
    console.error("Pollinations fetch failed:", error);
    return jsonError(
      "The free image service is unavailable right now. Please try again later.",
      502,
      { provider: "pollinations", retryable: true }
    );
  }

  if (isPollinationsRateLimit(upstream.status)) {
    const retryAfter = parseRetryAfter(
      upstream.headers.get("Retry-After")
    );
    return new Response(
      JSON.stringify({
        error: `The free image service is busy — please try again in about ${retryAfter} seconds.`,
        retryAfterSeconds: retryAfter,
        provider: "pollinations",
        retryable: true,
      }),
      {
        status: 429,
        headers: {
          "Content-Type": "application/json",
          "Retry-After": String(retryAfter),
        },
      }
    );
  }

  if (!upstream.ok) {
    console.error("Pollinations error status:", upstream.status);
    return jsonError(
      "The free image service could not make this image. Please try again later.",
      502,
      { provider: "pollinations", retryable: true }
    );
  }

  // Proxy the bytes: the client renders them like any attachment.
  // The source URL is returned too, so a saved message can reload
  // the image from Pollinations after the session blob URL is gone.
  // The body read is guarded: a dropped connection mid-download used
  // to throw here and answer a bare 500.
  let bytes: ArrayBuffer;
  try {
    bytes = await upstream.arrayBuffer();
  } catch (error) {
    console.error("Pollinations body read failed:", error);
    return jsonError(
      "The free image service cut the download short. Please try again.",
      502,
      { provider: "pollinations", retryable: true }
    );
  }
  return new Response(bytes, {
    status: 200,
    headers: {
      "Content-Type":
        upstream.headers.get("Content-Type") ?? "image/jpeg",
      "Cache-Control": "public, max-age=86400",
      "X-ANVIX-Image-Provider": "pollinations",
      "X-ANVIX-Image-Source": imageUrl,
      // Header values must be ByteString (Latin-1): sanitise even
      // though the note constant is ASCII today, so a future edit
      // can never 500 the success path again.
      "X-ANVIX-Image-Note": toHeaderValue(IMAGE_PROVIDER_NOTE),
    },
  });
}

/**
 * Make a string safe for an HTTP header value: any character outside
 * Latin-1 becomes "-". `Response` construction throws a TypeError
 * ("Cannot convert argument to a ByteString") on such characters,
 * which Next.js turns into a bare 500.
 */
function toHeaderValue(value: string): string {
  let safe = "";
  for (const char of value) {
    const code = char.codePointAt(0);
    safe += code !== undefined && code <= 255 ? char : "-";
  }
  return safe;
}
