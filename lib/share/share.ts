/**
 * Share links — pure helpers (no Supabase, no network).
 *
 * A share is a row in `public.shares` pointing at one resource
 * (a chat conversation or a generated project) plus an unguessable
 * public token. Anyone who holds the link can read that one resource
 * read-only through /api/share/[token]; the token is the only secret,
 * so it is 256 random bits, never sequential and never derived from
 * the resource id.
 */

export type ShareResourceType = "chat" | "project";
export type SharePermission = "view" | "comment";

export interface ShareRecord {
  id: string;
  owner_id: string;
  resource_type: ShareResourceType;
  resource_id: string;
  token: string;
  permission: SharePermission;
  expires_at: string | null;
  revoked: boolean;
  created_at: string;
}

export interface ShareCommentRecord {
  id: string;
  share_id: string;
  author_user_id: string | null;
  author_name: string;
  body: string;
  created_at: string;
}

const TOKEN_BYTES = 32;
const TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/;
const BASE64URL_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";

/**
 * A fresh unguessable token: 32 random bytes, base64url, no padding.
 * Uses Web Crypto, so it works in the browser and on the server.
 */
export function generateShareToken(): string {
  const bytes = new Uint8Array(TOKEN_BYTES);
  globalThis.crypto.getRandomValues(bytes);

  let token = "";
  for (let i = 0; i < bytes.length; i += 3) {
    const chunk =
      (bytes[i] << 16) |
      ((bytes[i + 1] ?? 0) << 8) |
      (bytes[i + 2] ?? 0);
    token += BASE64URL_ALPHABET[(chunk >> 18) & 63];
    token += BASE64URL_ALPHABET[(chunk >> 12) & 63];
    if (i + 1 < bytes.length) token += BASE64URL_ALPHABET[(chunk >> 6) & 63];
    if (i + 2 < bytes.length) token += BASE64URL_ALPHABET[chunk & 63];
  }
  return token;
}

/** True only for tokens this app could have issued. */
export function isShareToken(value: unknown): value is string {
  return typeof value === "string" && TOKEN_PATTERN.test(value);
}

export interface ShareExpiryOption {
  id: "7d" | "30d" | "never";
  label: string;
}

export const SHARE_EXPIRY_OPTIONS: ShareExpiryOption[] = [
  { id: "7d", label: "7 days" },
  { id: "30d", label: "30 days" },
  { id: "never", label: "No expiry" },
];

/** ISO expiry for an option, or null for "never". */
export function expiryFromOption(
  optionId: ShareExpiryOption["id"],
  now: Date = new Date()
): string | null {
  if (optionId === "7d") {
    return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();
  }
  if (optionId === "30d") {
    return new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString();
  }
  return null;
}

/** True when the share's expiry has passed. Null expiry never expires. */
export function isShareExpired(
  share: Pick<ShareRecord, "expires_at">,
  now: Date = new Date()
): boolean {
  if (!share.expires_at) return false;
  return new Date(share.expires_at).getTime() <= now.getTime();
}

/** Live = not revoked and not expired. */
export function isShareLive(
  share: Pick<ShareRecord, "expires_at" | "revoked">,
  now: Date = new Date()
): boolean {
  return !share.revoked && !isShareExpired(share, now);
}

/** Public URL for a share token. Origin comes from the request, never env. */
export function buildShareUrl(origin: string, token: string): string {
  return `${origin.replace(/\/$/, "")}/share/${token}`;
}

export const MAX_COMMENT_LENGTH = 2000;
export const MAX_REPORT_REASON_LENGTH = 500;

/** Plain-words error, or null when the comment body is acceptable. */
export function validateCommentBody(body: unknown): string | null {
  if (typeof body !== "string" || !body.trim()) {
    return "Write a comment first.";
  }
  if (body.trim().length > MAX_COMMENT_LENGTH) {
    return `Comments are limited to ${MAX_COMMENT_LENGTH} characters.`;
  }
  return null;
}

/** Plain-words error, or null when the report reason is acceptable. */
export function validateReportReason(reason: unknown): string | null {
  if (typeof reason !== "string" || !reason.trim()) {
    return "Tell us briefly what is wrong with this link.";
  }
  if (reason.trim().length > MAX_REPORT_REASON_LENGTH) {
    return `Keep the reason under ${MAX_REPORT_REASON_LENGTH} characters.`;
  }
  return null;
}
