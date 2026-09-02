"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import {
  Plus,
  Search,
  Settings,
  User,
  MessageSquare,
  PanelLeft,
  ChevronRight,
  Pin,
  Pencil,
  Trash2,
  MoreHorizontal,
} from "lucide-react";

interface Thread {
  id: string;
  title: string;
  preview: string;
  updatedAt?: string | number | Date;
  pinned?: boolean;
}

interface ChatSidebarProps {
  threads?: Thread[];
  activeThread?: string;
  onSelectThread?: (id: string) => void;
  onNewThread?: () => void;
  onRenameThread?: (id: string, title: string) => void;
  onDeleteThread?: (id: string) => void;
  onTogglePin?: (id: string) => void;
  onCollapse?: (collapsed: boolean) => void;
  userName?: string;
  plan?: string;
}

function groupLabel(date: Date, now: Date): string {
  const startOfDay = (d: Date) =>
    new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const days = Math.round((startOfDay(now) - startOfDay(date)) / 86_400_000);
  if (days <= 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days <= 7) return "Previous 7 days";
  if (days <= 30) return "Previous 30 days";
  return "Older";
}

const GROUP_ORDER = [
  "Today",
  "Yesterday",
  "Previous 7 days",
  "Previous 30 days",
  "Older",
];

export default function ChatSidebar({
  threads = [],
  activeThread = "",
  onSelectThread = () => {},
  onNewThread = () => {},
  onRenameThread = () => {},
  onDeleteThread = () => {},
  onTogglePin = () => {},
  onCollapse = () => {},
  userName = "Your account",
  plan = "Free plan",
}: ChatSidebarProps) {
  const [query, setQuery] = useState("");
  const [collapsed, setCollapsed] = useState(false);
  const [menuOpenFor, setMenuOpenFor] = useState<string | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");

  const toggleCollapse = () => {
    setCollapsed((c) => {
      onCollapse(!c);
      return !c;
    });
  };

  const { pinned, grouped } = useMemo(() => {
    const now = new Date();
    const filtered = query.trim()
      ? threads.filter(
          (t) =>
            t.title.toLowerCase().includes(query.toLowerCase()) ||
            t.preview.toLowerCase().includes(query.toLowerCase())
        )
      : threads;

    const pinnedThreads = filtered.filter((t) => t.pinned);
    const rest = filtered.filter((t) => !t.pinned);

    const buckets = new Map<string, Thread[]>();
    for (const thread of rest) {
      const date = thread.updatedAt ? new Date(thread.updatedAt) : now;
      const label = groupLabel(date, now);
      if (!buckets.has(label)) buckets.set(label, []);
      buckets.get(label)!.push(thread);
    }

    const groupedRest = GROUP_ORDER.filter((label) => buckets.has(label)).map(
      (label) => ({ label, items: buckets.get(label)! })
    );

    return { pinned: pinnedThreads, grouped: groupedRest };
  }, [threads, query]);

  const hasThreads = threads.length > 0;
  const hasResults = pinned.length > 0 || grouped.length > 0;

  const startRename = (thread: Thread) => {
    setRenamingId(thread.id);
    setRenameValue(thread.title);
    setMenuOpenFor(null);
  };

  const commitRename = (id: string) => {
    if (renameValue.trim()) onRenameThread(id, renameValue.trim());
    setRenamingId(null);
  };

  const renderThread = (thread: Thread) => {
    const active = thread.id === activeThread;
    const isRenaming = renamingId === thread.id;
    const menuOpen = menuOpenFor === thread.id;

    return (
      <div key={thread.id} className="group relative">
        <button
          type="button"
          onClick={() => !isRenaming && onSelectThread(thread.id)}
          className={`
            relative flex w-full items-start gap-2.5 rounded-lg py-2.5 pl-3
            pr-8 text-left transition-all duration-150
            ${
              active
                ? "bg-[#27272A] text-white"
                : "text-zinc-400 hover:bg-[#222225] hover:text-zinc-200"
            }
          `}
        >
          {active && (
            <span className="absolute left-0 top-1.5 bottom-1.5 w-[2.5px] rounded-full bg-[#D4AF37]" />
          )}
          <MessageSquare
            className={`mt-0.5 h-3.5 w-3.5 shrink-0 ${
              active ? "text-[#D4AF37]" : "text-zinc-600 group-hover:text-zinc-500"
            }`}
          />
          <div className="min-w-0 flex-1">
            {isRenaming ? (
              <input
                autoFocus
                value={renameValue}
                onChange={(e) => setRenameValue(e.target.value)}
                onClick={(e) => e.stopPropagation()}
                onKeyDown={(e) => {
                  if (e.key === "Enter") commitRename(thread.id);
                  if (e.key === "Escape") setRenamingId(null);
                }}
                onBlur={() => commitRename(thread.id)}
                className="w-full rounded border border-[#D4AF37]/40 bg-[#151518] px-1.5 py-0.5 text-xs text-zinc-100 outline-none"
              />
            ) : (
              <p
                className={`truncate text-xs font-medium ${
                  active ? "text-zinc-100" : "text-zinc-400"
                }`}
              >
                {thread.title}
              </p>
            )}
            {!isRenaming && thread.preview && (
              <p className="mt-1 truncate text-[10px] text-zinc-600">
                {thread.preview}
              </p>
            )}
          </div>
        </button>

        {!isRenaming && (
          <button
            type="button"
            aria-label="Thread options"
            onClick={(e) => {
              e.stopPropagation();
              setMenuOpenFor(menuOpen ? null : thread.id);
            }}
            className={`
              absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center
              rounded-md text-zinc-600 transition hover:bg-[#2E2E32] hover:text-zinc-300
              ${menuOpen ? "opacity-100 bg-[#2E2E32]" : "opacity-0 group-hover:opacity-100"}
            `}
          >
            <MoreHorizontal className="h-3.5 w-3.5" />
          </button>
        )}

        {menuOpen && (
          <div
            className="absolute right-1.5 top-8 z-10 w-36 overflow-hidden rounded-lg border border-[#2A2A2E] bg-[#1E1E21] py-1 shadow-[0_8px_24px_rgba(0,0,0,0.4)]"
            onMouseLeave={() => setMenuOpenFor(null)}
          >
            <button
              type="button"
              onClick={() => {
                onTogglePin(thread.id);
                setMenuOpenFor(null);
              }}
              className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs text-zinc-300 hover:bg-[#27272A]"
            >
              <Pin className="h-3.5 w-3.5 text-zinc-500" />
              {thread.pinned ? "Unpin" : "Pin"}
            </button>
            <button
              type="button"
              onClick={() => startRename(thread)}
              className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs text-zinc-300 hover:bg-[#27272A]"
            >
              <Pencil className="h-3.5 w-3.5 text-zinc-500" />
              Rename
            </button>
            <button
              type="button"
              onClick={() => {
                onDeleteThread(thread.id);
                setMenuOpenFor(null);
              }}
              className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs text-red-400 hover:bg-[#27272A]"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Delete
            </button>
          </div>
        )}
      </div>
    );
  };

  return (
    <aside
      className={`
        flex h-dvh min-w-0 flex-col overflow-hidden border-r border-[#2A2A2E]
        bg-[#18181B] text-white transition-[width] duration-200
        ${collapsed ? "w-[68px]" : "w-full"}
      `}
    >
      {/* TOP — brand + new chat */}
      <div className="shrink-0 px-3 pt-3">
        <div className="flex items-center justify-between px-2 pb-3">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-[#3F3F46] bg-[#0F0F10]">
              <Image
                src="/logo.png"
                alt="ANVIX AI"
                width={36}
                height={36}
                className="h-9 w-9 object-contain"
                priority
              />
            </div>
            {!collapsed && (
              <div className="min-w-0">
                <p className="truncate text-[14px] font-semibold tracking-tight text-[#F2CA50]">
                  ANVIX AI
                </p>
                <p className="text-[10px] text-zinc-600">AI workspace</p>
              </div>
            )}
          </div>

          <button
            type="button"
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            onClick={toggleCollapse}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-zinc-600 transition hover:bg-[#27272A] hover:text-zinc-300"
          >
            <PanelLeft className="h-4 w-4" />
          </button>
        </div>

        <button
          type="button"
          onClick={onNewThread}
          aria-label="New chat"
          className={`
            group flex w-full items-center gap-3 rounded-xl border
            border-[#3F3F46] bg-[#202023] px-3 py-2.5 text-left transition-all
            duration-200 hover:border-[#D4AF37]/30 hover:bg-[#27272A] active:scale-[0.99]
            ${collapsed ? "justify-center px-0" : ""}
          `}
        >
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#D4AF37] text-black shadow-[0_4px_15px_rgba(212,175,55,0.12)] transition group-hover:scale-105">
            <Plus className="h-4 w-4" strokeWidth={2.5} />
          </span>
          {!collapsed && (
            <>
              <span className="flex-1 text-sm font-medium text-zinc-200">
                New chat
              </span>
              <kbd className="hidden rounded-md border border-zinc-700 bg-[#151518] px-1.5 py-0.5 text-[9px] text-zinc-600 sm:block">
                Ctrl K
              </kbd>
            </>
          )}
        </button>

        {!collapsed && (
          <div className="mt-3">
            <label className="relative block">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-600" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search conversations"
                className="w-full rounded-lg border border-[#2A2A2E] bg-[#151518] py-2 pl-8 pr-2.5 text-xs text-zinc-300 placeholder:text-zinc-600 outline-none transition focus:border-[#D4AF37]/40 focus:bg-[#1A1A1D]"
              />
            </label>
          </div>
        )}
      </div>

      {/* CONVERSATIONS */}
      {!collapsed && (
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 pt-5 pb-3 [scrollbar-color:#3f3f46_transparent] [scrollbar-width:thin]">
          {hasThreads && hasResults ? (
            <div className="space-y-5">
              {pinned.length > 0 && (
                <div>
                  <p className="mb-1.5 flex items-center gap-1.5 px-2 text-[11px] font-medium text-zinc-600">
                    <Pin className="h-3 w-3" /> Pinned
                  </p>
                  <div className="space-y-0.5">{pinned.map(renderThread)}</div>
                </div>
              )}
              {grouped.map(({ label, items }) => (
                <div key={label}>
                  <p className="mb-1.5 px-2 text-[11px] font-medium text-zinc-600">
                    {label}
                  </p>
                  <div className="space-y-0.5">{items.map(renderThread)}</div>
                </div>
              ))}
            </div>
          ) : hasThreads && !hasResults ? (
            <div className="px-2.5 py-10 text-center">
              <p className="text-xs text-zinc-500">
                No conversations match &ldquo;{query}&rdquo;
              </p>
            </div>
          ) : (
            <div className="px-2.5 py-10 text-center">
              <div className="mx-auto flex h-9 w-9 items-center justify-center rounded-xl border border-zinc-800 bg-[#151518]">
                <MessageSquare className="h-4 w-4 text-zinc-700" />
              </div>
              <p className="mt-3 text-xs text-zinc-500">No conversations yet</p>
              <p className="mt-1 text-[10px] leading-4 text-zinc-700">
                Start a new chat to see it here.
              </p>
            </div>
          )}
        </div>
      )}

      {/* BOTTOM */}
      <div className="shrink-0 border-t border-[#2A2A2E] bg-[#18181B] px-3 py-3">
        <button
          type="button"
          className={`group flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left text-xs text-zinc-500 transition hover:bg-[#222225] hover:text-zinc-200 ${collapsed ? "justify-center" : ""}`}
        >
          <Settings className="h-4 w-4 shrink-0 text-zinc-600 group-hover:text-zinc-400" />
          {!collapsed && "Settings"}
        </button>

        <button
          type="button"
          className={`group mt-1 flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left transition hover:bg-[#222225] ${collapsed ? "justify-center" : ""}`}
        >
          <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#27272A] text-zinc-400">
            <User className="h-3.5 w-3.5" />
          </div>
          {!collapsed && (
            <>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-medium text-zinc-300">
                  {userName}
                </p>
                <p className="truncate text-[10px] text-zinc-600">{plan}</p>
              </div>
              <ChevronRight className="h-3.5 w-3.5 text-zinc-700 group-hover:text-zinc-500" />
            </>
          )}
        </button>
      </div>
    </aside>
  );
}