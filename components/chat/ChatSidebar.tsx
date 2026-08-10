"use client";

import Image from "next/image";
import {
  Plus,
  Calendar,
  History,
  Settings,
  User,
  Sparkles,
} from "lucide-react";

interface Thread {
  id: string;
  title: string;
  preview: string;
}

interface ChatSidebarProps {
  threads?: Thread[];
  activeThread?: string;
  onSelectThread?: (id: string) => void;
  onNewThread?: () => void;
}

const historyItems = [
  { id: "today", label: "Today", icon: Calendar, active: true },
  { id: "yesterday", label: "Yesterday", icon: History, active: false },
  { id: "week", label: "Previous 7 Days", icon: History, active: false },
];

export default function ChatSidebar({
  threads = [],
  activeThread = "",
  onSelectThread = () => {},
  onNewThread = () => {},
}: ChatSidebarProps) {
  return (
    <aside className="flex h-full w-full flex-col bg-[#18181B] px-4 py-4">
      {/* Brand */}
      <div className="flex items-center gap-3 border-b border-[#3F3F46] pb-4">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[#3F3F46] bg-[#0F0F10]">
          <Image
            src="/logo.png"
            alt="ANVIX AI Logo"
            width={44}
            height={44}
            className="h-11 w-11 object-contain"
            priority
          />
        </div>

        <div className="min-w-0">
          <h1 className="text-[15px] font-semibold tracking-tight text-[#F2CA50]">
            ANVIX AI
          </h1>
        </div>
      </div>

      {/* New Chat */}
      <button
        type="button"
        onClick={onNewThread}
        className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-[#D4AF37] px-4 py-3 text-sm font-semibold text-[#09090B] shadow-[0_8px_24px_rgba(212,175,55,0.12)] transition-all duration-200 hover:bg-[#E5C158] hover:shadow-[0_8px_30px_rgba(212,175,55,0.18)] active:scale-[0.98]"
      >
        <Plus className="h-4 w-4" strokeWidth={2.5} />
        New Chat
      </button>

      {/* History */}
      <nav className="mt-7 space-y-1.5">
        {historyItems.map((item) => {
          const Icon = item.icon;

          return (
            <button
              key={item.id}
              type="button"
              className={`group flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition-all duration-200 ${
                item.active
                  ? "border-[#4A4638] bg-[#27272A] text-[#D4AF37]"
                  : "border-transparent text-zinc-400 hover:border-[#3F3F46] hover:bg-[#27272A] hover:text-zinc-100"
              }`}
            >
              <Icon
                className={`h-4 w-4 ${
                  item.active
                    ? "text-[#D4AF37]"
                    : "text-zinc-500 group-hover:text-zinc-300"
                }`}
              />

              <span className="text-sm font-medium">{item.label}</span>

              {item.active && (
                <span className="ml-auto h-1.5 w-1.5 rounded-full bg-[#D4AF37]" />
              )}
            </button>
          );
        })}
      </nav>

      {/* Threads */}
      {threads.length > 0 && (
        <div className="mt-6 min-h-0 flex-1 overflow-y-auto">
          <p className="mb-2 px-3 text-[10px] font-medium uppercase tracking-[0.14em] text-zinc-600">
            Conversations
          </p>

          <div className="space-y-1">
            {threads.map((thread) => {
              const active = thread.id === activeThread;

              return (
                <button
                  key={thread.id}
                  type="button"
                  onClick={() => onSelectThread(thread.id)}
                  className={`w-full rounded-xl px-3 py-2.5 text-left transition ${
                    active
                      ? "bg-[#27272A] text-white"
                      : "text-zinc-400 hover:bg-[#222225] hover:text-zinc-200"
                  }`}
                >
                  <p className="truncate text-sm font-medium">
                    {thread.title}
                  </p>

                  <p className="mt-1 truncate text-xs text-zinc-600">
                    {thread.preview}
                  </p>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Bottom */}
      <div className="mt-auto border-t border-[#3F3F46] pt-4">
        <div className="space-y-1.5">
          <button
            type="button"
            className="group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm text-zinc-400 transition hover:bg-[#27272A] hover:text-white"
          >
            <Settings className="h-4 w-4 text-zinc-500 group-hover:text-zinc-300" />
            Settings
          </button>

          <button
            type="button"
            className="group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm text-zinc-400 transition hover:bg-[#27272A] hover:text-white"
          >
            <User className="h-4 w-4 text-zinc-500 group-hover:text-zinc-300" />
            Profile
          </button>
        </div>

        {/* Brand signature */}
        <div className="mt-4 flex items-center gap-2 px-3 py-2">
          <Sparkles className="h-3 w-3 text-[#D4AF37]/70" />
          <span className="text-[10px] tracking-wide text-zinc-600">
            Built with ANVIX AI
          </span>
        </div>
      </div>
    </aside>
  );
}