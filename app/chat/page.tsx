"use client";

import { useMemo, useState } from "react";
import AppShell from "@/components/layout/AppShell";
import ChatSidebar from "@/components/chat/ChatSidebar";
import ChatMessageBubble from "@/components/chat/ChatMessageBubble";
import { SendHorizonal } from "lucide-react";

const initialThreads = [
  {
    id: "thread-1",
    title: "Product strategy",
    preview: "Help me sharpen the onboarding experience",
  },
  {
    id: "thread-2",
    title: "Workspace architecture",
    preview: "Design the ideal collaboration layout",
  },
];

const initialMessages: Record<string, Array<{ role: "assistant" | "user"; content: string }>> = {
  "thread-1": [
    { role: "assistant", content: "I can help you shape the product narrative and craft a polished initial experience." },
    { role: "user", content: "Give me a roadmap for our AI builder onboarding flow." },
  ],
  "thread-2": [
    { role: "assistant", content: "I recommend a workspace with a precise left-to-right workflow and clear activity tracking." },
  ],
};

export default function ChatPage() {
  const [threads, setThreads] = useState(initialThreads);
  const [activeThread, setActiveThread] = useState(initialThreads[0].id);
  const [draft, setDraft] = useState("");
  const [messages, setMessages] = useState(initialMessages);

  const activeMessages = useMemo(() => messages[activeThread] ?? [], [activeThread, messages]);

  function handleNewThread() {
    const newThread = {
      id: `thread-${Date.now()}`,
      title: "New conversation",
      preview: "Start a fresh build discussion",
    };

    setThreads((current) => [newThread, ...current]);
    setActiveThread(newThread.id);
    setMessages((current) => ({ ...current, [newThread.id]: [] }));
  }

  function handleSend() {
    const trimmed = draft.trim();
    if (!trimmed) return;

    setMessages((current) => ({
      ...current,
      [activeThread]: [
        ...(current[activeThread] ?? []),
        { role: "user", content: trimmed },
        {
          role: "assistant",
          content: `I’ve captured your note: “${trimmed}”. I’ll turn it into a concrete next step for your product workflow.`,
        },
      ],
    }));
    setDraft("");
  }

  return (
    <AppShell title="AI Chat" description="Collaborate with Anvix AI in a focused workspace designed for product thinking, iteration, and implementation guidance.">
      <div className="grid gap-6 lg:grid-cols-[0.8fr_1.8fr]">
        <ChatSidebar
          threads={threads}
          activeThread={activeThread}
          onSelectThread={setActiveThread}
          onNewThread={handleNewThread}
        />

        <section className="flex h-[70vh] flex-col rounded-3xl border border-zinc-800/80 bg-[#111111]/80 p-4 backdrop-blur-xl">
          <div className="flex-1 space-y-4 overflow-y-auto rounded-2xl bg-[#0D0D0D] p-4">
            {activeMessages.length === 0 ? (
              <div className="flex h-full items-center justify-center text-center text-sm text-zinc-500">
                Start a conversation to receive tailored product and engineering guidance.
              </div>
            ) : (
              activeMessages.map((message, index) => <ChatMessageBubble key={`${message.role}-${index}`} {...message} />)
            )}
          </div>

          <div className="mt-4 rounded-2xl border border-zinc-800 bg-[#0D0D0D] p-3">
            <textarea
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              rows={4}
              placeholder="Ask Anvix AI for architecture, copy, or implementation help..."
              className="w-full resize-none bg-transparent text-sm text-white outline-none placeholder:text-zinc-500"
            />
            <div className="mt-3 flex items-center justify-between">
              <p className="text-xs text-zinc-500">Press Enter to send</p>
              <button
                type="button"
                onClick={handleSend}
                className="inline-flex items-center gap-2 rounded-full bg-[#D4AF37] px-4 py-2 text-sm font-semibold text-black transition hover:bg-[#E2C259]"
              >
                <SendHorizonal className="h-4 w-4" />
                Send
              </button>
            </div>
          </div>
        </section>
      </div>
    </AppShell>
  );
}
