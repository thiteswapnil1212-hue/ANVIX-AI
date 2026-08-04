"use client";

import ChatSidebar from "./ChatSidebar";
import MessageList from "./MessageList";
import ChatInput from "./ChatInput";
import AppShell from "@/components/layout/AppShell";

export default function ChatLayout() {
  return (
    <AppShell>
      <div className="flex h-[calc(100vh-64px)] overflow-hidden">
        {/* Sidebar */}
        <aside className="hidden w-72 border-r border-zinc-800 bg-[#0f0f0f] lg:flex">
          <ChatSidebar />
        </aside>

        {/* Chat */}
        <section className="flex min-w-0 flex-1 flex-col bg-[#090909]">
          {/* Header */}
          <header className="flex h-14 items-center border-b border-zinc-800 px-6">
            <h1 className="text-sm font-medium text-white">
              New Chat
            </h1>
          </header>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto">
            <MessageList />
          </div>

          {/* Input */}
          <div className="border-t border-zinc-800">
            <ChatInput />
          </div>
        </section>
      </div>
    </AppShell>
  );
}