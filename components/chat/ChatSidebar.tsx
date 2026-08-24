"use client";

import Image from "next/image";
import {
  Plus,
  Calendar,
  History,
  Settings,
  User,
  Sparkles,
  MessageSquare,
  PanelLeft,
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
  {
    id: "today",
    label: "Today",
    icon: Calendar,
  },
  {
    id: "yesterday",
    label: "Yesterday",
    icon: History,
  },
  {
    id: "week",
    label: "Previous 7 Days",
    icon: History,
  },
];

export default function ChatSidebar({
  threads = [],
  activeThread = "",
  onSelectThread = () => {},
  onNewThread = () => {},
}: ChatSidebarProps) {
  return (
    <aside
      className="
        flex
        h-dvh
        w-full
        min-w-0
        flex-col
        overflow-hidden
        border-r
        border-[#2A2A2E]
        bg-[#18181B]
        text-white
      "
    >
      {/* =====================================================
          TOP AREA — FIXED
      ===================================================== */}
      <div className="shrink-0 px-3 pt-3">
        {/* BRAND */}
        <div className="flex items-center justify-between px-2 pb-3">
          <div className="flex min-w-0 items-center gap-3">
            <div
              className="
                flex
                h-9
                w-9
                shrink-0
                items-center
                justify-center
                overflow-hidden
                rounded-xl
                border
                border-[#3F3F46]
                bg-[#0F0F10]
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

            <div className="min-w-0">
              <p className="truncate text-[14px] font-semibold tracking-tight text-[#F2CA50]">
                ANVIX AI
              </p>

              <p className="text-[10px] text-zinc-600">
                AI workspace
              </p>
            </div>
          </div>

          <button
            type="button"
            aria-label="Sidebar options"
            className="
              flex
              h-8
              w-8
              shrink-0
              items-center
              justify-center
              rounded-lg
              text-zinc-600
              transition
              hover:bg-[#27272A]
              hover:text-zinc-300
            "
          >
            <PanelLeft className="h-4 w-4" />
          </button>
        </div>

        {/* NEW CHAT */}
        <button
          type="button"
          onClick={onNewThread}
          className="
            group
            flex
            w-full
            items-center
            gap-3
            rounded-xl
            border
            border-[#3F3F46]
            bg-[#202023]
            px-3
            py-2.5
            text-left
            transition-all
            duration-200
            hover:border-[#D4AF37]/30
            hover:bg-[#27272A]
            active:scale-[0.99]
          "
        >
          <span
            className="
              flex
              h-7
              w-7
              items-center
              justify-center
              rounded-lg
              bg-[#D4AF37]
              text-black
              shadow-[0_4px_15px_rgba(212,175,55,0.12)]
              transition
              group-hover:scale-105
            "
          >
            <Plus
              className="h-4 w-4"
              strokeWidth={2.5}
            />
          </span>

          <span className="flex-1 text-sm font-medium text-zinc-200">
            New chat
          </span>

          <kbd
            className="
              hidden
              rounded-md
              border
              border-zinc-700
              bg-[#151518]
              px-1.5
              py-0.5
              text-[9px]
              text-zinc-600
              sm:block
            "
          >
            Ctrl K
          </kbd>
        </button>
      </div>

      {/* =====================================================
          HISTORY — FIXED
      ===================================================== */}
      <div className="shrink-0 px-3 pt-5">
        <p
          className="
            mb-2
            px-2
            text-[10px]
            font-semibold
            uppercase
            tracking-[0.14em]
            text-zinc-600
          "
        >
          History
        </p>

        <nav className="space-y-0.5">
          {historyItems.map((item) => {
            const Icon = item.icon;
            const active = item.id === "today";

            return (
              <button
                key={item.id}
                type="button"
                className={`
                  group
                  flex
                  w-full
                  items-center
                  gap-3
                  rounded-lg
                  px-2.5
                  py-2
                  text-left
                  transition-all
                  duration-150
                  ${
                    active
                      ? "bg-[#27272A] text-zinc-100"
                      : "text-zinc-500 hover:bg-[#222225] hover:text-zinc-200"
                  }
                `}
              >
                <Icon
                  className={`
                    h-4
                    w-4
                    shrink-0
                    ${
                      active
                        ? "text-[#D4AF37]"
                        : "text-zinc-600 group-hover:text-zinc-400"
                    }
                  `}
                />

                <span className="text-xs font-medium">
                  {item.label}
                </span>

                {active && (
                  <span className="ml-auto h-1.5 w-1.5 rounded-full bg-[#D4AF37]" />
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* =====================================================
          CONVERSATIONS — ONLY SCROLLABLE AREA
      ===================================================== */}
      <div
        className="
          min-h-0
          flex-1
          overflow-y-auto
          overscroll-contain
          px-3
          pt-6
          pb-3
          [scrollbar-color:#3f3f46_transparent]
          [scrollbar-width:thin]
        "
      >
        <div className="flex items-center justify-between px-2">
          <p
            className="
              text-[10px]
              font-semibold
              uppercase
              tracking-[0.14em]
              text-zinc-600
            "
          >
            Conversations
          </p>

          {threads.length > 0 && (
            <span className="text-[10px] text-zinc-700">
              {threads.length}
            </span>
          )}
        </div>

        <div className="mt-2 space-y-0.5">
          {threads.length > 0 ? (
            threads.map((thread) => {
              const active =
                thread.id === activeThread;

              return (
                <button
                  key={thread.id}
                  type="button"
                  onClick={() =>
                    onSelectThread(thread.id)
                  }
                  className={`
                    group
                    relative
                    flex
                    w-full
                    items-start
                    gap-2.5
                    rounded-lg
                    px-2.5
                    py-2.5
                    text-left
                    transition-all
                    duration-150
                    ${
                      active
                        ? "bg-[#27272A] text-white"
                        : "text-zinc-400 hover:bg-[#222225] hover:text-zinc-200"
                    }
                  `}
                >
                  <MessageSquare
                    className={`
                      mt-0.5
                      h-3.5
                      w-3.5
                      shrink-0
                      ${
                        active
                          ? "text-[#D4AF37]"
                          : "text-zinc-600 group-hover:text-zinc-500"
                      }
                    `}
                  />

                  <div className="min-w-0 flex-1">
                    <p
                      className={`
                        truncate
                        text-xs
                        font-medium
                        ${
                          active
                            ? "text-zinc-100"
                            : "text-zinc-400"
                        }
                      `}
                    >
                      {thread.title}
                    </p>

                    {thread.preview && (
                      <p className="mt-1 truncate text-[10px] text-zinc-600">
                        {thread.preview}
                      </p>
                    )}
                  </div>

                  {active && (
                    <span
                      className="
                        mt-1
                        h-1.5
                        w-1.5
                        shrink-0
                        rounded-full
                        bg-[#D4AF37]
                      "
                    />
                  )}
                </button>
              );
            })
          ) : (
            <div className="px-2.5 py-8 text-center">
              <div
                className="
                  mx-auto
                  flex
                  h-9
                  w-9
                  items-center
                  justify-center
                  rounded-xl
                  border
                  border-zinc-800
                  bg-[#151518]
                "
              >
                <MessageSquare className="h-4 w-4 text-zinc-700" />
              </div>

              <p className="mt-3 text-xs text-zinc-500">
                No conversations yet
              </p>

              <p className="mt-1 text-[10px] leading-4 text-zinc-700">
                Start a new chat to see your conversations here.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* =====================================================
          BOTTOM — FIXED
      ===================================================== */}
      <div
        className="
          shrink-0
          border-t
          border-[#2A2A2E]
          bg-[#18181B]
          px-3
          py-3
        "
      >
        <div className="space-y-0.5">
          <button
            type="button"
            className="
              group
              flex
              w-full
              items-center
              gap-3
              rounded-lg
              px-2.5
              py-2
              text-left
              text-xs
              text-zinc-500
              transition
              hover:bg-[#222225]
              hover:text-zinc-200
            "
          >
            <Settings className="h-4 w-4 text-zinc-600 group-hover:text-zinc-400" />
            Settings
          </button>

          <button
            type="button"
            className="
              group
              flex
              w-full
              items-center
              gap-3
              rounded-lg
              px-2.5
              py-2
              text-left
              text-xs
              text-zinc-500
              transition
              hover:bg-[#222225]
              hover:text-zinc-200
            "
          >
            <User className="h-4 w-4 text-zinc-600 group-hover:text-zinc-400" />
            Profile
          </button>
        </div>

        <div className="mt-2 flex items-center gap-2 px-2.5 pt-2">
          <Sparkles className="h-3 w-3 text-[#D4AF37]/50" />

          <span className="text-[9px] tracking-wide text-zinc-700">
            ANVIX AI
          </span>
        </div>
      </div>
    </aside>
  );
}