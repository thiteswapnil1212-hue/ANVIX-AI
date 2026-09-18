"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import Image from "next/image";
import { Menu, X } from "lucide-react";
import ChatSidebar from "./ChatSidebar";
import MessageList from "./MessageList";
import ChatInput from "./ChatInput";
import AppShell from "@/components/layout/AppShell";

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt?: string;
};

type GuestChatConversation = {
  id: string;
  title: string;
  preview: string;
  updatedAt: string;
  createdAt: string;
  pinned?: boolean;
  messages: Message[];
};

type StoredGuestChats = {
  activeConversationId: string | null;
  conversations: GuestChatConversation[];
};

type GenerateResponse = {
  success?: boolean;
  response?: string;
  result?: {
    response?: string;
  };
  error?: string;
};

const STORAGE_KEY = "anvix-guest-chats";

const createTimestamp = () => new Date().toISOString();

const generateChatTitle = (value: string) => {
  const cleaned = value.replace(/\s+/g, " ").trim();

  if (!cleaned) {
    return "New chat";
  }

  return cleaned.length > 32
    ? `${cleaned.slice(0, 32).trim()}...`
    : cleaned;
};

const sortConversations = (
  conversations: GuestChatConversation[]
): GuestChatConversation[] =>
  [...conversations].sort(
    (a, b) =>
      new Date(b.updatedAt).getTime() -
      new Date(a.updatedAt).getTime()
  );

const isMessage = (value: unknown): value is Message => {
  if (!value || typeof value !== "object") {
    return false;
  }

  const message = value as Record<string, unknown>;

  return (
    typeof message.id === "string" &&
    (message.role === "user" || message.role === "assistant") &&
    typeof message.content === "string"
  );
};

const normalizeConversation = (
  value: unknown
): GuestChatConversation | null => {
  if (!value || typeof value !== "object") {
    return null;
  }

  const conversation = value as Record<string, unknown>;

  if (typeof conversation.id !== "string") {
    return null;
  }

  const messages = Array.isArray(conversation.messages)
    ? conversation.messages.filter(isMessage)
    : [];

  const now = createTimestamp();
  const updatedAt =
    typeof conversation.updatedAt === "string"
      ? conversation.updatedAt
      : now;

  return {
    id: conversation.id,
    title:
      typeof conversation.title === "string" &&
      conversation.title.trim()
        ? conversation.title
        : "New chat",
    preview:
      typeof conversation.preview === "string"
        ? conversation.preview
        : messages[messages.length - 1]?.content ?? "",
    updatedAt,
    createdAt:
      typeof conversation.createdAt === "string"
        ? conversation.createdAt
        : updatedAt,
    pinned: Boolean(conversation.pinned),
    messages: messages.map((message) => ({
      ...message,
      createdAt:
        typeof message.createdAt === "string"
          ? message.createdAt
          : now,
    })),
  };
};

const readGuestChats = (): StoredGuestChats => {
  if (typeof window === "undefined") {
    return {
      activeConversationId: null,
      conversations: [],
    };
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);

    if (!raw) {
      return {
        activeConversationId: null,
        conversations: [],
      };
    }

    const parsed: unknown = JSON.parse(raw);

    if (!parsed || typeof parsed !== "object") {
      return {
        activeConversationId: null,
        conversations: [],
      };
    }

    const record = parsed as Record<string, unknown>;
    const conversations = Array.isArray(record.conversations)
      ? record.conversations
          .map(normalizeConversation)
          .filter(
            (conversation): conversation is GuestChatConversation =>
              conversation !== null
          )
      : [];

    const sorted = sortConversations(conversations);
    const savedActiveId =
      typeof record.activeConversationId === "string"
        ? record.activeConversationId
        : null;

    const activeConversationId =
      savedActiveId && sorted.some((conversation) => conversation.id === savedActiveId)
        ? savedActiveId
        : sorted[0]?.id ?? null;

    return {
      activeConversationId,
      conversations: sorted,
    };
  } catch (error) {
    console.warn("Unable to read guest chat history.", error);

    return {
      activeConversationId: null,
      conversations: [],
    };
  }
};

export default function ChatLayout() {
  const initialGuestState = useMemo<StoredGuestChats>(
    () => readGuestChats(),
    []
  );

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [conversations, setConversations] = useState<GuestChatConversation[]>(
    initialGuestState.conversations
  );
  const [activeConversationId, setActiveConversationId] = useState<string | null>(
    initialGuestState.activeConversationId
  );
  const [isTyping, setIsTyping] = useState(false);

  const activeConversation = useMemo(
    () =>
      conversations.find(
        (conversation) => conversation.id === activeConversationId
      ) ?? null,
    [conversations, activeConversationId]
  );

  const messages = activeConversation?.messages ?? [];

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    try {
      const payload: StoredGuestChats = {
        activeConversationId,
        conversations: sortConversations(conversations),
      };

      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(payload)
      );
    } catch (error) {
      console.warn("Unable to persist guest chat history.", error);
    }
  }, [conversations, activeConversationId]);

  const handleNewConversation = useCallback(() => {
    const id = crypto.randomUUID();
    const now = createTimestamp();

    const nextConversation: GuestChatConversation = {
      id,
      title: "New chat",
      preview: "",
      createdAt: now,
      updatedAt: now,
      pinned: false,
      messages: [],
    };

    setConversations((prev) =>
      sortConversations([nextConversation, ...prev])
    );
    setActiveConversationId(id);
  }, []);

  const handleSelectConversation = useCallback((id: string) => {
    setActiveConversationId(id);
  }, []);

  const handleRenameConversation = useCallback(
    (id: string, title: string) => {
      const trimmed = title.trim();

      if (!trimmed) {
        return;
      }

      setConversations((prev) =>
        sortConversations(
          prev.map((conversation) =>
            conversation.id === id
              ? {
                  ...conversation,
                  title: trimmed,
                  updatedAt: createTimestamp(),
                }
              : conversation
          )
        )
      );
    },
    []
  );

  const handleDeleteConversation = useCallback(
    (id: string) => {
      setConversations((prev) => {
        const remaining = prev.filter(
          (conversation) => conversation.id !== id
        );

        if (remaining.length === 0) {
          setActiveConversationId(null);
          return remaining;
        }

        if (activeConversationId === id) {
          setActiveConversationId(remaining[0].id);
        }

        return remaining;
      });
    },
    [activeConversationId]
  );

  const handleTogglePin = useCallback((id: string) => {
    setConversations((prev) =>
      sortConversations(
        prev.map((conversation) =>
          conversation.id === id
            ? {
                ...conversation,
                pinned: !conversation.pinned,
                updatedAt: createTimestamp(),
              }
            : conversation
        )
      )
    );
  }, []);

  const handleSend = async (
    prompt: string,
    model: string
  ): Promise<boolean> => {
    const trimmedPrompt = prompt.trim();

    if (!trimmedPrompt || isTyping) {
      return false;
    }

    let workingConversationId = activeConversationId;
    const timestamp = createTimestamp();

    if (!workingConversationId) {
      workingConversationId = crypto.randomUUID();
      const newConversation: GuestChatConversation = {
        id: workingConversationId,
        title: generateChatTitle(trimmedPrompt),
        preview: trimmedPrompt,
        createdAt: timestamp,
        updatedAt: timestamp,
        pinned: false,
        messages: [],
      };

      setConversations((prev) =>
        sortConversations([newConversation, ...prev])
      );
      setActiveConversationId(workingConversationId);
    }

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content: trimmedPrompt,
      createdAt: timestamp,
    };

    setConversations((prev) =>
      sortConversations(
        prev.map((conversation) => {
          if (conversation.id !== workingConversationId) {
            return conversation;
          }

          const nextTitle =
            conversation.title === "New chat" ||
            conversation.messages.length === 0
              ? generateChatTitle(trimmedPrompt)
              : conversation.title;

          return {
            ...conversation,
            title: nextTitle,
            preview: trimmedPrompt,
            updatedAt: timestamp,
            messages: [...conversation.messages, userMessage],
          };
        })
      )
    );

    setIsTyping(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prompt,
          model,
        }),
      });

      let data: GenerateResponse;

      try {
        data = (await response.json()) as GenerateResponse;
      } catch {
        throw new Error("Invalid response from server.");
      }

      if (!response.ok) {
        throw new Error(
          data?.error || "Failed to generate response."
        );
      }

      const aiResponse = data.response?.trim();

      if (!aiResponse) {
        throw new Error("AI returned an empty response.");
      }

      const aiMessage: Message = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: aiResponse,
        createdAt: createTimestamp(),
      };

      setConversations((prev) =>
        sortConversations(
          prev.map((conversation) => {
            if (conversation.id !== workingConversationId) {
              return conversation;
            }

            return {
              ...conversation,
              preview: aiResponse,
              updatedAt: createTimestamp(),
              messages: [...conversation.messages, aiMessage],
            };
          })
        )
      );

      return true;
    } catch (error) {
      console.error("Chat error:", error);

      const errorMessage: Message = {
        id: crypto.randomUUID(),
        role: "assistant",
        content:
          error instanceof Error
            ? error.message
            : "Sorry, something went wrong while generating the response.",
        createdAt: createTimestamp(),
      };

      setConversations((prev) =>
        sortConversations(
          prev.map((conversation) => {
            if (conversation.id !== workingConversationId) {
              return conversation;
            }

            return {
              ...conversation,
              preview: errorMessage.content,
              updatedAt: createTimestamp(),
              messages: [...conversation.messages, errorMessage],
            };
          })
        )
      );

      return false;
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <AppShell>
      <div className="flex h-[calc(100vh-68px)] min-h-0 w-full overflow-hidden bg-transparent">
        <aside
          className="
            hidden
            h-full
            w-64
            min-h-0
            shrink-0
            overflow-hidden
            border-r
            border-[#3F3F46]
            bg-[#18181B]
            md:flex
            md:flex-col
          "
        >
          <div
            className="
              min-h-0
              flex-1
              overflow-y-auto
              overscroll-contain
              [scrollbar-color:#3f3f46_transparent]
              [scrollbar-width:thin]
              [&::-webkit-scrollbar]:w-1.5
              [&::-webkit-scrollbar-track]:bg-transparent
              [&::-webkit-scrollbar-thumb]:rounded-full
              [&::-webkit-scrollbar-thumb]:bg-zinc-800
              hover:[&::-webkit-scrollbar-thumb]:bg-zinc-700
            "
          >
            <ChatSidebar
              threads={conversations}
              activeThread={activeConversationId ?? ""}
              onSelectThread={handleSelectConversation}
              onNewThread={handleNewConversation}
              onRenameThread={handleRenameConversation}
              onDeleteThread={handleDeleteConversation}
              onTogglePin={handleTogglePin}
            />
          </div>
        </aside>

        {sidebarOpen && (
          <div className="fixed inset-0 z-50 md:hidden">
            <div
              className="absolute inset-0 bg-black/25"
              onClick={() => setSidebarOpen(false)}
            />

            <aside
              className="
                relative
                z-10
                flex
                h-full
                w-72
                min-h-0
                flex-col
                overflow-hidden
                border-r
                border-[#3F3F46]
                bg-[#18181B]
              "
            >
              <div
                className="
                  flex
                  shrink-0
                  items-center
                  justify-between
                  border-b
                  border-[#3F3F46]
                  px-4
                  py-4
                "
              >
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
                  className="
                    flex
                    h-9
                    w-9
                    items-center
                    justify-center
                    rounded-lg
                    border
                    border-zinc-700
                    text-zinc-400
                    transition
                    hover:text-white
                  "
                  aria-label="Close sidebar"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div
                className="
                  min-h-0
                  flex-1
                  overflow-y-auto
                  overscroll-contain
                  [scrollbar-color:#3f3f46_transparent]
                  [scrollbar-width:thin]
                  [&::-webkit-scrollbar]:w-1.5
                  [&::-webkit-scrollbar-track]:bg-transparent
                  [&::-webkit-scrollbar-thumb]:rounded-full
                  [&::-webkit-scrollbar-thumb]:bg-zinc-800
                  hover:[&::-webkit-scrollbar-thumb]:bg-zinc-700
                "
              >
                <ChatSidebar
                  threads={conversations}
                  activeThread={activeConversationId ?? ""}
                  onSelectThread={handleSelectConversation}
                  onNewThread={handleNewConversation}
                  onRenameThread={handleRenameConversation}
                  onDeleteThread={handleDeleteConversation}
                  onTogglePin={handleTogglePin}
                />
              </div>
            </aside>
          </div>
        )}

        <main
          className="
            relative
            flex
            min-h-0
            min-w-0
            flex-1
            flex-col
            overflow-hidden
            bg-transparent
          "
        >
          <video
            autoPlay
            loop
            muted
            playsInline
            preload="auto"
            className="
              pointer-events-none
              absolute
              inset-0
              h-full
              w-full
              object-cover
              opacity-100
            "
          >
            <source src="/anvix-bg.mp4" type="video/mp4" />
          </video>

          <div className="relative z-10 flex min-h-0 flex-1 flex-col overflow-hidden">
            <header
              className="
                flex
                h-16
                shrink-0
                items-center
                justify-between
                border-b
                border-white/[0.08]
                bg-transparent
                px-4
                md:hidden
              "
            >
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
                className="
                  flex
                  h-10
                  w-10
                  items-center
                  justify-center
                  rounded-xl
                  border
                  border-white/[0.12]
                  bg-transparent
                  text-zinc-400
                  transition
                  hover:border-white/[0.2]
                  hover:text-white
                "
                aria-label="Open sidebar"
              >
                <Menu className="h-5 w-5" />
              </button>
            </header>

            <div className="min-h-0 flex-1 overflow-hidden bg-transparent">
              {messages.length === 0 && !isTyping ? (
                <div
                  className="
                    mx-auto
                    flex
                    h-full
                    w-full
                    max-w-5xl
                    flex-col
                    items-center
                    justify-center
                    px-4
                    pb-6
                    pt-16
                    text-center
                    sm:px-6
                    sm:pb-8
                    sm:pt-20
                    lg:px-8
                    lg:pt-24
                  "
                >
                  <div
                    className="
                      flex
                      h-16
                      w-16
                      items-center
                      justify-center
                      rounded-2xl
                      border
                      border-white/10
                      bg-transparent
                    "
                  >
                    <Image
                      src="/logo.png"
                      alt="ANVIX AI"
                      width={64}
                      height={64}
                      className="h-full w-full rounded-2xl object-contain"
                      priority
                    />
                  </div>

                  <div className="mt-8">
                    <p
                      className="
                        text-sm
                        font-semibold
                        uppercase
                        tracking-[0.4em]
                        text-[#D4AF37]
                      "
                    >
                      ANVIX AI
                    </p>

                    <h1
                      className="
                        mt-5
                        text-3xl
                        font-semibold
                        tracking-tight
                        text-white
                        sm:text-4xl
                      "
                    >
                      How can I help you today?
                    </h1>

                    <p
                      className="
                        mx-auto
                        mt-3
                        max-w-2xl
                        text-sm
                        leading-7
                        text-zinc-400
                        sm:text-base
                      "
                    >
                      Built for thinking. Designed for building.
                    </p>
                  </div>
                </div>
              ) : (
                <MessageList
                  messages={messages}
                  isTyping={isTyping}
                />
              )}
            </div>

            <div
              className="
                relative
                z-50
                shrink-0
                border-t
                border-white/[0.06]
                bg-transparent
                px-3
                pt-4
                sm:px-6
                sm:py-4
              "
            >
              <div className="mx-auto w-full max-w-3xl">
                <ChatInput onSend={handleSend} />

                <p
                  className="
                    mt-3
                    text-center
                    text-[11px]
                    leading-5
                    text-zinc-400/70
                  "
                >
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
