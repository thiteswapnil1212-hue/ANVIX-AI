import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
  timingSafeEqual,
} from "node:crypto";

/**
 * AES-256-GCM encryption for per-user OAuth tokens stored in Supabase.
 *
 * NOTE: no AES-GCM helper existed anywhere in the base (the task's
 * "reuse the AES-GCM pattern" refers to a pattern that was never landed),
 * so this module IS the pattern: 32-byte key, random 12-byte IV per
 * encryption, 16-byte auth tag, single base64 payload
 * `iv || tag || ciphertext`. Nothing here ever logs or returns a key.
 *
 * Key source (server only, never shipped to the browser):
 * `GOOGLE_TOKEN_ENCRYPTION_KEY` — 32 random bytes encoded as base64
 * (44 chars) or hex (64 chars). Generate with:
 *   node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
 * If the env var is missing or malformed, encryption throws instead of
 * silently storing tokens in plaintext.
 */

const KEY_BYTES = 32;
const IV_BYTES = 12;
const TAG_BYTES = 16;

/** Parse a base64- or hex-encoded 32-byte key; null when unusable. */
export function parseEncryptionKey(raw: string | undefined): Buffer | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;

  const candidates: Buffer[] = [];
  // Base64 first (44 chars incl. padding); hex second (64 chars).
  try {
    candidates.push(Buffer.from(trimmed, "base64"));
  } catch {
    // fall through to hex
  }
  try {
    candidates.push(Buffer.from(trimmed, "hex"));
  } catch {
    // fall through
  }

  for (const candidate of candidates) {
    if (candidate.length === KEY_BYTES) return candidate;
  }
  return null;
}

/** The server encryption key from env, or null when not configured. */
export function getEncryptionKey(): Buffer | null {
  return parseEncryptionKey(process.env.GOOGLE_TOKEN_ENCRYPTION_KEY);
}

/**
 * Encrypt a token. `key` is a test seam — routes omit it and use the env
 * key. Throws when no usable key is available.
 */
export function encryptToken(
  plaintext: string,
  key: Buffer | null = getEncryptionKey()
): string {
  if (!key) {
    throw new Error(
      "Token encryption is not configured: set GOOGLE_TOKEN_ENCRYPTION_KEY."
    );
  }
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const ciphertext = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  if (tag.length !== TAG_BYTES) {
    throw new Error("Unexpected GCM auth tag length.");
  }
  return Buffer.concat([iv, tag, ciphertext]).toString("base64");
}

/**
 * Decrypt a payload produced by `encryptToken`. Returns null (instead of
 * throwing) when the payload is malformed or tampered with, so a corrupt
 * stored token degrades to "not connected" rather than crashing a route.
 * Throws only when no usable key is configured.
 */
export function decryptToken(
  payload: string,
  key: Buffer | null = getEncryptionKey()
): string | null {
  if (!key) {
    throw new Error(
      "Token encryption is not configured: set GOOGLE_TOKEN_ENCRYPTION_KEY."
    );
  }
  let raw: Buffer;
  try {
    raw = Buffer.from(payload, "base64");
  } catch {
    return null;
  }
  if (raw.length <= IV_BYTES + TAG_BYTES) return null;

  const iv = raw.subarray(0, IV_BYTES);
  const tag = raw.subarray(IV_BYTES, IV_BYTES + TAG_BYTES);
  const ciphertext = raw.subarray(IV_BYTES + TAG_BYTES);

  try {
    const decipher = createDecipheriv("aes-256-gcm", key, iv);
    decipher.setAuthTag(tag);
    const plaintext = Buffer.concat([
      decipher.update(ciphertext),
      decipher.final(),
    ]);
    return plaintext.toString("utf8");
  } catch {
    return null;
  }
}

/** Constant-time string equality (HMAC/state comparisons). */
export function safeEqual(a: string, b: string): boolean {
  const aBuf = Buffer.from(a, "utf8");
  const bBuf = Buffer.from(b, "utf8");
  if (aBuf.length !== bBuf.length) return false;
  return timingSafeEqual(aBuf, bBuf);
}
