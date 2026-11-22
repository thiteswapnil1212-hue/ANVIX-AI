# Integrations — MCP + Gemini Live (notes)

Short notes for the two integrations whose setup is mostly code, not
paperwork. Google Calendar has its own doc
(`docs/google-calendar-setup.md`); the public API has
(`docs/public-api.md`).

## ANVIX as an MCP server — POST /api/mcp

Stateless Streamable HTTP (MCP spec 2026-07-28, `@modelcontextprotocol/sdk`
v1.x). One server instance per request, no session store — this is what
fits a Vercel serverless function.

- Auth (required, per user): `Authorization: Bearer <supabase access
  token>` or `X-API-Key: anvix_live_...`. Unauthenticated requests get
  401, never a protocol error.
- `GET /api/mcp` returns a plain-JSON description for humans.
- Tools:
  - `anvix_chat` — ask ANVIX anything (one Gemini call, shared quota).
  - `anvix_calendar_today` — today's events from the caller's connected
    Google Calendar. Needs a Supabase session; API-key callers get an
    honest "not connected" (their Google connection lives under the
    user's login).
  - `anvix_calendar_create` — add an event to the caller's calendar.
- Rate limit: 20 requests/minute per user (MCP calls burn the same
  shared Gemini key as chat).
- Client config (Claude Code / Cursor / VS Code MCP settings):
  ```json
  {
    "mcpServers": {
      "anvix": {
        "url": "https://<your-app>/api/mcp",
        "headers": {
          "Authorization": "Bearer <supabase-access-token>"
        }
      }
    }
  }
  ```
  A Supabase access token expires (default 1 hour) — for long-lived
  MCP use, create an ANVIX API key (`docs/public-api.md`) and send it
  as `X-API-Key` instead. API-key callers can use `anvix_chat`; the
  calendar tools need a signed-in session.

## ANVIX as an MCP client — POST /api/mcp/client/tools

The agent loop can ask a remote MCP server what tools it offers.

- Body: `{ "serverUrl"?: string, "githubToken"?: string }`. `serverUrl`
  defaults to GitHub's MCP server (`https://api.githubcopilot.com/mcp/`).
- Only `api.githubcopilot.com` is allow-listed — ANVIX will not proxy
  tokens to arbitrary servers. The GitHub token is forwarded to GitHub
  only, for that one request, and is never stored or logged.
- Signed-in users only; 10 requests/minute.
- This lists tools only; calling a remote tool from the agent loop is
  not wired in yet (deliberate — the first outside tool is worth
  listing before it is worth executing).

## Gemini Live (voice chat, beta)

- Button: **Voice chat (beta)** on the chat page (empty state).
- Flow: the button fetches a one-use ephemeral token from
  `POST /api/live/token` (signed-in users only, 10 tokens/hour), then
  connects directly to the Live API with `@google/genai` v3
  (`live.connect`, v1alpha). The app's real `GEMINI_API_KEY` never
  reaches the browser.
- Models: `gemini-3.8-live` first, `gemini-3.1-flash-live-preview` as
  the fallback (the client mints a second token and retries once). The
  token is locked to the requested model, audio-only, single use.
- Session cap: **15 minutes** (Google's audio-session limit). A visible
  timer counts down and the session stops itself at zero.
- **Verification status: NOT verified end-to-end.** No live Gemini call
  is made in this repo's verification (no key is used in tests). The
  token route's config is unit-tested; the SDK surface (`authTokens.create`,
  `live.connect`, `sendRealtimeInput`) was checked against the installed
  `@google/genai` 3.6.1 typings, and two real SDK mismatches were found
  and fixed that way (`ai.tokens` is actually `ai.authTokens`;
  `responseModalities` needs the `Modality.AUDIO` enum, not the string
  `"AUDIO"`). The remaining unknowns are runtime-only: whether
  `gemini-3.8-live` is available for the app's key (the fallback covers
  it), and whether v1alpha ephemeral tokens still mint on this key.
  First live test: sign in, open chat, tap Voice chat (beta), speak,
  and confirm you hear a reply. If both models fail, the button says so
  in plain words instead of pretending to listen.
