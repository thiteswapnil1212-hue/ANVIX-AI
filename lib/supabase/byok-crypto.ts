/**
 * Canonical BYOK crypto location for the Supabase wiring
 * (DESIGN.md §7/§15.2).
 *
 * The implementation lives in `@/lib/byok/crypto.ts` (AES-256-GCM,
 * envelope `base64(iv || authTag || ciphertext)`, key from the
 * server-only `BYOK_ENCRYPTION_KEY` env var) — this module only
 * re-exports it so Supabase-related code has one obvious import
 * path and the encryption logic is never implemented twice.
 * Server-only: `node:crypto`, never import from the browser.
 */
export {
  decryptApiKey,
  encryptApiKey,
  getByokEncryptionSecret,
  isByokEncryptionConfigured,
  keyLast4,
} from "../byok/crypto";
