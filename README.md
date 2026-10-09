# ANVIX AI

A **multi-model AI application** — chat with different AI models through one unified interface, with workspaces, dashboards and generation tools.

**Live:** https://anvix-ai.vercel.app/

## Features

- **Chat** — conversational UI with reusable components, Markdown + GFM rendering
- **Workspaces** — organize chats and generations per workspace
- **Generate** — model-backed content generation flows
- **Dashboard** — usage and activity overview
- **Auth, settings, pricing** — full app shell (auth, per-user settings, pricing page)
- **PostgreSQL persistence** (`pg`) for app data

## Tech stack

Next.js 16 · React 19 · TypeScript · Tailwind CSS v4 · shadcn/ui · Framer Motion · Google Generative AI (`@google/generative-ai`) · PostgreSQL (`pg`) · lucide-react

## Getting started

```bash
npm install
npm run dev      # http://localhost:3000
npm run build    # production build
npm test         # node test suite
```

Set the required API keys / database URL in `.env.local` (see `.env.example` if present) before running.

## Project structure

```
app/
├── api/          # API routes
├── auth/         # authentication
├── chat/         # chat interface
├── dashboard/    # usage dashboard
├── generate/    # generation tools
├── pricing/      # pricing page
├── settings/     # user settings
└── workspace/    # workspaces
components/       # shared UI (shadcn-based)
features/         # feature modules (landing, …)
hooks/  lib/      # shared logic
```
