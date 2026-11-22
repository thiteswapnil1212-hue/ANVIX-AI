
"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Menu, X } from "lucide-react";

import { useAuth } from "@/components/auth/AuthProvider";
import { getAuthHeaders } from "@/lib/api/auth-headers";
import { shouldUseOwnKey } from "@/lib/byok/client";
import {
  deleteCloudConversation,
  fetchConversations,
  syncConversation,
  type CloudConversation as CloudConversationShape,
} from "@/lib/supabase/cloud";

import ChatSidebar from "./ChatSidebar";
import MessageList from "./MessageList";
import ChatInput, { type ChatSendOptions } from "./ChatInput";
import AppShell from "@/components/layout/AppShell";
import { parseChatEvents, type ChatEvent } from "@/lib/chat-events";
import type { GroundingSource } from "@/lib/gemini/grounding";

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt?: string;
  /** Thought-summary text (assistant only; local display data). */
  thinking?: string;
  /** Grounded web sources (assistant only; local display data). */
  sources?: GroundingSource[];
  /** Files attached to this message (user only; name + type, no data). */
  attachments?: { name: string; mimeType: string }[];
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

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const [conversations, setConversations] = useState<
    GuestChatConversation[]
  >(initialGuestState.conversations);

  const [activeConversationId, setActiveConversationId] =
    useState<string | null>(
      initialGuestState.activeConversationId
    );

  const [isTyping, setIsTyping] = useState(false);

  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

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
    setSidebarOpen(false);
  }, [handleStop]);

  // Select a conversation.
  const handleSelectConversation = useCallback(
    (id: string) => {
      handleStop();
      setActiveConversationId(id);
      setSidebarOpen(false);
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

  // Open the account area: settings for a signed-in user (sign-out
  // lives there, with failure messaging), /auth for a guest. This
  // used to sign a signed-in user out on the spot, with no
  // confirmation, from a button labelled with their email.
  const handleOpenAccount = useCallback(() => {
    if (user) {
      router.push("/settings");
    } else {
      router.push("/auth");
    }
  }, [user, router]);

  // Send a message and stream the response.
  const handleSend = async (
    prompt: string,
    options: ChatSendOptions
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
      ...(options.attachments.length > 0
        ? {
            attachments: options.attachments.map((attachment) => ({
              name: attachment.name,
              mimeType: attachment.mimeType,
            })),
          }
        : {}),
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

    // Preview falls back to the prompt when the streamed answer is
    // still empty (e.g. only thinking has arrived so far).
    const contentPreview = (conversation: GuestChatConversation) =>
      conversation.messages.find(
        (message) => message.id === assistantMessageId
      )?.content || trimmedPrompt;

    const updateAssistantMessage = (patch: {
      content?: string;
      thinking?: string;
      sources?: GroundingSource[];
    }) => {
      setConversations((prev) =>
        sortConversations(
          prev.map((conversation) => {
            if (conversation.id !== workingConversationId) {
              return conversation;
            }

            return {
              ...conversation,
              preview: patch.content ?? contentPreview(conversation),
              updatedAt: createTimestamp(),
              messages: conversation.messages.map((message) =>
                message.id === assistantMessageId
                  ? { ...message, ...patch }
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
          ...(await getAuthHeaders()),
        },
        body: JSON.stringify({
          prompt: trimmedPrompt,
          mode: options.mode,
          thinking: options.thinking,
          web: options.web,
          events: true,
          useOwnKey: shouldUseOwnKey(),
          attachments: options.attachments,
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

      // The route sends NDJSON events when `events: true` (thinking /
      // text / sources / error / done) and plain text otherwise. The
      // Content-Type decides the parser — never guess per chunk, or a
      // half-delivered event line would leak into the answer as text.
      const isNdjson = (response.headers.get("content-type") ?? "")
        .includes("ndjson");

      let streamedThinking = "";
      let streamedSources: GroundingSource[] = [];
      let ndjsonRemainder = "";

      const applyEvent = (event: ChatEvent) => {
        switch (event.t) {
          case "thinking":
            streamedThinking += event.text;
            updateAssistantMessage({ thinking: streamedThinking });
            break;
          case "text":
            streamedText += event.text;
            updateAssistantMessage({ content: streamedText });
            break;
          case "sources":
            streamedSources = event.sources;
            updateAssistantMessage({ sources: streamedSources });
            break;
          case "error":
            throw new Error(event.message);
          case "done":
            break;
        }
      };

      while (!request.stopped) {
        const { value, done } = await reader.read();

        if (request.stopped || done) {
          break;
        }

        if (value) {
          const chunkText = decoder.decode(value, { stream: true });

          if (isNdjson) {
            const parsed = parseChatEvents(ndjsonRemainder + chunkText);
            ndjsonRemainder = parsed.remainder;
            for (const event of parsed.events) {
              applyEvent(event);
            }
          } else {
            streamedText += chunkText;
            updateAssistantMessage({ content: streamedText });
          }
        }
      }

      // Flush any remaining decoded text only if not stopped.
      if (!request.stopped) {
        const tail = decoder.decode();

        if (tail) {
          if (isNdjson) {
            const parsed = parseChatEvents(ndjsonRemainder + tail);
            for (const event of parsed.events) {
              applyEvent(event);
            }
          } else {
            streamedText += tail;
            updateAssistantMessage({ content: streamedText });
          }
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
          updateAssistantMessage({ content: streamedText });
        } else {
          updateAssistantMessage({ content: "Response stopped." });
        }

        return true;
      }

      console.error("Chat streaming error:", error);

      const errorMessage =
        error instanceof Error
          ? error.message
          : "Something went wrong while generating the response.";

      updateAssistantMessage({
        content: streamedText.trim()
          ? `${streamedText}\n\n[Response interrupted. Please try again.]`
          : errorMessage,
      });

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
    <AppShell>
      <div className="flex h-[calc(100vh-68px)] min-h-0 w-full overflow-hidden bg-transparent">
        {/* DESKTOP SIDEBAR */}
        <aside
          className={`
            hidden
            h-full
            min-h-0
            shrink-0
            overflow-hidden
            border-r
            border-[#3F3F46]
            bg-[#18181B]
            md:flex
            md:flex-col
            ${sidebarCollapsed ? "w-[68px]" : "w-64"}
          `}
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
              onCollapse={setSidebarCollapsed}
              onOpenSettings={() => router.push("/settings")}
              onOpenAccount={handleOpenAccount}
              userName={authLoading ? "Loading…" : user?.email ?? "Guest"}
              plan={authLoading ? "Checking your account…" : user ? "Cloud sync on" : "Local workspace"}
            />
          </div>
        </aside>

        {/* MOBILE SIDEBAR */}
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
                  onOpenSettings={() => router.push("/settings")}
                  onOpenAccount={handleOpenAccount}
                  userName={authLoading ? "Loading…" : user?.email ?? "Guest"}
                  plan={authLoading ? "Checking your account…" : user ? "Cloud sync on" : "Local workspace"}
                />
              </div>
            </aside>
          </div>
        )}

        {/* MAIN CHAT */}
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

          {/* Dark scrim: the raw video is bright and busy, and without
              this the empty-state text washed out over the bright
              circuit-board frames. */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 bg-[#09090B]/70"
          />

          <div className="relative z-10 flex min-h-0 flex-1 flex-col overflow-hidden">
            {/* MOBILE HEADER */}
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

            {/* MESSAGES */}
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

            {/* INPUT */}
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