/**
 * AES-256-GCM encryption for per-user API keys (BYOK).
 *
 * MERGE POINT — read this when the BYOK builder lands: the BYOK work
 * owns the `user_api_keys` table (encrypted key per user, server-side
 * only). This helper is the shared crypto both lanes must use — the
 * BYOK builder should import these same functions instead of writing
 * its own, so a key encrypted by one lane decrypts in the other.
 * Until that table exists, `/api/compare` accepts a caller-supplied
 * key per request (used once, never stored or logged) or an
 * `encryptedKey` blob produced by `encryptUserKey` — the route
 * decrypts it with the same server key the BYOK table will use.
 *
 * The encryption key comes from `ANVIX_KEY_ENCRYPTION_KEY`: a
 * base64-encoded 32-byte key. It must be a server-only env var —
 * never `NEXT_PUBLIC_*`, never shipped to the browser, never logged.
 * Without it, encryption/decryption refuse to run (fail closed).
 *
 * Format: base64url( iv[12] || ciphertext || tag[16] ), one string,
 * safe to store in a text column.
 */

const IV_BYTES = 12;
const KEY_BYTES = 32;

function getCrypto(): Crypto {
  const cryptoObj = globalThis.crypto;
  if (!cryptoObj?.subtle) {
    throw new Error("WebCrypto is not available in this runtime.");
  }
  return cryptoObj;
}

function getEncryptionKeyBytes(): Uint8Array {
  const raw = process.env.ANVIX_KEY_ENCRYPTION_KEY;
  if (!raw) {
    throw new Error(
      "ANVIX_KEY_ENCRYPTION_KEY is not configured."
    );
  }

  let bytes: Uint8Array;
  try {
    bytes = Uint8Array.from(Buffer.from(raw, "base64"));
  } catch {
    throw new Error("ANVIX_KEY_ENCRYPTION_KEY is not valid base64.");
  }

  if (bytes.length !== KEY_BYTES) {
    throw new Error(
      "ANVIX_KEY_ENCRYPTION_KEY must be 32 bytes (base64)."
    );
  }

  return bytes;
}

async function importKey(): Promise<CryptoKey> {
  const cryptoObj = getCrypto();
  return cryptoObj.subtle.importKey(
    "raw",
    getEncryptionKeyBytes() as BufferSource,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

function toBase64Url(bytes: Uint8Array): string {
  return Buffer.from(bytes)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function fromBase64Url(value: string): Uint8Array {
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64.padEnd(
    base64.length + ((4 - (base64.length % 4)) % 4),
    "="
  );
  return Uint8Array.from(Buffer.from(padded, "base64"));
}

/** Encrypt a plaintext API key. Returns a single base64url blob. */
export async function encryptUserKey(plaintext: string): Promise<string> {
  if (!plaintext) throw new Error("Cannot encrypt an empty key.");

  const cryptoObj = getCrypto();
  const key = await importKey();
  const iv = cryptoObj.getRandomValues(new Uint8Array(IV_BYTES));
  const ciphertext = await cryptoObj.subtle.encrypt(
    { name: "AES-GCM", iv: iv as BufferSource },
    key,
    new TextEncoder().encode(plaintext)
  );

  const combined = new Uint8Array(iv.length + ciphertext.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(ciphertext), iv.length);
  return toBase64Url(combined);
}

/**
 * Decrypt a blob produced by `encryptUserKey`. Returns null (never
 * throws) when the blob is malformed or was encrypted under a
 * different key — callers treat null as "no usable key".
 */
export async function decryptUserKey(
  blob: string
): Promise<string | null> {
  try {
    const combined = fromBase64Url(blob);
    if (combined.length <= IV_BYTES + 16) return null;

    const iv = combined.slice(0, IV_BYTES);
    const ciphertext = combined.slice(IV_BYTES);
    const key = await importKey();
    const plaintext = await getCrypto().subtle.decrypt(
      { name: "AES-GCM", iv: iv as BufferSource },
      key,
      ciphertext as BufferSource
    );
    return new TextDecoder().decode(plaintext);
  } catch {
    return null;
  }
}

/** Test seam: is server-side key encryption configured? */
export function isKeyEncryptionConfigured(): boolean {
  try {
    getEncryptionKeyBytes();
    return true;
  } catch {
    return false;
  }
}
