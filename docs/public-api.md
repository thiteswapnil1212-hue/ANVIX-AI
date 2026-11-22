# ANVIX Public API (v1)

Call ANVIX from your own scripts and apps. One endpoint for now: chat.
Everything here draws on the app's **shared Gemini key** until BYOK
(bring your own Gemini key) lands — so the limits below are strict on
purpose. If a limit bites, that is the quota protection working, not a bug.

## Setup (owner, once)

1. Run the whole `supabase/schema.sql` in the Supabase SQL Editor — it
   creates the `api_keys` table plus the `verify_api_key` /
   `touch_api_key` SECURITY DEFINER functions the verification path needs.
   If the SQL was never run, every key is rejected (fail closed).
2. No extra env vars are needed for keys themselves. The chat endpoint
   needs the existing `GEMINI_API_KEY`.

## Keys — create, list, revoke

Keys are managed with your signed-in ANVIX account (send your Supabase
access token as `Authorization: Bearer <token>`, e.g. via
`getAuthHeaders()` in the app, or any Supabase client session).

```bash
# Create — the plaintext key is returned ONCE. Save it; ANVIX cannot show it again.
curl -X POST https://<your-app>/api/v1/keys \
  -H "Authorization: Bearer <supabase-access-token>" \
  -H "Content-Type: application/json" \
  -d '{"name": "My script"}'
# -> {"key":"anvix_live_...","id":"...","name":"My script","scopes":["chat"],
#     "rateLimitPerMin":30,"dailyCap":100,
#     "warning":"Save this key now — it is shown only once and cannot be recovered."}

# List your keys (prefixes only, never hashes)
curl https://<your-app>/api/v1/keys \
  -H "Authorization: Bearer <supabase-access-token>"

# Revoke one (takes effect immediately)
curl -X POST https://<your-app>/api/v1/keys/<id>/revoke \
  -H "Authorization: Bearer <supabase-access-token>"
```

Only the SHA-256 hash of a key is stored. A leaked database reveals no
usable key, and a revoked key stops working at once.

## POST /api/v1/chat

```bash
curl -X POST https://<your-app>/api/v1/chat \
  -H "X-API-Key: anvix_live_..." \
  -H "Content-Type: application/json" \
  -d '{"prompt": "Explain recursion in one paragraph."}'
# -> {"reply": "...", "model": "gemini-3.5-flash-lite"}
```

- Auth: `X-API-Key: anvix_live_...` (or `Authorization: Bearer
  anvix_live_...`). A Supabase JWT is **not** accepted here.
- Body: `{ "prompt": string }`, max 8,000 characters.
- Errors: `401` missing/invalid/revoked key, `403` key lacks the `chat`
  scope, `429` rate limit (with `Retry-After`), `503` the AI service is
  busy or unconfigured.

## Rate limits (why they are what they are)

| Limit | Value |
| --- | --- |
| Per key, per minute | 30 requests |
| Per key, per day | 100 requests (hard cap) |
| Whole public API, per day | 500 requests (hard ceiling) |

Every external call burns the same tiny shared Gemini free-tier quota
as the in-app chat. Without these caps, one script could take the whole
app offline for the day. Counters are in-memory per server instance
(same caveat as the in-app limiter in `lib/rate-limit.ts`): they stop
the realistic abuse case, they are not billing-grade metering. If ANVIX
grows past one instance, move the counters to Upstash/Redis behind the
same interface.

## BYOK tie-in (when it lands)

BYOK (bring your own Gemini key, research report §1) is **not** in this
codebase yet — another builder owns it. When it lands, the intended
change is small and is documented here so it is not forgotten:

1. Add an `owner_gemini_key` reference to the `api_keys` row (or reuse
   the BYOK `user_api_keys` table): an API key may point at its owner's
   own Gemini key.
2. `/api/v1/chat` then calls Gemini with the owner's key when one is
   set, and falls back to the shared key otherwise.
3. With the owner's key carrying the quota, the per-key daily cap can be
   raised (or removed) for keys that have a BYOK key attached; keys
   without one keep the strict caps above.
4. Until then, do **not** raise the caps — the shared key is the binding
   constraint.

## What is NOT here (on purpose)

- No usage metering dashboard, no billing, no paid tiers. Monetization
  is explicitly out of scope (Vercel Hobby is non-commercial; Razorpay
  needs Pro + business KYC — research report §24).
- No other scopes yet. `chat` is the only scope; future scopes (e.g.
  `calendar:read`) would be added to `api_keys.scopes` and checked in
  each route the same way `/api/v1/chat` checks `chat`.
