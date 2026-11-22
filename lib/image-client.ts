import { getAuthHeaders } from "./api/auth-headers.ts";
import { IMAGE_PROVIDER_NOTE } from "./pollinations.ts";

/**
 * Client for `/api/image` (Pollinations via the ANVIX route).
 *
 * The route enforces the per-user cap (10 images/day) and proxies the
 * bytes; this helper turns the response into a displayable image.
 * The same helper is the hero/thumbnail entry point for built apps:
 * any client can POST /api/image with a prompt — no chat needed.
 *
 * `url` is a session blob URL (instant, dies on reload);
 * `sourceUrl` is the canonical Pollinations URL (persistent — a saved
 * message reloads from it). Persist `sourceUrl`, display `url`.
 */
export type GeneratedImage = {
  /** Session blob URL for immediate display. */
  url: string;
  /** Canonical Pollinations URL — the persistent form. */
  sourceUrl: string;
  prompt: string;
};

export const GENERATED_IMAGE_NOTE = IMAGE_PROVIDER_NOTE;

export class GeneratedImageError extends Error {
  retryAfterSeconds?: number;

  constructor(message: string, retryAfterSeconds?: number) {
    super(message);
    this.name = "GeneratedImageError";
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

type ImageErrorBody = {
  error?: string;
  retryAfterSeconds?: number;
};

/** Generate one image. Throws GeneratedImageError on any failure. */
export async function requestGeneratedImage(
  prompt: string,
  options: { signal?: AbortSignal } = {}
): Promise<GeneratedImage> {
  const response = await fetch("/api/image", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(await getAuthHeaders()),
    },
    body: JSON.stringify({ prompt }),
    signal: options.signal,
  });

  if (!response.ok) {
    let message = "Image generation failed. Please try again.";
    let retryAfter: number | undefined;

    try {
      const data = (await response.json()) as ImageErrorBody;
      if (data.error) message = data.error;
      retryAfter = data.retryAfterSeconds;
    } catch {
      // Keep the fallback message.
    }

    throw new GeneratedImageError(message, retryAfter);
  }

  const blob = await response.blob();
  const sourceUrl =
    response.headers.get("X-ANVIX-Image-Source") ?? "";
  return {
    url: URL.createObjectURL(blob),
    sourceUrl,
    prompt: prompt.trim(),
  };
}

/**
 * The persistent form of a generated image: a blob URL is dead after
 * reload, so saved messages (localStorage) keep the Pollinations URL.
 * Cloud sync drops extra message fields today (same as thinking and
 * sources), so images persist in the local mirror only.
 */
export function toPersistableImage(
  image: GeneratedImage
): GeneratedImage {
  if (!image.url.startsWith("blob:") || !image.sourceUrl) return image;
  return { ...image, url: image.sourceUrl };
}
