"use client";

import ChatSidebar from "./ChatSidebar";
import MessageList from "./MessageList";
import ChatInput from "./ChatInput";
import AppShell from "@/components/layout/AppShell";

export default function ChatLayout() {
  return (
    <AppShell>
      <div className="flex h-[calc(100vh-0px)] min-h-0 overflow-hidden bg-[#09090B] text-zinc-100">
        {/* Chat history sidebar */}
        <aside className="hidden w-64 shrink-0 border-r border-[#3F3F46] bg-[#18181B] md:flex">
          <ChatSidebar />
        </aside>

        {/* Main chat area */}
        <main className="relative flex min-w-0 flex-1 flex-col bg-[#09090B]">
          {/* Minimal header */}
          <header className="flex h-16 shrink-0 items-center border-b border-[#3F3F46] px-6">
            <div>
              <h1 className="text-sm font-semibold text-white">
                New Chat
              </h1>
              <p className="mt-0.5 text-xs text-zinc-500">
                ANVIX AI
              </p>
            </div>
          </header>

          {/* Messages / empty state */}
          <div className="min-h-0 flex-1 overflow-y-auto">
            <MessageList />
          </div>

          {/* Composer */}
          <div className="shrink-0 border-t border-[#3F3F46] bg-[#09090B] px-4 py-4 md:px-6">
            <div className="mx-auto w-full max-w-3xl">
              <ChatInput />

              <p className="mt-2 text-center text-[11px] text-zinc-600">
                ANVIX AI can make mistakes. Verify important information.
              </p>
            </div>
          </div>
        </main>
      </div>
    </AppShell>
  );
}