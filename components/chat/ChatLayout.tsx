
"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, PanelRight } from "lucide-react";
import { DEFAULT_CHAT_MODEL_ID } from "@/lib/chat-models";

import { useAuth } from "@/components/auth/AuthProvider";
import {
  deleteCloudConversation,
  fetchConversations,
  syncConversation,
  type CloudConversation as CloudConversationShape,
} from "@/lib/supabase/cloud";

import ChatSidebar from "./ChatSidebar";
import MessageList from "./MessageList";
import ChatInput from "./ChatInput";
import AgiShell from "@/components/agi/AgiShell";
import IconRail from "@/components/agi/IconRail";
import ApprovalsPanel from "@/components/agi/ApprovalsPanel";
import {
  readApprovals,
  type ApprovalEntry,
} from "@/components/agi/ApprovalsHistory";

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

type ChatApiError = {
  error?: string;
};

type ActiveRequest = {
  controller: AbortController;
  reader: ReadableStreamDefaultReader<Uint8Array> | null;
  stopped: boolean;
};

const STORAGE_KEY = "anvix-guest-chats";

/** Desktop viewport (lg breakpoint) via useSyncExternalStore — the
 * sanctioned way to read a media query without a setState-in-effect. */
const useIsDesktop = () =>
  useSyncExternalStore(
    (onChange) => {
      const query = window.matchMedia("(min-width: 1024px)");
      query.addEventListener("change", onChange);
      return () => query.removeEventListener("change", onChange);
    },
    () => window.matchMedia("(min-width: 1024px)").matches,
    () => true
  );

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
    (message.role === "user" ||
      message.role === "assistant") &&
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
            (
              conversation
            ): conversation is GuestChatConversation =>
              conversation !== null
          )
      : [];

    const sorted = sortConversations(conversations);

    const savedActiveId =
      typeof record.activeConversationId === "string"
        ? record.activeConversationId
        : null;

    const activeConversationId =
      savedActiveId &&
      sorted.some(
        (conversation) => conversation.id === savedActiveId
      )
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

  const [drawerOpen, setDrawerOpen] = useState(false);

  // Right panel: closed by default on desktop, so the chat column is
  // not squeezed and the panel is not mostly empty black space. The
  // header toggle opens it. On phones it stays closed until the header
  // toggle opens it as a slide-over, so the three panes are never
  // squeezed onto a phone at once.
  const [panelOpen, setPanelOpen] = useState(false);
  const [mobilePanelOpen, setMobilePanelOpen] = useState(false);
  const isDesktop = useIsDesktop();

  // Approvals history (localStorage, starts empty).
  const [approvals, setApprovals] = useState<ApprovalEntry[]>(() =>
    readApprovals()
  );

  const togglePanel = useCallback(() => {
    setApprovals(readApprovals());

    if (isDesktop) {
      setPanelOpen((open) => !open);
    } else {
      setMobilePanelOpen((open) => !open);
    }
  }, [isDesktop]);

  const closePanel = useCallback(() => {
    setPanelOpen(false);
    setMobilePanelOpen(false);
  }, []);

  // "Connected" = last /api/chat call succeeded; "Not connected" after
  // a key error (the route returns 500 "Gemini API key is not
  // configured" without GEMINI_API_KEY). No new API.
  const [chatConnected, setChatConnected] = useState(true);

  const [conversations, setConversations] = useState<
    GuestChatConversation[]
  >(initialGuestState.conversations);

  const [activeConversationId, setActiveConversationId] =
    useState<string | null>(
      initialGuestState.activeConversationId
    );

  const [isTyping, setIsTyping] = useState(false);

  const router = useRouter();
  const { user, signOut } = useAuth();

  // Cloud sync bookkeeping: which conversation snapshots are already in
  // Supabase, and which ids existed there (so deletions propagate).
  const cloudReadyRef = useRef(false);
  const syncedSnapshotsRef = useRef(new Map<string, string>());
  const knownCloudIdsRef = useRef(new Set<string>());
  const conversationsRef = useRef<GuestChatConversation[]>([]);
  const cloudSyncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    conversationsRef.current = conversations;
  }, [conversations]);
  // Cloud rows need a concrete timestamp on every message; local
  // messages may omit it, so fall back to the conversation's.
  const toCloudConversation = (
    conversation: GuestChatConversation
  ): CloudConversationShape => ({
    ...conversation,
    messages: conversation.messages.map((message) => ({
      ...message,
      createdAt: message.createdAt ?? conversation.updatedAt,
    })),
  });


  // On sign-in: load the user's cloud conversations. If the cloud is
  // empty but this browser holds guest chats, import them once so
  // signing in never loses history.
  useEffect(() => {
    if (!user) {
      cloudReadyRef.current = false;
      return;
    }

    let cancelled = false;
    const userId = user.id;

    void (async () => {
      const cloud = await fetchConversations(userId);
      if (cancelled || !cloud) return;

      let effective: GuestChatConversation[] = [];

      if (cloud.length === 0 && conversationsRef.current.length > 0) {
        const local = conversationsRef.current;
        for (const conversation of local) {
          await syncConversation(userId, toCloudConversation(conversation));
        }
        effective = local;
      } else if (cloud.length > 0) {
        effective = cloud;
        setConversations(sortConversations(cloud));
        setActiveConversationId(cloud[0]?.id ?? null);
      }

      syncedSnapshotsRef.current = new Map(
        effective.map((conversation) => [
          conversation.id,
          JSON.stringify(conversation),
        ])
      );
      knownCloudIdsRef.current = new Set(
        effective.map((conversation) => conversation.id)
      );
      cloudReadyRef.current = true;
    })();

    return () => {
      cancelled = true;
    };
  }, [user]);

  // Debounced cloud sync: upsert changed conversations, delete removed
  // ones. Local persistence stays as the always-on mirror.
  useEffect(() => {
    if (!user || !cloudReadyRef.current) return;

    if (cloudSyncTimerRef.current) {
      clearTimeout(cloudSyncTimerRef.current);
    }

    const userId = user.id;
    const snapshot = conversations;

    cloudSyncTimerRef.current = setTimeout(() => {
      void (async () => {
        const currentIds = new Set<string>();

        for (const conversation of snapshot) {
          currentIds.add(conversation.id);
          const serialized = JSON.stringify(conversation);
          if (syncedSnapshotsRef.current.get(conversation.id) !== serialized) {
            const ok = await syncConversation(userId, toCloudConversation(conversation));
            if (ok) {
              syncedSnapshotsRef.current.set(conversation.id, serialized);
              knownCloudIdsRef.current.add(conversation.id);
            }
          }
        }

        for (const knownId of [...knownCloudIdsRef.current]) {
          if (!currentIds.has(knownId)) {
            await deleteCloudConversation(userId, knownId);
            knownCloudIdsRef.current.delete(knownId);
            syncedSnapshotsRef.current.delete(knownId);
          }
        }
      })();
    }, 900);
  }, [conversations, user]);

  const activeRequestRef = useRef<ActiveRequest | null>(null);

  const activeConversation = useMemo(
    () =>
      conversations.find(
        (conversation) =>
          conversation.id === activeConversationId
      ) ?? null,
    [conversations, activeConversationId]
  );

  const messages = activeConversation?.messages ?? [];

  // Persist guest chat history.
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
      console.warn(
        "Unable to persist guest chat history.",
        error
      );
    }
  }, [conversations, activeConversationId]);

  // Stop the current generation and cancel its reader.
  const handleStop = useCallback(() => {
    const request = activeRequestRef.current;

    if (!request || request.stopped) {
      return;
    }

    request.stopped = true;

    request.controller.abort();

    if (request.reader) {
      void request.reader.cancel().catch(() => {
        // The reader may already be closed.
      });
    }

    setIsTyping(false);
  }, []);

  // Create a new conversation.
  const handleNewConversation = useCallback(() => {
    handleStop();

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
    setDrawerOpen(false);
  }, [handleStop]);

  // Select a conversation.
  const handleSelectConversation = useCallback(
    (id: string) => {
      handleStop();
      setActiveConversationId(id);
      setDrawerOpen(false);
    },
    [handleStop]
  );

  // Rename a conversation.
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

  // Delete a conversation.
  const handleDeleteConversation = useCallback(
    (id: string) => {
      if (activeConversationId === id) {
        handleStop();
      }

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
    [activeConversationId, handleStop]
  );

  // Pin or unpin a conversation.
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

  // Send a message and stream the response.
  const handleSend = async (
    prompt: string,
    model: string
  ): Promise<boolean> => {
    const trimmedPrompt = prompt.trim();

    if (!trimmedPrompt || activeRequestRef.current) {
      return false;
    }

    const controller = new AbortController();

    const request: ActiveRequest = {
      controller,
      reader: null,
      stopped: false,
    };

    activeRequestRef.current = request;

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

    const assistantMessageId = crypto.randomUUID();

    const assistantMessage: Message = {
      id: assistantMessageId,
      role: "assistant",
      content: "",
      createdAt: createTimestamp(),
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
            messages: [
              ...conversation.messages,
              userMessage,
              assistantMessage,
            ],
          };
        })
      )
    );

    setIsTyping(true);

    let streamedText = "";
    const decoder = new TextDecoder();

    const updateAssistantMessage = (content: string) => {
      setConversations((prev) =>
        sortConversations(
          prev.map((conversation) => {
            if (conversation.id !== workingConversationId) {
              return conversation;
            }

            return {
              ...conversation,
              preview: content || trimmedPrompt,
              updatedAt: createTimestamp(),
              messages: conversation.messages.map((message) =>
                message.id === assistantMessageId
                  ? { ...message, content }
                  : message
              ),
            };
          })
        )
      );
    };

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prompt: trimmedPrompt,
          model,
        }),
        signal: controller.signal,
      });

      if (request.stopped) {
        return true;
      }

      if (!response.ok) {
        let errorMessage = "Failed to generate response.";

        try {
          const data = (await response.json()) as ChatApiError;
          errorMessage = data.error || errorMessage;
        } catch {
          // Keep the fallback error message.
        }

        throw new Error(errorMessage);
      }

      if (!response.body) {
        throw new Error(
          "Streaming is not supported by this response."
        );
      }

      const reader = response.body.getReader();
      request.reader = reader;

      // A 200 + readable stream means the key works.
      setChatConnected(true);

      while (!request.stopped) {
        const { value, done } = await reader.read();

        if (request.stopped || done) {
          break;
        }

        if (value) {
          streamedText += decoder.decode(value, {
            stream: true,
          });

          updateAssistantMessage(streamedText);
        }
      }

      // Flush any remaining decoded text only if not stopped.
      if (!request.stopped) {
        streamedText += decoder.decode();

        if (streamedText) {
          updateAssistantMessage(streamedText);
        }
      }

      if (request.stopped) {
        return true;
      }

      if (!streamedText.trim()) {
        throw new Error("AI returned an empty response.");
      }

      return true;
    } catch (error) {
      if (
        request.stopped ||
        (error instanceof Error && error.name === "AbortError")
      ) {
        if (streamedText.trim()) {
          updateAssistantMessage(streamedText);
        } else {
          updateAssistantMessage("Response stopped.");
        }

        return true;
      }

      console.error("Chat streaming error:", error);

      const errorMessage =
        error instanceof Error
          ? error.message
          : "Something went wrong while generating the response.";

      if (/api key/i.test(errorMessage)) {
        setChatConnected(false);
      }

      updateAssistantMessage(
        streamedText.trim()
          ? `${streamedText}\n\n[Response interrupted. Please try again.]`
          : errorMessage
      );

      return false;
    } finally {
      if (request.reader) {
        try {
          request.reader.releaseLock();
        } catch {
          // The reader may already be released.
        }
      }

      if (activeRequestRef.current === request) {
        activeRequestRef.current = null;
        setIsTyping(false);
      }
    }
  };

  return (
    <AgiShell
      rail={
        <IconRail active="chat" onNewChat={handleNewConversation} />
      }
      panel={
        <ApprovalsPanel
          open={panelOpen || mobilePanelOpen}
          onClose={closePanel}
          approvals={approvals}
          status={chatConnected ? "connected" : "not-connected"}
          userLabel={user?.email ?? "Guest"}
          onOpenSettings={() => router.push("/settings")}
        />
      }
      drawer={
        <ChatSidebar
          drawer
          threads={conversations}
          activeThread={activeConversationId ?? ""}
          onSelectThread={handleSelectConversation}
          onNewThread={handleNewConversation}
          onRenameThread={handleRenameConversation}
          onDeleteThread={handleDeleteConversation}
          onTogglePin={handleTogglePin}
          onOpenSettings={() => router.push("/settings")}
          onOpenAccount={() => {
            if (user) {
              void signOut();
            } else {
              router.push("/auth");
            }
          }}
          userName={user?.email ?? "Guest"}
          plan={user ? "Cloud sync on" : "Local workspace"}
        />
      }
      panelOpen={panelOpen}
      mobilePanelOpen={mobilePanelOpen}
      drawerOpen={drawerOpen}
      onClosePanel={closePanel}
      onCloseDrawer={() => setDrawerOpen(false)}
      center={
        <>
          {/* HEADER — back arrow + pill title + panel toggle */}
          <header className="flex h-14 shrink-0 items-center gap-3 border-b border-white/[0.07] bg-[#181819] px-3 sm:px-4">
            <button
              type="button"
              onClick={() => router.back()}
              aria-label="Back"
              title="Back"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#262628] text-[#EDEDED] transition-colors hover:bg-[#313132] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0074E8]"
            >
              <ArrowLeft className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
            </button>

            <button
              type="button"
              onClick={() => setDrawerOpen(true)}
              aria-label="Switch conversation"
              title="Switch conversation"
              className="flex min-w-0 items-center gap-2.5 rounded-full bg-[#262628] px-4 py-2 text-sm text-white transition-colors hover:bg-[#2E2E30] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0074E8]"
            >
              <span
                aria-hidden="true"
                className="h-2 w-2 shrink-0 rounded-full bg-[#0074E8]"
              />
              <span className="truncate">
                {activeConversation?.title ?? "New chat"}
              </span>
            </button>

            <div className="flex-1" />

            <button
              type="button"
              onClick={togglePanel}
              aria-label="Toggle approvals panel"
              aria-expanded={panelOpen || mobilePanelOpen}
              title="Approvals panel"
              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0074E8] ${
                panelOpen || mobilePanelOpen
                  ? "bg-[#2A2A2C] text-white"
                  : "bg-[#262628] text-[#A1A1AA] hover:bg-[#313132] hover:text-white"
              }`}
            >
              <PanelRight className="h-4 w-4" strokeWidth={1.8} aria-hidden="true" />
            </button>
          </header>

          {/* MESSAGES */}
          <div className="min-h-0 flex-1 overflow-hidden bg-[#181819]">
            {messages.length === 0 && !isTyping ? (
              <div
                className="
                  mx-auto
                  flex
                  h-full
                  w-full
                  max-w-3xl
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
                    h-14
                    w-14
                    items-center
                    justify-center
                    rounded-2xl
                    border
                    border-white/10
                    bg-[#1F1F20]
                    text-sm
                    font-semibold
                    tracking-[0.2em]
                    text-zinc-100
                  "
                >
                  AGI
                </div>

                <div className="mt-8">
                  <p
                    className="
                      text-sm
                      font-semibold
                      uppercase
                      tracking-[0.4em]
                      text-zinc-500
                    "
                  >
                    AGI
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
                    How can I help?
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
                    Ask a question, or give me a task to do.
                  </p>

                  <div className="mx-auto mt-8 flex max-w-2xl flex-wrap items-center justify-center gap-2">
                    {[
                      "Explain a topic",
                      "Help me write a message",
                      "Plan my day",
                      "Summarise an idea",
                    ].map((suggestion) => (
                      <button
                        key={suggestion}
                        type="button"
                        onClick={() => {
                          void handleSend(
                            suggestion,
                            DEFAULT_CHAT_MODEL_ID
                          );
                        }}
                        className="rounded-full border border-white/10 bg-[#262628] px-4 py-2 text-[13px] text-zinc-300 transition hover:border-white/25 hover:bg-[#313132] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <MessageList
                messages={messages}
                isTyping={isTyping}
              />
            )}
          </div>

          {/* INPUT */}
          <div
            className="
              relative
              z-50
              shrink-0
              border-t
              border-white/[0.06]
              bg-[#181819]
              px-3
              pt-4
              sm:px-6
              sm:py-4
            "
          >
            <div className="mx-auto w-full max-w-3xl">
              <ChatInput
                onSend={handleSend}
                isGenerating={isTyping}
                onStop={handleStop}
              />

              <p
                className="
                  mt-3
                  text-center
                  text-[11px]
                  leading-5
                  text-zinc-400/70
                "
              >
                AGI can make mistakes. Verify important information.
              </p>
            </div>
          </div>
        </>
      }
    />
  );
}
