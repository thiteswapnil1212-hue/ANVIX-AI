/**
 * BYOK key management under the DESIGN.md §15 path (`/api/user-keys`).
 *
 * Alias only: the handlers live in `../byok/route.ts` (GET status,
 * POST save-after-verify, DELETE revoke) and are re-exported here
 * unchanged, so there is exactly one implementation. The Settings UI
 * calls `/api/byok`; this path exists for API consumers following the
 * Supabase design doc. Same behaviour, same auth, same responses —
 * keys are encrypted server-side and never returned.
 */
export { DELETE, GET, POST } from "../byok/route";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
