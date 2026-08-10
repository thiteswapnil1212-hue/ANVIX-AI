"use client";

import { useState } from "react";
import { Menu, X } from "lucide-react";
import ChatSidebar from "./ChatSidebar";
import MessageList from "./MessageList";
import ChatInput from "./ChatInput";
import AppShell from "@/components/layout/AppShell";

export default function ChatLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <AppShell>
      <div className="relative flex h-[calc(100vh-0px)] min-h-0 overflow-hidden bg-[#09090B] text-[#E5E1E4]">
        {/* Chat history sidebar */}
        <aside className="hidden w-[240px] shrink-0 border-r border-[#3F3F46] bg-[#18181B] md:flex">
          <ChatSidebar />
        </aside>

        {sidebarOpen ? (
          <div className="fixed inset-0 z-50 flex md:hidden">
            <div
              className="absolute inset-0 bg-black/50"
              onClick={() => setSidebarOpen(false)}
            />
            <div className="relative z-10 h-full w-72 border-r border-[#3F3F46] bg-[#18181B]">
              <div className="flex items-center justify-between px-4 py-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-[#3F3F46] bg-[#0F0F10] text-[#D4AF37]">
                    A
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white">ANVIX AI</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSidebarOpen(false)}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-zinc-700 text-zinc-300 transition hover:border-zinc-500 hover:text-white"
                  aria-label="Close sidebar"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <ChatSidebar />
            </div>
          </div>
        ) : null}

        {/* Main chat area */}
        <main className="relative flex min-w-0 flex-1 flex-col overflow-hidden">
          <div className="flex items-center justify-between border-b border-[#3F3F46] px-4 py-3 md:hidden">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-[#3F3F46] bg-[#18181B] text-[#D4AF37]">
                A
              </div>
              <div>
                <p className="text-sm font-semibold text-white">ANVIX AI</p>
                <p className="text-xs text-zinc-500">Expert Partner</p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-zinc-700 text-zinc-300 transition hover:border-zinc-500 hover:text-white"
              aria-label="Open sidebar"
            >
              <Menu className="h-5 w-5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-4 py-8 sm:px-6 lg:px-8">
            <div className="mx-auto flex w-full max-w-4xl flex-col items-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-[#3F3F46] bg-[#18181B] text-[#D4AF37]">
                A
              </div>

              <div className="mt-8 text-center">
                <p className="text-base font-semibold uppercase tracking-[0.35em] text-[#D4AF37]">
                  ANVIX AI
                </p>
                <h1 className="mt-5 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
                  How can I help you today?
                </h1>
                <p className="mx-auto mt-3 max-w-2xl text-sm leading-7 text-zinc-500 sm:text-base">
                  Your expert partner for code, research, and technical analysis.
                </p>
              </div>

              <div className="mt-12 w-full">
                <MessageList />
              </div>
            </div>
          </div>

          <div className="border-t border-[#3F3F46] bg-[#09090B] px-4 py-5 sm:px-6">
            <div className="mx-auto w-full max-w-3xl">
              <ChatInput />
              <p className="mt-3 text-center text-[11px] leading-6 text-zinc-500">
                ANVIX AI can make mistakes. Verify important information.
              </p>
            </div>
          </div>
        </main>
      </div>
    </AppShell>
  );
}