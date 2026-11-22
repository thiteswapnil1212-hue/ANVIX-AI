# Google Calendar setup (owner steps)

The Calendar code ships now; the Google paperwork is the owner's job.
Nothing here registers an OAuth app or creates an account — do the steps
below in your own Google Cloud account.

## 1. Code + database (already done in this repo)

- Run the whole `supabase/schema.sql` in the Supabase SQL Editor. It
  creates the `google_connections` table (RLS: each user sees only their
  own row).
- Set these env vars on the deployment (Vercel → Settings →
  Environment Variables). Never commit them, never paste them in chat:

  | Var | Value |
  | --- | --- |
  | `GOOGLE_OAUTH_CLIENT_ID` | From step 2 below |
  | `GOOGLE_OAUTH_CLIENT_SECRET` | From step 2 below |
  | `GOOGLE_TOKEN_ENCRYPTION_KEY` | 32 random bytes, base64. Generate: `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"` |
  | `GOOGLE_OAUTH_REDIRECT_URI` | Optional. Only set this if the auto-derived one is wrong; it must match the Cloud Console entry exactly. Default: `<app origin>/api/integrations/google/callback` |
  | `SUPABASE_SERVICE_ROLE_KEY` | Optional. Without it, the OAuth callback stores tokens in a signed, httpOnly, 10-minute setup cookie and the Calendar page completes the save through an authed API call. With it, the callback writes the row directly. Either way works. |

- **Rotating `GOOGLE_TOKEN_ENCRYPTION_KEY` disconnects every user**
  (stored tokens can no longer be decrypted — the app treats them as
  "not connected" and users reconnect). Do not rotate it casually.

## 2. Google Cloud Console — create the OAuth client

1. Go to [Google Cloud Console](https://console.cloud.google.com/) →
   create a project (e.g. `anvix-ai`) → **APIs & Services → Library** →
   enable **Google Calendar API**.
2. **APIs & Services → OAuth consent screen**:
   - User type: **External**.
   - App name `ANVIX AI`, support email your email, app logo optional.
   - App domain / links: your deployed app URL; **Privacy policy** link
     must point at a real page (the app already has `/privacy` — use its
     full URL).
   - **Scopes → Add**: `.../auth/calendar.readonly` and
     `.../auth/calendar.events` — and nothing else. Do **not** add any
     Gmail scope: `gmail.readonly` / `modify` / `compose` / `metadata`
     are restricted and need a $500–$4,500/yr CASA security assessment.
     Gmail read is never built into ANVIX.
   - **Test users**: while the app is in Testing, add your own Google
     account (and any tester's) here — only test users can connect.
3. **APIs & Services → Credentials → Create Credentials → OAuth client
   ID → Web application**:
   - Authorized JavaScript origins: your app origin, e.g.
     `https://anvix-ai.vercel.app`.
   - Authorized redirect URI: `https://anvix-ai.vercel.app/api/integrations/google/callback`
     (replace the origin with your real one; it must match
     `GOOGLE_OAUTH_REDIRECT_URI` / the auto-derived origin exactly).
   - Copy the Client ID + Client Secret into the env vars above.

## 3. Verification — what to expect

- The Calendar scopes are **sensitive, not restricted**: OAuth
  verification is free and takes **3–6 weeks**. Google asks for a
  video demo of the consent flow + scope justification + the privacy
  policy page.
- **Verification is waived for personal use / dev testing**: while the
  OAuth app is in Testing mode (step 2), you and your listed test users
  can connect and use Calendar today, no verification needed. The
  "unverified app" warning screen appears for test users — that is
  normal in Testing mode.
- When you want the public to connect: **Publish App** on the consent
  screen, then submit for verification with:
  - a screen recording: sign in → Settings → Calendar → Connect →
    Google consent screen → today's events load;
  - a written justification for each scope ("read the user's events to
    answer 'what is on my calendar today'; create events when the user
    asks ANVIX to add one");
  - the privacy policy URL (state that refresh tokens are encrypted
    server-side, never shared, and deleted on disconnect).
- After verification, remove the test-users limit by keeping the app
  Published. If Google asks about data retention: tokens are deleted
  when the user disconnects (the route also revokes the token at
  Google); there is no Gmail data anywhere in the app.

## 4. How it works (for the demo video / your own notes)

- Sign in to ANVIX → Calendar page → **Connect Google Calendar** →
  Google consent → back to `/calendar?google_connected=1`.
- Tokens: the refresh token is AES-256-GCM encrypted
  (`lib/google/crypto.ts`) before it reaches Supabase; the access token
  (1 hour) is refreshed automatically when it expires.
- The agent can read/create events two ways: the Calendar page
  (day view, ask box, add-event form) and `POST /api/calendar/ask`
  ("What is on my calendar today?", "Add a dentist appointment
  tomorrow at 10am").
- Disconnect (Calendar page or Settings) deletes the stored tokens and
  revokes the refresh token at Google.

## 5. If Calendar shows "not available"

| Message | Cause |
| --- | --- |
| "Accounts are not connected on this deployment yet" | Supabase env vars missing — sign-in itself is unavailable. |
| "Calendar is not available on this deployment yet" | `GOOGLE_OAUTH_CLIENT_ID` / `GOOGLE_OAUTH_CLIENT_SECRET` (or the encryption key) not set. |
| "Google Calendar is not connected" (409 from the API) | Signed in, but never connected — use the Connect button. |
| Google "redirect_uri_mismatch" | The redirect URI in Cloud Console does not exactly match the app origin + `/api/integrations/google/callback`. |
| Google "access_blocked: This app's request is invalid" | The OAuth app is in Testing and the Google account is not in Test users. |
