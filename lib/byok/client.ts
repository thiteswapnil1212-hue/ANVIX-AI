/**
 * BYOK + quota meter — browser-side helpers.
 *
 * The browser never sees a Gemini key: it only stores the *choice*
 * "use my key" (localStorage) and talks to the server routes
 * (`/api/byok`, `/api/usage`), which do all key handling server-side.
 * Every fetch here is best-effort — a failed status read degrades to
 * "shared key" behaviour instead of breaking the page.
 */

import { getAuthHeaders } from "@/lib/api/auth-headers";
import type { QuotaMeter } from "@/lib/usage/meter";

export const USE_OWN_KEY_STORAGE_KEY = "anvix:useOwnKey";

/** Whether the user asked chats to run on their own stored key. */
export function shouldUseOwnKey(): boolean {
  try {
    return window.localStorage.getItem(USE_OWN_KEY_STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

export function setUseOwnKey(value: boolean): void {
  try {
    window.localStorage.setItem(USE_OWN_KEY_STORAGE_KEY, value ? "1" : "0");
  } catch {
    // Storage unavailable (private mode, etc.): the choice just
    // doesn't persist; chats still work on the shared key.
  }
}

export interface ByokStatus {
  provider: string;
  encryptionConfigured: boolean;
  hasKey: boolean;
  keyLast4: string | null;
  verifiedAt: string | null;
}

// QuotaMeter is the server meter's shape (lib/usage/meter.ts) — one
// type for both sides, so the Settings merge cannot drift from what
// /api/usage returns. (This file used to redeclare it with a loose
// `scope: string`, which the session merge then rejected.)
export type { QuotaMeter };

export interface UsageStatus {
  date: string;
  source: "db" | "rate-limit";
  byokActive: boolean;
  meters: QuotaMeter[];
}

async function readError(response: Response, fallback: string): Promise<string> {
  try {
    const data = (await response.json()) as { error?: unknown };
    return typeof data.error === "string" && data.error.trim()
      ? data.error
      : fallback;
  } catch {
    return fallback;
  }
}

export async function fetchByokStatus(): Promise<ByokStatus | null> {
  try {
    const response = await fetch("/api/byok", {
      headers: await getAuthHeaders(),
    });
    if (!response.ok) return null;
    return (await response.json()) as ByokStatus;
  } catch {
    return null;
  }
}

/** Save + verify a key. Returns an error string, or null on success. */
export async function saveByokKey(key: string): Promise<string | null> {
  try {
    const response = await fetch("/api/byok", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(await getAuthHeaders()),
      },
      body: JSON.stringify({ key }),
    });
    if (response.ok) return null;
    return await readError(response, "Could not save the key. Please try again.");
  } catch {
    return "Could not reach the server. Please try again.";
  }
}

/** Revoke the stored key. Returns an error string, or null on success. */
export async function revokeByokKey(): Promise<string | null> {
  try {
    const response = await fetch("/api/byok", {
      method: "DELETE",
      headers: await getAuthHeaders(),
    });
    if (response.ok) return null;
    return await readError(response, "Could not remove the key. Please try again.");
  } catch {
    return "Could not reach the server. Please try again.";
  }
}

export async function fetchUsage(): Promise<UsageStatus | null> {
  try {
    const response = await fetch("/api/usage", {
      headers: await getAuthHeaders(),
    });
    if (!response.ok) return null;
    return (await response.json()) as UsageStatus;
  } catch {
    return null;
  }
}
