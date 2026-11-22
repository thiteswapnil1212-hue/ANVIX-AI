import { getAuthHeaders } from "./api/auth-headers.ts";

/**
 * Client for `/api/compare` (OpenRouter, BYOK only).
 *
 * The user's own OpenRouter key is kept in this browser's
 * localStorage only, and sent to ANVIX's own /api/compare route for
 * one request at a time — it is never sent anywhere else, never
 * stored server-side, and never logged. MERGE POINT: when the BYOK
 * `user_api_keys` table lands, this localStorage key moves to the
 * encrypted server-side store (see lib/crypto/user-keys.ts) and the
 * route reads it from there; the compare panel then only asks "use
 * my saved key".
 */

const OPENROUTER_KEY_STORAGE = "anvix-openrouter-key";

export function getStoredOpenRouterKey(): string {
  if (typeof window === "undefined") return "";
  try {
    return window.localStorage.getItem(OPENROUTER_KEY_STORAGE) ?? "";
  } catch {
    return "";
  }
}

export function saveStoredOpenRouterKey(key: string): void {
  if (typeof window === "undefined") return;
  try {
    if (key.trim()) {
      window.localStorage.setItem(OPENROUTER_KEY_STORAGE, key.trim());
    } else {
      window.localStorage.removeItem(OPENROUTER_KEY_STORAGE);
    }
  } catch {
    // Private mode / full storage: the key just doesn't persist.
  }
}

export type CompareResult = {
  model: string;
  content: string;
  note?: string;
};

export class CompareError extends Error {
  needsKey: boolean;

  constructor(message: string, needsKey = false) {
    super(message);
    this.name = "CompareError";
    this.needsKey = needsKey;
  }
}

type CompareErrorBody = {
  error?: string;
  needsKey?: boolean;
};

/** Ask one `:free` OpenRouter model the same prompt. Opt-in only. */
export async function requestCompare(
  prompt: string,
  model: string,
  openRouterKey: string,
  options: { signal?: AbortSignal } = {}
): Promise<CompareResult> {
  const response = await fetch("/api/compare", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(await getAuthHeaders()),
    },
    body: JSON.stringify({ prompt, model, openRouterKey }),
    signal: options.signal,
  });

  let data: CompareErrorBody & Partial<CompareResult> = {};
  try {
    data = (await response.json()) as typeof data;
  } catch {
    // Keep the fallback message below.
  }

  if (!response.ok) {
    throw new CompareError(
      data.error ?? "Compare failed. Please try again.",
      data.needsKey ?? false
    );
  }

  if (!data.content || !data.model) {
    throw new CompareError("Compare returned no answer. Please try again.");
  }

  return { model: data.model, content: data.content, note: data.note };
}
