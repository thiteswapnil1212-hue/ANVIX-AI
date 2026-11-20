
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
import Link from "next/link";
import Image from "next/image";
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
  recordApproval,
  type ApprovalEntry,
} from "@/components/agi/ApprovalsHistory";
import type { ApprovalRequest } from "@/lib/web-agent/types";

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

/**
 * Dashboard "Recent chats" deep-link: the dashboard stores the thread
 * id in `anvix-open-thread` and routes here; open that thread. A
 * module-level helper (same shape as readGuestChats) so the component's
 * useMemo stays a single call — inline storage access in the memo
 * breaks React Compiler memoization. The key is only READ here; the
 * mount effect in ChatLayout removes it.
 */
const readGuestChatsWithDeepLink = (): StoredGuestChats => {
  const state = readGuestChats();

  if (typeof window === "undefined") {
    return state;
  }

  try {
    const openId = window.localStorage.getItem("anvix-open-thread");

    if (
      openId &&
      state.conversations.some(
        (conversation) => conversation.id === openId
      )
    ) {
      return { ...state, activeConversationId: openId };
    }
  } catch {
    // Storage failure — fall back to the saved active thread.
  }

  return state;
};

export default function ChatLayout() {
  const initialGuestState = useMemo<StoredGuestChats>(
    () => readGuestChatsWithDeepLink(),
    []
  );

  // Consume the deep-link key once, after mount.
  useEffect(() => {
    try {
      window.localStorage.removeItem("anvix-open-thread");
    } catch {
      // Best-effort — a stale key just re-opens the same thread once.
    }
  }, []);

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

  // Unread-approval badge (§4.2): a blue dot on the panel toggle while
  // an approval arrived since the panel was last opened. Clears when
  // the panel opens. The panel never auto-opens mid-task.
  const LAST_SEEN_KEY = "anvix-approvals-last-seen";
  const [lastSeenApprovalAt, setLastSeenApprovalAt] =
    useState<string>(() => {
      if (typeof window === "undefined") {
        return "";
      }

      try {
        return (
          window.localStorage.getItem(LAST_SEEN_KEY) ?? ""
        );
      } catch {
        return "";
      }
    });

  const hasUnreadApproval = approvals.some(
    (entry) => entry.createdAt > lastSeenApprovalAt
  );

  const togglePanel = useCallback(() => {
    setApprovals(readApprovals());

    const willOpen = isDesktop ? !panelOpen : !mobilePanelOpen;

    if (willOpen) {
      const now = createTimestamp();
      setLastSeenApprovalAt(now);

      try {
        window.localStorage.setItem(LAST_SEEN_KEY, now);
      } catch {
        // Best-effort — the dot just stays until the next open.
      }
    }

    if (isDesktop) {
      setPanelOpen((open) => !open);
    } else {
      setMobilePanelOpen((open) => !open);
    }
  }, [isDesktop, panelOpen, mobilePanelOpen]);

  const closePanel = useCallback(() => {
    setPanelOpen(false);
    setMobilePanelOpen(false);
  }, []);

  // "Connected" = a real /api/chat (or web-task) stream has yielded
  // real text. Starts false — the panel must not claim Connected
  // before any call has ever succeeded. No new API.
  const [chatConnected, setChatConnected] = useState(false);

  const [conversations, setConversations] = useState<
    GuestChatConversation[]
  >(initialGuestState.conversations);

  const [activeConversationId, setActiveConversationId] =
    useState<string | null>(
      initialGuestState.activeConversationId
    );

  const [isTyping, setIsTyping] = useState(false);

  // Web-task mode: the next message goes to /api/web-agent/stream
  // (real browser) instead of /api/chat. Off by default.
  const [webTaskMode, setWebTaskMode] = useState(false);
  // The approval the task is currently waiting on, if any.
  const [pendingApproval, setPendingApproval] =
    useState<ApprovalRequest | null>(null);

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

      // Connected is set only below, when a chunk yields real text —
      // never on a bare 200, and never on a stream error trailer.
      let streamError = false;

      while (!request.stopped) {
        const { value, done } = await reader.read();

        if (request.stopped || done) {
          break;
        }

        if (value) {
          const chunk = decoder.decode(value, {
            stream: true,
          });

          // Mid-stream Gemini failure: the route sends a distinct
          // [STREAM_ERROR] marker (older builds sent the plain-text
          // "[An error occurred while generating the response.]"
          // trailer). Either marker means "not connected" — strip it
          // and fail below instead of showing it as a reply.
          const hasMarker =
            chunk.includes("[STREAM_ERROR]") ||
            chunk.includes(
              "[An error occurred while generating the response.]"
            );

          if (hasMarker) {
            streamError = true;
          }

          const cleanChunk = chunk
            .replace("[STREAM_ERROR]", "")
            .replace(
              "[An error occurred while generating the response.]",
              ""
            );

          streamedText += cleanChunk;

          if (cleanChunk.trim()) {
            setChatConnected(true);
          }

          updateAssistantMessage(streamedText);
        }
      }

      // Flush any remaining decoded text only if not stopped.
      if (!request.stopped) {
        const tail = decoder.decode();

        if (tail) {
          const hasMarker =
            tail.includes("[STREAM_ERROR]") ||
            tail.includes(
              "[An error occurred while generating the response.]"
            );

          if (hasMarker) {
            streamError = true;
          }

          const cleanTail = tail
            .replace("[STREAM_ERROR]", "")
            .replace(
              "[An error occurred while generating the response.]",
              ""
            );

          streamedText += cleanTail;

          if (cleanTail.trim()) {
            setChatConnected(true);
          }

          if (streamedText) {
            updateAssistantMessage(streamedText);
          }
        }
      }

      if (request.stopped) {
        return true;
      }

      if (streamError) {
        throw new Error(
          "Gemini failed while generating the response."
        );
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

  // Send a web task: stream /api/web-agent/stream instead of /api/chat.
  // The conversation setup mirrors handleSend on purpose — the two paths
  // must never break each other, so they do not share the setup code.
  // One parameter is enough: a web task ignores the chat model picker.
  // (A two-parameter function would also type-check as onSend, but the
  // unused second parameter trips the repo's no-unused-vars lint rule.)
  const handleWebTask = async (prompt: string): Promise<boolean> => {
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

    let progressText = "";
    const decoder = new TextDecoder();
    let buffer = "";

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

    const appendProgress = (line: string) => {
      progressText = progressText ? `${progressText}\n${line}` : line;
      updateAssistantMessage(progressText);
    };

    try {
      const response = await fetch("/api/web-agent/stream", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ task: trimmedPrompt }),
        signal: controller.signal,
      });

      if (request.stopped) {
        return true;
      }

      if (!response.ok) {
        let errorMessage = "Web task failed.";

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

      while (!request.stopped) {
        const { value, done } = await reader.read();

        if (request.stopped || done) {
          break;
        }

        if (!value) {
          continue;
        }

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.trim()) {
            continue;
          }

          let event: Record<string, unknown>;
          try {
            event = JSON.parse(line) as Record<string, unknown>;
          } catch {
            continue;
          }

          if (event.type === "planning") {
            appendProgress("Planning the steps…");
          } else if (event.type === "step_complete") {
            appendProgress(`• ${String(event.detail ?? "")}`);
          } else if (event.type === "approval_needed") {
            const approval = event.approval as ApprovalRequest;
            setPendingApproval(approval);
            appendProgress(
              `Waiting for your approval — ${approval.title}`
            );
          } else if (event.type === "task_complete") {
            const result = event.result as
              | { message?: unknown }
              | undefined;
            if (
              result &&
              typeof result.message === "string" &&
              result.message.trim()
            ) {
              progressText = result.message;
              updateAssistantMessage(result.message);
            }
          } else if (event.type === "error") {
            const message = String(event.message ?? "Web task failed.");
            if (/api key/i.test(message)) {
              setChatConnected(false);
            }
            throw new Error(message);
          }
        }
      }

      if (request.stopped) {
        return true;
      }

      if (!progressText.trim()) {
        throw new Error("Web task returned no result.");
      }

      return true;
    } catch (error) {
      if (
        request.stopped ||
        (error instanceof Error && error.name === "AbortError")
      ) {
        if (progressText.trim()) {
          updateAssistantMessage(progressText);
        } else {
          updateAssistantMessage("Response stopped.");
        }

        return true;
      }

      console.error("Web task streaming error:", error);

      const errorMessage =
        error instanceof Error
          ? error.message
          : "Something went wrong while running the web task.";

      updateAssistantMessage(
        progressText.trim()
          ? `${progressText}\n\n[Web task interrupted. Please try again.]`
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

      setPendingApproval(null);
    }
  };

  // Answer an approval prompt: tell the server, then record the
  // decision in the Approvals history panel.
  const handleApprovalDecision = async (
    decision: "allowed" | "denied"
  ) => {
    if (!pendingApproval) {
      return;
    }

    const approval = pendingApproval;
    setPendingApproval(null);

    try {
      await fetch("/api/web-agent/approve", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          runId: approval.runId,
          approvalId: approval.id,
          decision,
        }),
      });
    } catch {
      // The run may already have timed out — it reports that itself.
    }

    const entry = recordApproval({
      title: approval.title,
      description: approval.description,
      icon: "globe",
      status: decision,
    });
    setApprovals((prev) => [entry, ...prev]);
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
          userName={user?.email ?? "Guest"}
          userEmail={user?.email ?? undefined}
          accountState={
            user
              ? "Cloud sync on"
              : "Guest — chats stay in this browser"
          }
          signedIn={!!user}
          onSignIn={() => router.push("/auth")}
          onSignOut={() => void signOut()}
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
          <header className="flex h-14 shrink-0 items-center gap-3 border-b border-border bg-app-bg px-3 sm:px-4">
            {/* Plain circular back button (Muse §2.3) — back to home. */}
            <Link
              href="/"
              aria-label="Back to home"
              title="Back to home"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-surface-2 text-ink transition-colors hover:bg-surface-3 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-action"
            >
              <ArrowLeft className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
            </Link>

            <button
              type="button"
              onClick={() => setDrawerOpen(true)}
              aria-label="Switch conversation"
              title="Switch conversation"
              className="flex min-w-0 items-center gap-2.5 rounded-full bg-surface-2 px-4 py-2 text-sm text-white transition-colors hover:bg-surface-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-action"
            >
              <span
                aria-hidden="true"
                className="h-2 w-2 shrink-0 rounded-full bg-action"
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
              className={`relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-action ${
                panelOpen || mobilePanelOpen
                  ? "bg-surface-active text-white"
                  : "bg-surface-2 text-ink-muted hover:bg-surface-3 hover:text-white"
              }`}
            >
              <PanelRight className="h-4 w-4" strokeWidth={1.8} aria-hidden="true" />
              {hasUnreadApproval && !(panelOpen || mobilePanelOpen) && (
                <span
                  aria-hidden="true"
                  className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-action"
                />
              )}
            </button>
          </header>

          {/* MESSAGES */}
          <div className="min-h-0 flex-1 overflow-hidden bg-app-bg">
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
                    overflow-hidden
                    rounded-2xl
                    border
                    border-white/10
                    bg-surface-1
                  "
                >
                  <Image
                    src="/logo.png"
                    alt="AGI"
                    width={56}
                    height={56}
                    className="h-full w-full object-cover"
                  />
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
                    Chat with Gemini 2.5 Flash, or switch on Web task
                    and let AGI use a real browser on this computer — it
                    always asks before it sends, submits, or signs in.
                  </p>

                  <div className="mx-auto mt-8 flex max-w-2xl flex-wrap items-center justify-center gap-2">
                    {[
                      {
                        label: "Explain a topic",
                        webTask: false,
                      },
                      {
                        label: "Draft a message",
                        webTask: false,
                      },
                      {
                        label: "Open a website and summarise it",
                        webTask: true,
                      },
                      {
                        label: "Find something on the web",
                        webTask: true,
                      },
                    ].map(({ label, webTask }) => (
                      <button
                        key={label}
                        type="button"
                        onClick={() => {
                          if (webTask) {
                            setWebTaskMode(true);
                            void handleWebTask(label);
                          } else {
                            void handleSend(
                              label,
                              DEFAULT_CHAT_MODEL_ID
                            );
                          }
                        }}
                        className="rounded-full border border-white/10 bg-surface-2 px-4 py-2 text-[13px] text-zinc-300 transition hover:border-white/25 hover:bg-surface-3 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
                      >
                        {label}
                      </button>
                    ))}
                  </div>

                  <p className="mx-auto mt-8 max-w-2xl text-xs leading-5 text-zinc-600">
                    Powered by Gemini 2.5 Flash · Guest mode — chats stay
                    in this browser unless you sign in.
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
              bg-app-bg
              px-3
              pt-4
              sm:px-6
              sm:py-4
            "
          >
            {pendingApproval && (
              <div className="mx-auto mb-3 w-full max-w-3xl rounded-2xl border border-action bg-[#113254]/40 p-4">
                <p className="text-sm font-semibold text-white">
                  Approval needed
                </p>
                <p className="mt-0.5 text-xs text-ink-muted">
                  Paused — waiting for you
                </p>
                <p className="mt-2 text-sm text-zinc-200">
                  {pendingApproval.title}
                </p>
                <p className="mt-1 text-[13px] leading-6 text-zinc-400">
                  {pendingApproval.description}
                </p>
                <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                  <button
                    type="button"
                    onClick={() => void handleApprovalDecision("allowed")}
                    className="w-full rounded-full bg-action px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-action-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60 sm:w-auto"
                  >
                    Allow
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleApprovalDecision("denied")}
                    className="w-full rounded-full bg-surface-2 px-4 py-2 text-sm font-medium text-zinc-200 transition-colors hover:bg-surface-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60 sm:w-auto"
                  >
                    Deny
                  </button>
                </div>
              </div>
            )}

            <div className="mx-auto w-full max-w-3xl">
              <ChatInput
                onSend={webTaskMode ? handleWebTask : handleSend}
                isGenerating={isTyping}
                onStop={handleStop}
                webTaskMode={webTaskMode}
                onToggleWebTask={() =>
                  setWebTaskMode((mode) => !mode)
                }
                disabled={pendingApproval !== null}
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
