# ANVIX AI

**Turn ideas into working software.** Describe what you want in plain language, and ANVIX plans the architecture and generates the code — powered by Google's Gemini 2.5 Flash.

**Live demo:** https://anvix-ai.vercel.app/

---

## What it is

ANVIX AI is an applied-AI platform for building software with large language models. It gives you **one chat interface**, staged generation workflows, workspaces to organize projects, and a dashboard to track activity.

The core idea is **prompt engineering as the product**: natural-language intent goes in, structured model-directed prompts turn it into architecture plans and working code.

## Features

### 💬 Chat — one live model

Chat runs on a single verified-live model, **Gemini 2.5 Flash**, via the Google Generative AI API. The model registry (`lib/chat-models.ts`) keeps other providers visible but locked until their API keys and route wiring exist:

**Scaffolded in the UI** (visible but locked until their API keys are added):
- OpenAI: GPT-5.5, GPT-4.1, GPT-6 (Astra), GPT-4o
- DeepSeek Reasoner · xAI Grok / Grok Fast

Retired models are not offered: Gemini 2.5 Flash-Lite and Gemini 2.0 Flash return 404 ("no longer available") and Gemini 3.8 Flash hangs via this SDK — all verified live in October 2026 and removed from the picker and every model chain. A second live model will be added only after it is verified answering on this API.

Chat supports Markdown + GFM rendering and streaming responses (`/api/chat`).

### 🛠️ Generation workflows

- **Generate** (`/generate`) — describe an app and watch its files arrive one by one over SSE (`/api/build/stream`), with the classic one-shot endpoint (`/api/build`) as a fallback. Every project passes deterministic validation (broken JSON, duplicate paths, missing imports); a one-pass auto-fix repairs what it can, and repairable JSON comma mistakes are fixed deterministically before the project ships.
- **Workspace agent** (`/api/agent`, `/api/agent/stream`) — ask for edits in plain language; the agent's plan is validated, applied to the project in the workspace, and can be undone/redone. Edits that fail validation are retried, and quota/availability failures surface as honest 503s instead of misleading errors.
- **Sandbox** (`/api/sandbox`) — sandboxed execution route. It honestly reports "not available in this environment" on hosted deployments (it needs local Docker) and is not reachable from the UI.

### 📁 Workspaces & dashboard

- **Workspaces** — edit generated code, ask the agent for changes (with undo/redo), and export the whole project as a ZIP file.
- **Dashboard** — cloud projects when signed in, local projects in guest mode.

### 🔐 Full app shell

Supabase authentication (email, Google, password reset) with per-user cloud sync for chats and generated projects — guest mode with browser-only storage when Supabase is not configured — plus per-user settings and a pricing page.

## How it works

```
You (natural language)
  → /api/chat · /api/generate · /api/build(+/stream) · /api/agent(+/stream)
    → Gemini 2.5 Flash (Google Generative AI, the only verified-live model)
      → streamed response → workspace → Supabase (signed in) / browser storage (guest)
```

`lib/gemini/fallback.ts` retries the model on retryable failures. There is no second model in the chain today — the other candidates were retired or hang on this API (see the chat section above).

## Tech stack

| Layer | Choice |
|---|---|
| Framework | Next.js 16 (App Router) · React 19 · TypeScript |
| Styling | Tailwind CSS v4 · shadcn/ui · Framer Motion · lucide-react |
| AI | `@google/generative-ai` (Gemini 2.5 Flash — the only verified-live model) |
| Data | Supabase (accounts + cloud sync) · browser localStorage (guest mode) |
| Tests | Node test runner (`node --test`) · `chat-models.test.ts` · `route.fallback.test.ts` |

## Getting started

```bash
npm install
npm run dev      # http://localhost:3000
npm run build    # production build
npm test         # node test suite
npm run lint     # eslint
```

Create `.env.local` before running. Verified variable:

```bash
# Google Generative AI key (required for chat + generation)
GEMINI_API_KEY=...

# Optional — enables accounts + cloud sync (without these, guest mode):
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

Accounts are optional: to enable Supabase auth + cloud sync, add `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` to `.env.local`, run `supabase/schema.sql` once in the Supabase SQL editor (profiles, conversations, messages, projects with row-level security), and add your deployment URL under Authentication → URL Configuration in the Supabase dashboard.

## Project structure

```
app/
├── api/
│   ├── agent/        # agent interactions (+ /stream for SSE streaming, returns the edited project)
│   ├── build/        # build pipeline (with fallback + tests)
│   ├── chat/         # chat completions
│   ├── generate/     # generation flows
│   └── sandbox/      # sandboxed execution
├── auth/             # authentication pages
├── chat/             # chat UI
├── dashboard/        # usage dashboard
├── generate/         # generation UI
├── pricing/          # pricing page
├── settings/         # per-user settings
└── workspace/        # workspaces
lib/
├── agent/            # agent logic (plan validation, edit tools, undo history)
├── api/              # API helpers
├── chat-models.ts    # model registry (live vs locked) + tests
├── gemini/           # Gemini client, streaming generation, auto-fix
├── project/          # project domain logic (validation, JSON repair, ZIP export)
├── sandbox/          # sandbox helpers
└── utils.ts
components/           # shared UI (shadcn-based)
hooks/                # React hooks
```

## Roadmap

- [ ] Unlock OpenAI, DeepSeek, and xAI providers (UI already scaffolded — needs keys + route wiring)
- [ ] A second verified-live Gemini model in the chains (only after it answers on this API)
- [ ] Runnable in-browser preview for generated projects (today the preview is a placeholder)
- [ ] Side-by-side multi-model comparison view
- [ ] Inspectable/editable prompt pipeline per generation stage
