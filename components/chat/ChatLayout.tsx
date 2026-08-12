"use client";

import { useState } from "react";
import Image from "next/image";
import { Menu, X } from "lucide-react";
import ChatSidebar from "./ChatSidebar";
import MessageList from "./MessageList";
import ChatInput from "./ChatInput";
import AppShell from "@/components/layout/AppShell";

export default function ChatLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <AppShell>
      <div className="flex h-full min-h-0 w-full overflow-hidden bg-[#09090B]">
        {/* Desktop Sidebar */}
        <aside className="hidden h-full w-64 shrink-0 overflow-hidden border-r border-[#3F3F46] bg-[#18181B] md:flex md:flex-col">
          <ChatSidebar />
        </aside>

        {/* Mobile Sidebar */}
        {sidebarOpen && (
          <div className="fixed inset-0 z-50 md:hidden">
            <div
              className="absolute inset-0 bg-black/60"
              onClick={() => setSidebarOpen(false)}
            />

            <aside className="relative z-10 flex h-full w-72 flex-col overflow-hidden border-r border-[#3F3F46] bg-[#18181B]">
              {/* Mobile Sidebar Header */}
              <div className="flex shrink-0 items-center justify-between border-b border-[#3F3F46] px-4 py-4">
                <div className="flex items-center gap-3">
                  <Image
                    src="/logo.png"
                    alt="ANVIX AI Logo"
                    width={40}
                    height={40}
                    className="h-10 w-10 object-contain"
                  />

                  <div>
                    <p className="text-sm font-semibold text-white">
                      ANVIX AI
                    </p>

                    <p className="text-xs text-zinc-500">
                      Expert Partner
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setSidebarOpen(false)}
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-zinc-700 text-zinc-400 transition hover:text-white"
                  aria-label="Close sidebar"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="min-h-0 flex-1 overflow-hidden">
                <ChatSidebar />
              </div>
            </aside>
          </div>
        )}

        {/* Main Chat */}
        <main className="relative flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-[#09090B]">
          {/* Background Video */}
          <video
            autoPlay
            loop
            muted
            playsInline
            preload="auto"
            className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-50"
          >
            <source src="/anvix-bg.mp4" type="video/mp4" />
          </video>

          {/* Transparent Overlay */}
          <div className="pointer-events-none absolute inset-0 bg-[#09090B]/15" />

          {/* Chat Content
              overflow-visible is important so the model dropdown
              can escape the composer area. */}
          <div className="relative z-10 flex min-h-0 flex-1 flex-col overflow-visible">
            {/* Mobile Header */}
            <header className="flex h-16 shrink-0 items-center justify-between border-b border-[#3F3F46] bg-[#09090B]/60 px-4 backdrop-blur-sm md:hidden">
              <div className="flex items-center gap-3">
                <Image
                  src="/logo.png"
                  alt="ANVIX AI Logo"
                  width={40}
                  height={40}
                  className="h-10 w-10 object-contain"
                />

                <div>
                  <p className="text-sm font-semibold text-white">
                    ANVIX AI
                  </p>

                  <p className="text-xs text-zinc-500">
                    Expert Partner
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSidebarOpen(true)}
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-zinc-700 text-zinc-400 transition hover:text-white"
                aria-label="Open sidebar"
              >
                <Menu className="h-5 w-5" />
              </button>
            </header>

            {/* ONLY CHAT CONTENT SCROLLS */}
            <div className="min-h-0 flex-1 overflow-y-auto">
              <div className="mx-auto flex min-h-full w-full max-w-5xl flex-col items-center px-4 py-10 sm:px-6 lg:px-8">
                {/* ANVIX Logo */}
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-[#3F3F46] bg-[#18181B]/80">
                  <Image
                    src="/logo.png"
                    alt="ANVIX AI"
                    width={64}
                    height={64}
                    className="h-full w-full rounded-2xl object-contain"
                    priority
                  />
                </div>

                {/* Welcome */}
                <div className="mt-8 text-center">
                  <p className="text-sm font-semibold uppercase tracking-[0.4em] text-[#D4AF37]">
                    ANVIX AI
                  </p>

                  <h1 className="mt-5 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
                    How can I help you today?
                  </h1>

                  <p className="mx-auto mt-3 max-w-2xl text-sm leading-7 text-zinc-400 sm:text-base">
                    Your expert partner for code, research, and technical
                    analysis.
                  </p>
                </div>

                {/* Messages */}
                <div className="mt-12 w-full">
                  <MessageList />
                </div>
              </div>
            </div>

            {/* Fixed Composer */}
            <div className="relative z-50 shrink-0 border-t border-[#3F3F46] bg-[#09090B]/70 px-4 py-4 backdrop-blur-md sm:px-6">
              <div className="mx-auto w-full max-w-3xl">
                <ChatInput />

                <p className="mt-2 text-center text-[11px] text-zinc-500">
                  ANVIX AI can make mistakes. Verify important information.
                </p>
              </div>
            </div>
          </div>
        </main>
      </div>
    </AppShell>
  );
}