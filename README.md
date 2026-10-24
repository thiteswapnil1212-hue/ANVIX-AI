# ANVIX AI

**Turn ideas into working software.** Describe what you want in plain language, and ANVIX plans the architecture and generates the code — through one unified chat interface with switchable AI models.

**Live demo:** https://anvix-ai.vercel.app/

---

## What it is

ANVIX AI is an applied-AI platform for building software with large language models. Instead of locking you into a single provider, it gives you **one chat interface with switchable models**, staged generation workflows, workspaces to organize projects, and a dashboard to track activity.

The core idea is **prompt engineering as the product**: natural-language intent goes in, structured model-directed prompts turn it into architecture plans and working code.

## Features

### 💬 Multi-model chat — one interface, switchable models

Pick a model per conversation without leaving the chat. The model registry (`lib/chat-models.ts`) separates live models from scaffolded ones:

**Live now** (via Google Generative AI API):
- Gemini 2.5 Flash (default)
- Gemini 2.5 Flash-Lite
- Gemini 2.0 Flash

**Scaffolded in the UI** (visible but locked until their API keys are added):
- OpenAI: GPT-5.5, GPT-4.1, GPT-6 (Astra), GPT-4o
- DeepSeek Reasoner · xAI Grok / Grok Fast

Chat supports Markdown + GFM rendering and streaming responses (`/api/agent/stream`).

### 🛠️ Generation workflows

- **Generate** (`/generate`, `/api/generate`) — model-backed content generation flows.
- **Build pipeline** (`/api/build`) — from idea toward structured project output, with a model-fallback path covered by tests (`route.fallback.test.ts`).
- **Agent mode** (`/api/agent`) — task-oriented agent interactions, streamed over SSE.
- **Sandbox** (`/api/sandbox`) — sandboxed execution route.

### 📁 Workspaces & dashboard

- **Workspaces** — organize chats and generations per project.
- **Dashboard** — usage and activity overview.

### 🔐 Full app shell

Supabase authentication (email, Google, password reset) with per-user cloud sync for chats and generated projects — guest mode with browser-only storage when Supabase is not configured — plus per-user settings and a pricing page.

## How it works

```
You (natural language)
  → /api/chat · /api/generate · /api/build · /api/agent
    → model router (lib/chat-models.ts — live vs locked)
      → Google Generative AI (live models)
        → streamed Markdown response → workspace → PostgreSQL
```

`lib/gemini/fallback.ts` handles model fallback when the primary model fails.

## Tech stack

| Layer | Choice |
|---|---|
| Framework | Next.js 16 (App Router) · React 19 · TypeScript |
| Styling | Tailwind CSS v4 · shadcn/ui · Framer Motion · lucide-react |
| AI | `@google/generative-ai` (Gemini 2.5 / 2.0 Flash family) |
| Data | PostgreSQL via `pg` |
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
│   ├── agent/        # agent interactions (+ /stream for SSE streaming)
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
├── agent/            # agent logic
├── api/              # API helpers
├── chat-models.ts    # model registry (live vs locked) + tests
├── db/               # PostgreSQL layer (chat-db.ts)
├── gemini/           # Gemini client + fallback logic
├── project/          # project domain logic
├── sandbox/          # sandbox helpers
└── utils.ts
components/           # shared UI (shadcn-based)
hooks/                # React hooks
```

## Roadmap

- [ ] Unlock OpenAI, DeepSeek, and xAI providers (UI already scaffolded — needs keys + route wiring)
- [ ] Side-by-side multi-model comparison view
- [ ] Inspectable/editable prompt pipeline per generation stage
