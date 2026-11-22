import type { SupabaseClient } from "@supabase/supabase-js";
// Namespace import (not a default import): `web-push` is CommonJS and
// the node --test ESM loader rejects a default import of it.
import * as webpush from "web-push";
import type { PushSubscription } from "web-push";

/**
 * Web Push (VAPID) — server side.
 *
 * Keys come ONLY from env, never from code:
 * - `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` — generate once with
 *   `npx web-push generate-vapid-keys` and put them in Vercel env vars.
 * - `VAPID_SUBJECT` — a `mailto:` address or site URL identifying the
 *   sender (defaults to `NEXT_PUBLIC_SITE_URL`).
 *
 * When the keys are absent the whole feature reports itself as
 * unavailable (`isPushConfigured() === false`, `/api/push/config`
 * answers `configured: false`, the Settings UI says so) instead of
 * failing silently or, worse, pretending to work.
 */

export interface PushPayload {
  title: string;
  body: string;
  /** Same-origin path the notification opens, e.g. "/dashboard". */
  url: string;
  tag: string;
}

const MAX_TITLE_LENGTH = 120;
const MAX_BODY_LENGTH = 500;
const MAX_TAG_LENGTH = 50;

export function isPushConfigured(): boolean {
  return Boolean(
    process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY
  );
}

/** The public key the browser needs to subscribe, or null when unset. */
export function getVapidPublicKey(): string | null {
  return process.env.VAPID_PUBLIC_KEY ?? null;
}

/**
 * Validate an untrusted push payload (from a route body). `url` must be a
 * same-origin path — a push notification that opens an external site
 * would be a phishing vector.
 */
export function parsePushPayload(
  input: unknown
): { ok: true; payload: PushPayload } | { ok: false; error: string } {
  if (!input || typeof input !== "object") {
    return { ok: false, error: "Push payload must be a JSON object." };
  }
  const { title, body, url, tag } = input as Record<string, unknown>;

  if (typeof title !== "string" || !title.trim()) {
    return { ok: false, error: "Push payload needs a non-empty title." };
  }
  if (title.length > MAX_TITLE_LENGTH) {
    return { ok: false, error: `Title must be ${MAX_TITLE_LENGTH} characters or fewer.` };
  }
  if (typeof body !== "string" || !body.trim()) {
    return { ok: false, error: "Push payload needs a non-empty body." };
  }
  if (body.length > MAX_BODY_LENGTH) {
    return { ok: false, error: `Body must be ${MAX_BODY_LENGTH} characters or fewer.` };
  }
  if (typeof url !== "string" || !url.startsWith("/")) {
    return { ok: false, error: "Push url must be a same-origin path starting with /." };
  }
  if (tag !== undefined && (typeof tag !== "string" || tag.length > MAX_TAG_LENGTH)) {
    return { ok: false, error: `Tag must be ${MAX_TAG_LENGTH} characters or fewer.` };
  }

  return {
    ok: true,
    payload: {
      title: title.trim(),
      body: body.trim(),
      url,
      tag: typeof tag === "string" && tag ? tag : "anvix-default",
    },
  };
}

/** Validate an untrusted subscription object posted by the browser. */
export function parsePushSubscription(
  input: unknown
): { ok: true; subscription: PushSubscription } | { ok: false; error: string } {
  if (!input || typeof input !== "object") {
    return { ok: false, error: "Subscription must be a JSON object." };
  }
  const { endpoint, keys } = input as Record<string, unknown>;
  if (typeof endpoint !== "string" || !endpoint.startsWith("https://")) {
    return { ok: false, error: "Subscription endpoint must be an https URL." };
  }
  if (!keys || typeof keys !== "object") {
    return { ok: false, error: "Subscription needs a keys object." };
  }
  const { p256dh, auth } = keys as Record<string, unknown>;
  if (typeof p256dh !== "string" || !p256dh) {
    return { ok: false, error: "Subscription needs a p256dh key." };
  }
  if (typeof auth !== "string" || !auth) {
    return { ok: false, error: "Subscription needs an auth key." };
  }
  return { ok: true, subscription: { endpoint, keys: { p256dh, auth } } };
}

interface SubscriptionRow {
  endpoint: string;
  p256dh: string;
  auth: string;
}

function toWebPushSubscription(row: SubscriptionRow): PushSubscription {
  return {
    endpoint: row.endpoint,
    keys: { p256dh: row.p256dh, auth: row.auth },
  };
}

export interface PushSendResult {
  sent: number;
  failed: number;
  /** Endpoints that answered 404/410 — deleted from the table. */
  gone: number;
}

/**
 * Send one push notification to every stored subscription for `userId`.
 * Stale endpoints (the browser unsubscribed, or the push service dropped
 * the subscription) are removed so the table does not rot. Throws when
 * VAPID is not configured — callers check `isPushConfigured()` first.
 */
export async function sendPushToUser(
  client: SupabaseClient,
  userId: string,
  payload: PushPayload
): Promise<PushSendResult> {
  const publicKey = process.env.VAPID_PUBLIC_KEY as string;
  const privateKey = process.env.VAPID_PRIVATE_KEY as string;
  const subject =
    process.env.VAPID_SUBJECT ??
    process.env.NEXT_PUBLIC_SITE_URL ??
    "https://anvix-ai.vercel.app";
  webpush.setVapidDetails(subject, publicKey, privateKey);

  const { data, error } = await client
    .from("push_subscriptions")
    .select("endpoint, p256dh, auth")
    .eq("user_id", userId);
  if (error) throw error;

  const rows = (data ?? []) as SubscriptionRow[];
  const result: PushSendResult = { sent: 0, failed: 0, gone: 0 };

  for (const row of rows) {
    try {
      await webpush.sendNotification(
        toWebPushSubscription(row),
        JSON.stringify(payload)
      );
      result.sent += 1;
    } catch (sendError) {
      const status =
        sendError instanceof Error
          ? (sendError as Error & { statusCode?: number }).statusCode
          : undefined;
      if (status === 404 || status === 410) {
        // Subscription is dead — delete it so we stop trying.
        await client
          .from("push_subscriptions")
          .delete()
          .eq("user_id", userId)
          .eq("endpoint", row.endpoint);
        result.gone += 1;
      } else {
        result.failed += 1;
      }
    }
  }

  return result;
}
