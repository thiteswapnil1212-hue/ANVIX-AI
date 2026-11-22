# ANVIX notifications — PWA, Web Push, Telegram, email

Setup guide for everything in `lib/notify/`, `app/api/push/`,
`app/api/notifications/`, and `app/api/telegram/webhook/`. Nothing here
needs a card. Every feature degrades honestly when its env vars are
missing — the Settings UI says "not configured", it never pretends to
work.

## 1. PWA (no setup)

- Manifest: `app/manifest.ts` (installable, standalone, icons
  `/icon-192.png` + `/icon-512.png` in `public/`).
- Service worker: Serwist via `@serwist/turbopack` (Next 16's default
  builder is Turbopack; `@serwist/next` is the webpack plugin and cannot
  run on it — it is installed because the brief asked for both, but only
  the Turbopack package is wired in). Source `app/sw.ts`, compiled by
  esbuild inside the `app/serwist/[path]/route.ts` route handler and
  served at `/serwist/sw.js`; `components/PwaRegister.tsx` registers it
  with scope `/`. The old hand-written `public/sw.js` is deleted —
  registering the new worker under the same scope replaces it.
- "Install ANVIX": `components/pwa/InstallPrompt.tsx` (Settings →
  Notifications). Shows only when the browser fires
  `beforeinstallprompt`; on iOS it explains Share → Add to Home Screen.

### Caching strategy (the part that can hurt)

- **Precache:** icons + logo only (7 entries, ~78 KiB). The default
  Serwist glob would precache all of `public/` including the 11 MB
  background video — the glob in the route is deliberately narrow.
- **`/_next/static/*`:** CacheFirst. Files are content-hashed, so a
  cached copy can never be stale.
- **Same-origin images/fonts:** StaleWhileRevalidate.
- **`/api/*`:** NetworkOnly, always. API responses are never cached.
- **Navigations (pages + RSC):** no route is registered — they go
  straight to the network. ANVIX pages are per-user and change every
  deploy; caching them would serve a stale app shell. Offline page
  loads therefore show the browser's offline page. That is the honest
  trade-off.

## 2. Web Push (VAPID)

```bash
npx web-push generate-vapid-keys
```

Set in Vercel (never in code):

```bash
VAPID_PUBLIC_KEY=<public key>
VAPID_PRIVATE_KEY=<private key>
VAPID_SUBJECT=https://anvix-ai.vercel.app   # or a mailto: address
```

Then run `supabase/notifications.sql` in the Supabase SQL editor (it
creates `push_subscriptions` + the Telegram tables below). Without the
table, subscribe/send answer 503 with a setup hint instead of a 500.

Flow: Settings → Push notifications → Enable (browser permission +
subscription) → Send test notification. `POST /api/push/send` sends to
the caller's own subscriptions only; the shared helper
`sendPushToUser()` in `lib/notify/web-push.ts` is what future
task-result / Daily Question senders should call. Endpoints that answer
404/410 are deleted automatically. Push payloads must use a same-origin
`url` — the validator rejects external URLs.

## 3. Telegram

1. Create a bot with @BotFather, copy the token.
2. Set in Vercel:

```bash
TELEGRAM_BOT_TOKEN=<token from @BotFather>
TELEGRAM_BOT_USERNAME=<bot username, no @>   # optional, enables the one-tap link
TELEGRAM_WEBHOOK_SECRET=<random string>      # optional but recommended
```

3. Run `supabase/notifications.sql` (creates `telegram_links`,
   `telegram_link_codes`, and the `link_telegram_account()` /
   `unlink_telegram_account()` SECURITY DEFINER functions — the webhook
   has no user token, so linking goes through those RPCs, never through
   a service-role key).
4. Point the bot at the webhook (once, from anywhere):

```bash
curl -X POST "https://api.telegram.org/bot<token>/setWebhook" \
  -H "Content-Type: application/json" \
  -d '{"url": "https://<site>/api/telegram/webhook", "secret_token": "<TELEGRAM_WEBHOOK_SECRET>"}'
```

Flow: Settings → Telegram → Get link code (8 chars, 10 minutes) →
open the bot, send `/start <code>` → linked. `/unlink` in Telegram (or
Unlink in Settings) removes the link.

Limits respected: ~1 message/second per chat (per-chat throttle in
`lib/notify/telegram.ts`), 4,096 chars/message (auto-chunked on
newlines). A 429 surfaces its `retry_after`; a 403 means the bot was
blocked. WhatsApp is deliberately not offered — its Business API is
paid per message.

## 4. Email (Resend)

Set in Vercel:

```bash
RESEND_API_KEY=<key from resend.com>
RESEND_FROM=ANVIX <hello@your-verified-domain>   # optional
```

Free tier: 3,000/month, hard-capped at 100/day, no card, no overage.
The code adds a 90/day in-memory guard so one burst cannot burn the
whole day. Default sender (no `RESEND_FROM`) is Resend's onboarding
address, which only delivers to the Resend account owner's own email
until a domain is verified — set `RESEND_FROM` with a verified domain
before expecting mail to reach other users.

Flow: Settings → Email → Send welcome/digest sample (sent to the
signed-in user's own profile email; the route never takes a recipient
from the request body). The `welcome` / `reset` / `digest` builders in
`lib/notify/email.ts` are what auth flows should call; the reset mail
takes its URL from the caller.

## 5. What is NOT wired up yet (deliberate)

- No scheduled-task or Daily Question sender calls `sendPushToUser` /
  `sendTelegramToUser` yet — those features do not exist in this base.
  The helpers are the seam; a sender just needs a user id and text.
- No password-reset route calls the Resend reset mail yet — Supabase
  auth email still handles resets until that flow is built.
- The daily email guard is per server instance (in-memory), like the
  rate limiter in `lib/rate-limit.ts`. Fine at this scale; move to
  Redis/Upstash if ANVIX ever runs multi-instance.
