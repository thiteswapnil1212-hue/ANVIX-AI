import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

/**
 * BYOK key encryption (AES-256-GCM).
 *
 * A user's own Gemini key is stored encrypted in `user_api_keys`, never
 * in plaintext. The encryption secret lives only in the server env var
 * `BYOK_ENCRYPTION_KEY` — it is never shipped to the browser and never
 * logged. Any deployment that has not set it must say so honestly in
 * the Settings UI ("BYOK not configured") instead of storing keys
 * unencrypted or in a weaker form.
 *
 * Envelope: base64 of `iv (12 bytes) || authTag (16 bytes) || ciphertext`.
 * The key is derived with a single SHA-256 of the env secret so the
 * operator can set any memorable string; this is key derivation for
 * storage, not password hashing — a weak secret still means weak
 * protection, so the deployment guide says to use 32+ random bytes.
 *
 * This module is pure (no Supabase, no Next.js) so it unit-tests
 * without a network or env.
 */

const IV_BYTES = 12;
const TAG_BYTES = 16;

/** True when a usable encryption secret is present. */
export function isByokEncryptionConfigured(secret?: string): boolean {
  return typeof secret === "string" && secret.trim().length >= 16;
}

/** The server secret, or null when BYOK storage is not configured. */
export function getByokEncryptionSecret(
  env: Record<string, string | undefined> = process.env
): string | null {
  const secret = env.BYOK_ENCRYPTION_KEY;
  return isByokEncryptionConfigured(secret) ? (secret as string) : null;
}

function deriveKey(secret: string): Buffer {
  return createHash("sha256").update(secret, "utf8").digest();
}

/**
 * Encrypt a plaintext API key. Throws on empty input or a missing /
 * too-short secret — callers must check `isByokEncryptionConfigured`
 * first and refuse to store the key, never silently store plaintext.
 */
export function encryptApiKey(plaintext: string, secret: string): string {
  if (!plaintext || !plaintext.trim()) {
    throw new Error("Cannot encrypt an empty API key.");
  }
  if (!isByokEncryptionConfigured(secret)) {
    throw new Error(
      "BYOK encryption is not configured (BYOK_ENCRYPTION_KEY)."
    );
  }

  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv("aes-256-gcm", deriveKey(secret), iv);
  const ciphertext = Buffer.concat([
    cipher.update(plaintext.trim(), "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  if (tag.length !== TAG_BYTES) {
    throw new Error("Unexpected GCM auth tag length.");
  }
  return Buffer.concat([iv, tag, ciphertext]).toString("base64");
}

/**
 * Decrypt an envelope produced by `encryptApiKey`. Returns null on any
 * failure (wrong secret, truncated or tampered blob) — callers treat
 * null as "no usable own key" and fall back to the shared key.
 */
export function decryptApiKey(
  encrypted: string,
  secret: string
): string | null {
  if (!encrypted || !isByokEncryptionConfigured(secret)) return null;

  let bytes: Buffer;
  try {
    bytes = Buffer.from(encrypted, "base64");
  } catch {
    return null;
  }
  if (bytes.length <= IV_BYTES + TAG_BYTES) return null;

  const iv = bytes.subarray(0, IV_BYTES);
  const tag = bytes.subarray(IV_BYTES, IV_BYTES + TAG_BYTES);
  const ciphertext = bytes.subarray(IV_BYTES + TAG_BYTES);

  try {
    const decipher = createDecipheriv("aes-256-gcm", deriveKey(secret), iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([
      decipher.update(ciphertext),
      decipher.final(),
    ]).toString("utf8");
  } catch {
    // Wrong secret, flipped bit, truncated blob: all fail auth the
    // same way, and none of them may surface the key.
    return null;
  }
}

/** Last 4 characters of a key, for display ("…wXYZ") — never the key. */
export function keyLast4(key: string): string {
  const trimmed = key.trim();
  return trimmed.length <= 4 ? trimmed : trimmed.slice(-4);
}
