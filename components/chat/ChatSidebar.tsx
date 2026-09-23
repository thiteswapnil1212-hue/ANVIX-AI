
"use client";

import Image from "next/image";
import {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
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
  X,
  Check,
  Sparkles,
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
  onOpenSettings?: () => void;
  onOpenAccount?: () => void;
  userName?: string;
  plan?: string;
}

const GROUP_ORDER = [
  "Today",
  "Yesterday",
  "Previous 7 days",
  "Previous 30 days",
  "Older",
];

function getDayStart(date: Date) {
  return new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate()
  ).getTime();
}

function groupLabel(date: Date, now: Date): string {
  const days = Math.floor(
    (getDayStart(now) - getDayStart(date)) / 86_400_000
  );

  if (days <= 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days <= 7) return "Previous 7 days";
  if (days <= 30) return "Previous 30 days";

  return "Older";
}

function getThreadDate(thread: Thread, now: Date) {
  if (!thread.updatedAt) return now;

  const date = new Date(thread.updatedAt);
  return Number.isNaN(date.getTime()) ? now : date;
}

function ChatSidebar({
  threads = [],
  activeThread = "",
  onSelectThread = () => {},
  onNewThread = () => {},
  onRenameThread = () => {},
  onDeleteThread = () => {},
  onTogglePin = () => {},
  onCollapse = () => {},
  onOpenSettings = () => {},
  onOpenAccount = () => {},
  userName = "Your account",
  plan = "Free plan",
}: ChatSidebarProps) {
  const [query, setQuery] = useState("");
  const [collapsed, setCollapsed] = useState(false);
  const [menuOpenFor, setMenuOpenFor] = useState<string | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");

  const searchRef = useRef<HTMLInputElement>(null);
  const renameInputRef = useRef<HTMLInputElement>(null);
  const renameCommittedRef = useRef(false);

  const normalizedQuery = query.trim().toLowerCase();

  const toggleCollapse = useCallback(() => {
    setCollapsed((current) => {
      const next = !current;
      onCollapse(next);
      return next;
    });

    setMenuOpenFor(null);
  }, [onCollapse]);

  const closeMenu = useCallback(() => {
    setMenuOpenFor(null);
  }, []);

  const startRename = useCallback((thread: Thread) => {
    renameCommittedRef.current = false;
    setRenamingId(thread.id);
    setRenameValue(thread.title || "");
    setMenuOpenFor(null);
  }, []);

  const cancelRename = useCallback(() => {
    renameCommittedRef.current = true;
    setRenamingId(null);
    setRenameValue("");
  }, []);

  const commitRename = useCallback(
    (id: string) => {
      if (renameCommittedRef.current) return;

      renameCommittedRef.current = true;

      const nextTitle = renameValue.trim();

      if (nextTitle) {
        onRenameThread(id, nextTitle);
      }

      setRenamingId(null);
      setRenameValue("");
    },
    [renameValue, onRenameThread]
  );

  useEffect(() => {
    if (!renamingId) return;

    renameInputRef.current?.focus();
    renameInputRef.current?.select();
  }, [renamingId]);

  useEffect(() => {
    function handleKeyboard(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      const typing =
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target?.isContentEditable;

      if (event.key === "Escape") {
        if (renamingId) {
          cancelRename();
        } else {
          closeMenu();
        }
        return;
      }

      if (typing || event.altKey) return;

      const shortcutKey = event.ctrlKey || event.metaKey;

      if (shortcutKey && event.key.toLowerCase() === "k") {
        event.preventDefault();
        onNewThread();
        closeMenu();
        return;
      }

      if (event.key === "/" && !collapsed) {
        event.preventDefault();
        searchRef.current?.focus();
      }
    }

    document.addEventListener("keydown", handleKeyboard);

    return () => {
      document.removeEventListener("keydown", handleKeyboard);
    };
  }, [
    cancelRename,
    closeMenu,
    collapsed,
    onNewThread,
    renamingId,
  ]);

  const { pinned, grouped } = useMemo(() => {
    const now = new Date();

    const filtered = normalizedQuery
      ? threads.filter((thread) => {
          const title = (thread.title || "").toLowerCase();
          const preview = (thread.preview || "").toLowerCase();

          return (
            title.includes(normalizedQuery) ||
            preview.includes(normalizedQuery)
          );
        })
      : threads;

    const pinnedThreads = filtered.filter((thread) => thread.pinned);
    const regularThreads = filtered.filter((thread) => !thread.pinned);

    const buckets = new Map<string, Thread[]>();

    for (const thread of regularThreads) {
      const label = groupLabel(getThreadDate(thread, now), now);

      if (!buckets.has(label)) {
        buckets.set(label, []);
      }

      buckets.get(label)!.push(thread);
    }

    const groupedThreads = GROUP_ORDER
      .filter((label) => buckets.has(label))
      .map((label) => ({
        label,
        items: buckets.get(label)!,
      }));

    return {
      pinned: pinnedThreads,
      grouped: groupedThreads,
    };
  }, [threads, normalizedQuery]);

  const hasThreads = threads.length > 0;
  const hasResults = pinned.length > 0 || grouped.length > 0;

  const renderThread = (thread: Thread) => {
    const active = thread.id === activeThread;
    const isRenaming = renamingId === thread.id;
    const menuOpen = menuOpenFor === thread.id;
    const title = thread.title || "New conversation";

    return (
      <div key={thread.id} className="group/thread relative">
        <button
          type="button"
          onClick={() => {
            if (isRenaming) return;
            onSelectThread(thread.id);
            closeMenu();
          }}
          aria-current={active ? "page" : undefined}
          title={collapsed ? title : undefined}
          className={`
            relative flex w-full items-start gap-2.5
            rounded-xl py-2.5 pl-3 pr-9 text-left
            transition-colors duration-150
            focus-visible:outline-none
            focus-visible:ring-1
            focus-visible:ring-[#D4AF37]/60
            ${
              active
                ? "bg-[#292821] text-white shadow-[inset_0_0_0_1px_rgba(212,175,55,0.10)]"
                : "text-zinc-400 hover:bg-[#222225] hover:text-zinc-200"
            }
          `}
        >
          {active && (
            <span
              aria-hidden="true"
              className="
                absolute bottom-2 left-0 top-2
                w-[3px] rounded-r-full bg-[#D4AF37]
              "
            />
          )}

          <MessageSquare
            className={`
              mt-0.5 h-4 w-4 shrink-0
              ${
                active
                  ? "text-[#D4AF37]"
                  : "text-zinc-600 group-hover/thread:text-zinc-400"
              }
            `}
            aria-hidden="true"
          />

          {!collapsed && (
            <div className="min-w-0 flex-1">
              {isRenaming ? (
                <input
                  ref={renameInputRef}
                  value={renameValue}
                  maxLength={120}
                  aria-label="Rename conversation"
                  onChange={(event) =>
                    setRenameValue(event.target.value)
                  }
                  onClick={(event) => event.stopPropagation()}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      event.stopPropagation();
                      commitRename(thread.id);
                    }

                    if (event.key === "Escape") {
                      event.preventDefault();
                      event.stopPropagation();
                      cancelRename();
                    }
                  }}
                  onBlur={() => commitRename(thread.id)}
                  className="
                    w-full rounded-md border
                    border-[#D4AF37]/40 bg-[#151518]
                    px-2 py-1 text-xs text-zinc-100
                    outline-none focus:border-[#D4AF37]/70
                  "
                />
              ) : (
                <>
                  <p
                    className={`
                      truncate text-[12px] font-medium
                      ${active ? "text-zinc-100" : "text-zinc-300"}
                    `}
                  >
                    {title}
                  </p>

                  {thread.preview && (
                    <p className="mt-1 truncate text-[10px] leading-4 text-zinc-600">
                      {thread.preview}
                    </p>
                  )}
                </>
              )}
            </div>
          )}
        </button>

        {!collapsed && !isRenaming && (
          <button
            type="button"
            aria-label={`Options for ${title}`}
            aria-expanded={menuOpen}
            title="Conversation options"
            onClick={(event) => {
              event.stopPropagation();
              setMenuOpenFor(menuOpen ? null : thread.id);
            }}
            className={`
              absolute right-1.5 top-2
              flex h-7 w-7 items-center justify-center
              rounded-lg text-zinc-500
              transition-colors
              hover:bg-[#343438] hover:text-zinc-100
              focus-visible:opacity-100
              focus-visible:outline-none
              focus-visible:ring-1
              focus-visible:ring-[#D4AF37]/60
              ${
                menuOpen
                  ? "bg-[#343438] text-zinc-100 opacity-100"
                  : "opacity-0 group-hover/thread:opacity-100"
              }
            `}
          >
            <MoreHorizontal className="h-4 w-4" />
          </button>
        )}

        {menuOpen && !collapsed && (
          <>
            <button
              type="button"
              aria-label="Close conversation options"
              onClick={closeMenu}
              className="fixed inset-0 z-20 cursor-default"
            />

            <div
              role="menu"
              aria-label="Conversation options"
              className="
                absolute right-1 top-9 z-30 w-40
                overflow-hidden rounded-xl
                border border-[#353539]
                bg-[#202023] p-1
                shadow-[0_12px_36px_rgba(0,0,0,0.55)]
              "
            >
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  onTogglePin(thread.id);
                  closeMenu();
                }}
                className="
                  flex w-full items-center gap-2.5
                  rounded-lg px-3 py-2 text-left
                  text-xs text-zinc-300 transition
                  hover:bg-[#303034] hover:text-white
                "
              >
                <Pin className="h-3.5 w-3.5 text-zinc-500" />
                {thread.pinned ? "Unpin chat" : "Pin chat"}
              </button>

              <button
                type="button"
                role="menuitem"
                onClick={() => startRename(thread)}
                className="
                  flex w-full items-center gap-2.5
                  rounded-lg px-3 py-2 text-left
                  text-xs text-zinc-300 transition
                  hover:bg-[#303034] hover:text-white
                "
              >
                <Pencil className="h-3.5 w-3.5 text-zinc-500" />
                Rename
              </button>

              <div className="my-1 border-t border-white/[0.06]" />

              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  onDeleteThread(thread.id);
                  closeMenu();
                }}
                className="
                  flex w-full items-center gap-2.5
                  rounded-lg px-3 py-2 text-left
                  text-xs text-red-400 transition
                  hover:bg-red-500/10 hover:text-red-300
                "
              >
                <Trash2 className="h-3.5 w-3.5" />
                Delete chat
              </button>
            </div>
          </>
        )}
      </div>
    );
  };

  return (
    <aside
      aria-label="Chat sidebar"
      className={`
        relative flex h-dvh min-h-0 min-w-0
        shrink-0 flex-col overflow-hidden
        border-r border-[#2A2A2E]
        bg-[#18181B] text-white
        transition-[width] duration-200 ease-in-out
        ${
          collapsed
            ? "w-[68px]"
            : "w-[min(280px,85vw)]"
        }
      `}
    >
      <div className="shrink-0 px-3 pt-3">
        <div className="flex items-center justify-between px-1 pb-4">
          <div className="flex min-w-0 items-center gap-2.5">
            <div
              className="
                relative flex h-9 w-9 shrink-0
                items-center justify-center
                overflow-hidden rounded-xl
                border border-[#D4AF37]/20
                bg-[#101011]
              "
            >
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
                <p className="truncate text-[14px] font-bold tracking-[0.04em] text-[#F2CA50]">
                  ANVIX AI
                </p>
                <div className="mt-0.5 flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  <p className="text-[10px] text-zinc-600">
                    AI workspace
                  </p>
                </div>
              </div>
            )}
          </div>

          <button
            type="button"
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            aria-expanded={!collapsed}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            onClick={toggleCollapse}
            className="
              flex h-8 w-8 shrink-0 items-center
              justify-center rounded-lg text-zinc-500
              transition hover:bg-[#27272A] hover:text-zinc-200
              focus-visible:outline-none
              focus-visible:ring-1
              focus-visible:ring-[#D4AF37]/60
            "
          >
            <PanelLeft
              className={`h-4 w-4 transition-transform ${
                collapsed ? "rotate-180" : ""
              }`}
            />
          </button>
        </div>

        <button
          type="button"
          onClick={onNewThread}
          aria-label="New chat"
          title={collapsed ? "New chat" : undefined}
          className={`
            group/new flex w-full items-center gap-3
            rounded-xl border border-[#3F3F46]
            bg-[#202023] px-3 py-2.5
            text-left transition-colors
            hover:border-[#D4AF37]/35 hover:bg-[#27272A]
            focus-visible:outline-none
            focus-visible:ring-1
            focus-visible:ring-[#D4AF37]/60
            ${collapsed ? "justify-center px-0" : ""}
          `}
        >
          <span
            className="
              flex h-7 w-7 shrink-0 items-center
              justify-center rounded-lg bg-[#D4AF37]
              text-black transition-transform
              group-hover/new:scale-105
            "
          >
            <Plus className="h-4 w-4" strokeWidth={2.5} />
          </span>

          {!collapsed && (
            <>
              <span className="flex-1 text-sm font-medium text-zinc-200">
                New chat
              </span>
              <kbd className="hidden rounded-md border border-zinc-700/80 bg-[#151518] px-1.5 py-0.5 text-[9px] text-zinc-500 sm:block">
                Ctrl K
              </kbd>
            </>
          )}
        </button>

        {!collapsed && (
          <div className="mt-3">
            <label className="relative block">
              <Search
                className="
                  pointer-events-none absolute left-3
                  top-1/2 h-3.5 w-3.5
                  -translate-y-1/2 text-zinc-600
                "
                aria-hidden="true"
              />

              <input
                ref={searchRef}
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search conversations  /"
                aria-label="Search conversations"
                className="
                  w-full rounded-xl border
                  border-[#2A2A2E] bg-[#151518]
                  py-2.5 pl-9 pr-9 text-xs
                  text-zinc-300 placeholder:text-zinc-600
                  outline-none transition
                  focus:border-[#D4AF37]/40
                  focus:bg-[#1A1A1D]
                  focus:ring-2 focus:ring-[#D4AF37]/[0.06]
                "
              />

              {query && (
                <button
                  type="button"
                  aria-label="Clear search"
                  onClick={() => setQuery("")}
                  className="
                    absolute right-2 top-1/2
                    flex h-6 w-6 -translate-y-1/2
                    items-center justify-center
                    rounded-md text-zinc-500
                    transition hover:bg-[#303034]
                    hover:text-zinc-200
                  "
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </label>
          </div>
        )}
      </div>

      {!collapsed && (
        <div
          className="
            min-h-0 flex-1 overflow-y-auto
            overscroll-contain px-3 pb-4 pt-5
            [scrollbar-color:#3f3f46_transparent]
            [scrollbar-width:thin]
          "
        >
          {hasThreads && hasResults ? (
            <div className="space-y-5">
              {pinned.length > 0 && (
                <section aria-label="Pinned conversations">
                  <p className="mb-2 flex items-center gap-2 px-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-600">
                    <Pin className="h-3 w-3 text-[#D4AF37]/70" />
                    Pinned
                  </p>
                  <div className="space-y-1">
                    {pinned.map(renderThread)}
                  </div>
                </section>
              )}

              {grouped.map(({ label, items }) => (
                <section key={label} aria-label={label}>
                  <p className="mb-2 px-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-600">
                    {label}
                  </p>
                  <div className="space-y-1">
                    {items.map(renderThread)}
                  </div>
                </section>
              ))}
            </div>
          ) : hasThreads ? (
            <div className="px-2 py-12 text-center">
              <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl border border-zinc-800 bg-[#151518]">
                <Search className="h-4 w-4 text-zinc-600" />
              </div>
              <p className="mt-3 text-xs font-medium text-zinc-400">
                No matching chats
              </p>
              <p className="mt-1 text-[10px] leading-4 text-zinc-600">
                Try another search term.
              </p>
              <button
                type="button"
                onClick={() => setQuery("")}
                className="mt-3 text-[11px] font-medium text-[#D4AF37] hover:text-yellow-300"
              >
                Clear search
              </button>
            </div>
          ) : (
            <div className="px-2 py-12 text-center">
              <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-2xl border border-[#D4AF37]/15 bg-[#D4AF37]/[0.04]">
                <Sparkles className="h-4 w-4 text-[#D4AF37]/70" />
              </div>
              <p className="mt-3 text-xs font-medium text-zinc-400">
                Your chats live here
              </p>
              <p className="mx-auto mt-1 max-w-[170px] text-[10px] leading-4 text-zinc-600">
                Start a conversation and it will appear in this list.
              </p>
              <button
                type="button"
                onClick={onNewThread}
                className="
                  mt-4 inline-flex items-center gap-1.5
                  rounded-lg border border-[#D4AF37]/20
                  bg-[#D4AF37]/[0.05] px-3 py-2
                  text-[11px] font-medium text-[#D4AF37]
                  transition hover:bg-[#D4AF37]/[0.10]
                "
              >
                <Plus className="h-3.5 w-3.5" />
                Start a chat
              </button>
            </div>
          )}
        </div>
      )}

      {collapsed && (
        <div className="min-h-0 flex-1 overflow-y-auto px-3 pt-5">
          <div className="flex flex-col items-center gap-2">
            {threads.slice(0, 5).map((thread) => {
              const active = thread.id === activeThread;

              return (
                <button
                  key={thread.id}
                  type="button"
                  title={thread.title || "Conversation"}
                  aria-label={`Open ${thread.title || "conversation"}`}
                  aria-current={active ? "page" : undefined}
                  onClick={() => onSelectThread(thread.id)}
                  className={`
                    relative flex h-10 w-10 items-center
                    justify-center rounded-xl transition
                    ${
                      active
                        ? "bg-[#292821] text-[#D4AF37]"
                        : "text-zinc-600 hover:bg-[#27272A] hover:text-zinc-300"
                    }
                  `}
                >
                  {active && (
                    <span className="absolute bottom-2 left-0 top-2 w-[2px] rounded-full bg-[#D4AF37]" />
                  )}
                  <MessageSquare className="h-4 w-4" />
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className="shrink-0 border-t border-[#2A2A2E] bg-[#18181B] px-3 py-3">
        <button
          type="button"
          title={collapsed ? "Settings" : undefined}
          aria-label="Settings"
          onClick={onOpenSettings}
          className={`
            group/settings flex w-full items-center gap-3
            rounded-xl px-2.5 py-2.5 text-xs
            text-zinc-500 transition
            hover:bg-[#222225] hover:text-zinc-200
            focus-visible:outline-none
            focus-visible:ring-1
            focus-visible:ring-[#D4AF37]/60
            ${collapsed ? "justify-center" : ""}
          `}
        >
          <Settings className="h-4 w-4 shrink-0 text-zinc-600 transition group-hover/settings:text-zinc-400" />
          {!collapsed && "Settings"}
        </button>

        <button
          type="button"
          title={collapsed ? userName : undefined}
          aria-label="Account"
          onClick={onOpenAccount}
          className={`
            group/account mt-1 flex w-full
            items-center gap-2.5 rounded-xl
            px-2.5 py-2.5 text-left transition
            hover:bg-[#222225]
            focus-visible:outline-none
            focus-visible:ring-1
            focus-visible:ring-[#D4AF37]/60
            ${collapsed ? "justify-center" : ""}
          `}
        >
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-white/[0.06] bg-[#27272A] text-zinc-400">
            <User className="h-3.5 w-3.5" />
          </div>

          {!collapsed && (
            <>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-medium text-zinc-300">
                  {userName}
                </p>
                <p className="mt-0.5 truncate text-[10px] text-zinc-600">
                  {plan}
                </p>
              </div>
              <ChevronRight className="h-3.5 w-3.5 text-zinc-700 transition group-hover/account:translate-x-0.5 group-hover/account:text-zinc-500" />
            </>
          )}
        </button>
      </div>
    </aside>
  );
}

export default memo(ChatSidebar);