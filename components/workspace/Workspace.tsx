"use client";

import {
  Bot,
  ChevronDown,
  Code2,
  Eye,
  Folder,
  GitBranch,
  MoreHorizontal,
  Play,
  Rocket,
  Sparkles,
  Terminal,
} from "lucide-react";

import FileExplorer from "./FileExplorer";
import CodePreview from "./CodePreview";

interface WorkspaceProps {
  projectName?: string;
}

export default function Workspace({
  projectName = "Untitled Project",
}: WorkspaceProps) {
  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-2xl border border-zinc-800/80 bg-[#0B0B0D] text-white">

      {/* =========================================================
          TOP BAR
      ========================================================= */}

      <header className="flex h-14 shrink-0 items-center justify-between border-b border-zinc-800/80 bg-[#0F0F11] px-4">

        <div className="flex min-w-0 items-center gap-3">

          {/* Project */}
          <div className="flex min-w-0 items-center gap-2">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[#D4AF37]/15 bg-[#D4AF37]/[0.06]">
              <Sparkles
                className="h-4 w-4 text-[#D4AF37]"
                strokeWidth={1.8}
              />
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <h1 className="truncate text-xs font-semibold text-zinc-200">
                  {projectName}
                </h1>

                <ChevronDown className="h-3 w-3 text-zinc-600" />
              </div>

              <p className="text-[9px] text-zinc-600">
                ANVIX Workspace
              </p>
            </div>
          </div>

          <div className="hidden h-5 w-px bg-zinc-800 sm:block" />

          {/* Status */}
          <div className="hidden items-center gap-2 rounded-full border border-zinc-800 bg-[#0B0B0D] px-2.5 py-1 sm:flex">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />

            <span className="text-[9px] font-medium text-zinc-500">
              Ready
            </span>
          </div>
        </div>

        {/* Top actions */}
        <div className="flex items-center gap-1.5">

          <button
            type="button"
            className="hidden items-center gap-1.5 rounded-lg border border-zinc-800 bg-[#0B0B0D] px-3 py-2 text-[10px] font-medium text-zinc-400 transition hover:border-zinc-700 hover:text-zinc-200 sm:flex"
          >
            <GitBranch className="h-3 w-3" />
            main
          </button>

          <button
            type="button"
            className="flex items-center gap-1.5 rounded-lg border border-zinc-800 bg-[#0B0B0D] px-3 py-2 text-[10px] font-medium text-zinc-400 transition hover:border-zinc-700 hover:text-zinc-200"
          >
            <Play className="h-3 w-3" />
            <span className="hidden sm:inline">
              Run
            </span>
          </button>

          <button
            type="button"
            className="flex items-center gap-1.5 rounded-lg bg-[#D4AF37] px-3 py-2 text-[10px] font-semibold text-black transition hover:bg-[#E2C259]"
          >
            <Rocket className="h-3 w-3" />
            <span className="hidden sm:inline">
              Deploy
            </span>
          </button>

          <button
            type="button"
            aria-label="More options"
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-800 text-zinc-500 transition hover:border-zinc-700 hover:text-zinc-300"
          >
            <MoreHorizontal className="h-4 w-4" />
          </button>
        </div>
      </header>

      {/* =========================================================
          WORKSPACE BODY
      ========================================================= */}

      <div className="flex min-h-0 flex-1 overflow-hidden">

        {/* =======================================================
            LEFT SIDEBAR
        ======================================================= */}

        <aside className="hidden w-[220px] shrink-0 border-r border-zinc-800/80 bg-[#0D0D0F] lg:flex lg:flex-col">

          {/* Explorer header */}
          <div className="flex h-11 shrink-0 items-center justify-between border-b border-zinc-800/60 px-3">
            <div className="flex items-center gap-2">
              <Folder className="h-3.5 w-3.5 text-zinc-500" />

              <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
                Explorer
              </span>
            </div>

            <button
              type="button"
              aria-label="Explorer options"
              className="rounded p-1 text-zinc-600 transition hover:text-zinc-300"
            >
              <MoreHorizontal className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* File explorer */}
          <div className="min-h-0 flex-1 overflow-hidden">
            <FileExplorer />
          </div>

          {/* Sidebar bottom */}
          <div className="shrink-0 border-t border-zinc-800/60 p-3">
            <div className="flex items-center gap-2 rounded-lg border border-zinc-800/70 bg-[#0B0B0D] px-2.5 py-2">
              <Code2 className="h-3.5 w-3.5 text-[#D4AF37]" />

              <div className="min-w-0">
                <p className="truncate text-[9px] font-medium text-zinc-400">
                  Next.js
                </p>

                <p className="text-[8px] text-zinc-700">
                  Application
                </p>
              </div>
            </div>
          </div>
        </aside>

        {/* =======================================================
            MAIN AREA
        ======================================================= */}

        <main className="flex min-w-0 flex-1 flex-col overflow-hidden">

          {/* Editor / Preview toolbar */}
          <div className="flex h-11 shrink-0 items-center justify-between border-b border-zinc-800/70 bg-[#0F0F11] px-3">

            <div className="flex items-center gap-1">

              <button
                type="button"
                className="flex items-center gap-2 rounded-lg bg-[#D4AF37]/[0.07] px-3 py-1.5 text-[10px] font-medium text-[#D4AF37]"
              >
                <Code2 className="h-3 w-3" />
                Code
              </button>

              <button
                type="button"
                className="flex items-center gap-2 rounded-lg px-3 py-1.5 text-[10px] font-medium text-zinc-600 transition hover:text-zinc-300"
              >
                <Eye className="h-3 w-3" />
                Preview
              </button>
            </div>

            <div className="hidden items-center gap-3 sm:flex">
              <div className="flex items-center gap-1.5 text-[9px] text-zinc-600">
                <Terminal className="h-3 w-3" />
                Console
              </div>

              <div className="h-3 w-px bg-zinc-800" />

              <span className="text-[9px] text-zinc-700">
                Ready
              </span>
            </div>
          </div>

          {/* Code / Preview */}
          <div className="min-h-0 flex-1 overflow-hidden">
            <CodePreview />
          </div>

          {/* =====================================================
              AI COMMAND BAR
          ===================================================== */}

          <div className="shrink-0 border-t border-zinc-800/80 bg-[#0D0D0F] p-3">

            <div className="rounded-xl border border-zinc-800 bg-[#0B0B0D] transition focus-within:border-[#D4AF37]/25">

              <div className="flex items-end gap-2 px-3 py-2.5">

                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-[#D4AF37]/15 bg-[#D4AF37]/[0.06]">
                  <Bot
                    className="h-3.5 w-3.5 text-[#D4AF37]"
                    strokeWidth={1.8}
                  />
                </div>

                <textarea
                  rows={1}
                  placeholder="Ask ANVIX to change or improve your app..."
                  className="min-h-7 flex-1 resize-none bg-transparent py-1 text-[11px] leading-5 text-zinc-200 outline-none placeholder:text-zinc-700"
                />

                <button
                  type="button"
                  aria-label="Send AI request"
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#D4AF37] text-black transition hover:bg-[#E2C259]"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                </button>
              </div>

              <div className="flex items-center justify-between border-t border-zinc-800/60 px-3 py-1.5">

                <span className="text-[8px] text-zinc-700">
                  Describe a change in natural language
                </span>

                <div className="hidden items-center gap-1.5 sm:flex">
                  <kbd className="rounded border border-zinc-800 px-1.5 py-0.5 text-[8px] text-zinc-700">
                    Enter
                  </kbd>

                  <span className="text-[8px] text-zinc-800">
                    to send
                  </span>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}