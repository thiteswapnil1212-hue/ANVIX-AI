# ANVIX Web Agent

Give AGI a task in plain language — "find the top headlines on Hacker
News", "message X on LinkedIn" — and it plans the steps, opens a real
Chromium browser, does the task, and reports back in the chat.

## How it works

1. **Plan** — Gemini 2.5 Flash (the same verified-live model as the
   rest of ANVIX) turns your task into a short plan of at most 10
   browser steps: navigate, read_page, click, type, wait, screenshot,
   report. The plan is validated before anything runs.
2. **Run** — Playwright drives a real Chromium window, one step at a
   time, with a 30-second timeout per step. The browser is always
   closed when the task ends — even if it fails or you stop it.
3. **Approve** — steps that would click Send, submit a form, sign in,
   pay, or delete something pause the task and ask you first. Approve
   or Deny inline in the chat. Approvals expire after 2 minutes and are
   never auto-approved. Approved/denied decisions are recorded in the
   Approvals history panel.
4. **Report** — the chat shows each step as it runs, then a summary
   (including anything read from pages, like headings).

## Local-first — read this first

**The web agent does not run on the hosted deployment.** Playwright
needs a real Chromium binary and a persistent browser process, which
Vercel's serverless functions do not have. On `anvix-ai.vercel.app`,
`/api/web-agent` answers with an honest 503:

> "Web agent runs on your own computer — it is not available on the
> hosted deployment. Run ANVIX locally (npm run dev) to use browser tasks."

To use browser tasks, run ANVIX on your own computer:

```bash
npm install
npx playwright install chromium   # downloads the browser once (~150 MB)
npm run dev                        # http://localhost:3000
```

On Linux running as root (containers), Chromium also needs
`ANVIX_WEB_AGENT_NO_SANDBOX=1`.

## Login sessions

The browser uses a persistent profile folder
(`~/.anvix/web-agent-profile`, or `ANVIX_WEB_AGENT_PROFILE_DIR` to
override it), so cookies survive between tasks. To sign in somewhere
once, run a task with the visible browser:

```bash
ANVIX_WEB_AGENT_HEADED=1 npm run dev
```

Sign in in the window that opens. Later headless runs reuse that
session. Your passwords live only in that browser profile on your
machine — never in ANVIX, never in a commit, never in a log.

If a site shows a login wall or CAPTCHA, the agent reports it and
stops instead of trying to get past it.

## API keys — BYOK, no new key

The web agent uses the same `GEMINI_API_KEY` as the rest of ANVIX.
No new key is needed. Without it, tasks fail honestly with
"Gemini API key is not configured on the server."

## API

- `POST /api/web-agent` — `{ task, startUrl? }` → full result as JSON.
  Non-interactive: approval steps are auto-denied and the task stops.
  Rate limit: 5/minute per IP.
- `POST /api/web-agent/stream` — same, but an NDJSON stream of
  progress events (`web_task_start`, `planning`, `step_start`,
  `step_complete`, `approval_needed`, `task_complete`, `error`). The
  AGI chat uses this one. Rate limit: 5/minute per IP.
- `POST /api/web-agent/approve` — `{ runId, approvalId, decision:
  "allowed" | "denied" }` → resolves a pending approval (404 when
  unknown or expired). Rate limit: 30/minute per IP.

## Safety rules

- The planner can only emit the 7 browser tools. Shell, code
  execution, and password fields are rejected at validation time.
- Only public `http(s)` pages. Localhost, private networks, `file://`,
  and URLs with embedded credentials are blocked.
- No passwords, OTPs, or verification codes — the agent never asks
  for them and never types into a password field.
- One task, one browser, one user: runs are not shared between users.
  On a multi-user server each user still needs their own machine or
  VPS for browser tasks — that is the known scaling limit of this
  local-first design.

## What it cannot do yet

- See screenshots (the planner reads page text, not images).
- Run on the hosted Vercel deployment (see above).
- Log in for you, pass CAPTCHAs, or pay for anything.
