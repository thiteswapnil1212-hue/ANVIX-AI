
"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Menu, X } from "lucide-react";

import { useAuth } from "@/components/auth/AuthProvider";
import { getAuthHeaders } from "@/lib/api/auth-headers";
import { shouldUseOwnKey } from "@/lib/byok/client";
import {
  deleteCloudConversation,
  fetchConversationList,
  fetchConversationMessages,
  syncConversation,
  syncConversationMeta,
  type CloudConversation as CloudConversationShape,
} from "@/lib/supabase/cloud";
import {
  readNudgeDismissed,
  shouldShowSignInNudge,
  writeNudgeDismissed,
} from "@/lib/chat/guest-nudge";
import { cleanPreviewText } from "@/lib/chat/preview-text";
import { recordSessionUsage } from "@/lib/usage/session-usage";
import {
  conversationMessagesKey,
  createTimestamp,
  persistGuestState,
  readConversationMessages,
  readGuestState,
  sortConversations,
  toMeta,
  type GuestChatConversation,
  type GuestChatMessage,
  type GuestChatMeta,
  type GuestChatState,
  type StreamingOverlay,
} from "@/lib/chat/guest-storage";

import ChatSidebar from "./ChatSidebar";
import MessageList from "./MessageList";
import ChatInput, { type ChatSendOptions } from "./ChatInput";
import ShareButton from "@/components/share/ShareButton";
import ArtifactViewer from "./ArtifactViewer";
import ResearchPanel from "./ResearchPanel";
import VoiceChatButton from "@/components/voice/VoiceChatButton";
import AppShell from "@/components/layout/AppShell";
import { parseChatEvents, type ChatEvent } from "@/lib/chat-events";
import { getPromptTemplate } from "@/lib/prompt-templates";
import {
  forkConversation,
  normalizeFolderName,
  normalizeTags,
} from "@/lib/chat-organization";
import {
  GeneratedImageError,
  requestGeneratedImage,
} from "@/lib/image-client";
import { shouldExtractNow } from "@/lib/memory";
import type { ChatArtifact } from "@/lib/artifacts";
import {
  isResearchTerminal,
  type ResearchRun,
} from "@/lib/research";

type Message = GuestChatMessage;

type ChatApiError = {
  error?: string;
};

type ActiveRequest = {
  controller: AbortController;
  reader: ReadableStreamDefaultReader<Uint8Array> | null;
  stopped: boolean;
};

/** In-flight streamed answer (hot path): lives in a ref, never in the store. */
type StreamingState = StreamingOverlay;

const generateChatTitle = (value: string) => {
  const cleaned = value.replace(/\s+/g, " ").trim();

  if (!cleaned) {
    return "New chat";
  }

  return cleaned.length > 32
    ? `${cleaned.slice(0, 32).trim()}...`
    : cleaned;
};

export default function ChatLayout() {
  const initialGuestState = useMemo<GuestChatState>(
    () =>
      readGuestState(
        typeof window === "undefined" ? null : window.localStorage
      ),
    []
  );

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Split state (perf): the metadata list + only the loaded messages.
  // Mount parses the index + the active conversation only; other
  // conversations load on demand when selected.
  const [conversationList, setConversationList] = useState<
    GuestChatMeta[]
  >(initialGuestState.list);

  const [messagesById, setMessagesById] = useState<
    Record<string, GuestChatMessage[]>
  >(initialGuestState.messagesById);

  const [activeConversationId, setActiveConversationId] =
    useState<string | null>(
      initialGuestState.activeConversationId
    );

  const [isTyping, setIsTyping] = useState(false);

  // A template picked on the empty state, seeded into the composer.
  const [composerSeed, setComposerSeed] = useState<{
    text: string;
    nonce: number;
  } | null>(null);

  const handleUseTemplate = useCallback((templateId: string) => {
    const template = getPromptTemplate(templateId);
    if (!template) return;
    setComposerSeed({
      text: template.prompt,
      nonce: Date.now(),
    });
  }, []);

  // Artifact open in the side panel (null = panel closed).
  const [openArtifact, setOpenArtifact] =
    useState<ChatArtifact | null>(null);

  // Deep research run shown in the side panel. The panel slot is
  // shared with artifacts: `sidePanel` says which one is visible;
  // a research run keeps polling in the background while an artifact
  // is on top, and its finished report also lands in chat history.
  const [sidePanel, setSidePanel] = useState<
    "artifact" | "research" | null
  >(null);
  const [researchRun, setResearchRun] =
    useState<ResearchRun | null>(null);
  const [researchBusy, setResearchBusy] = useState(false);
  const researchConversationIdRef = useRef<string | null>(null);
  const researchAdvanceFailuresRef = useRef(0);

  // Step 5 pagination: sidebar "show more" (the cloud list loads
  // 20 conversations per page) and MessageList "load earlier
  // messages" (cloud messages load 100 per conversation).
  const [hasMoreConversations, setHasMoreConversations] = useState(false);
  const [loadingMoreConversations, setLoadingMoreConversations] =
    useState(false);
  const [hasEarlierMessages, setHasEarlierMessages] = useState(false);
  const [loadingEarlierMessages, setLoadingEarlierMessages] =
    useState(false);

  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  // Cloud sync bookkeeping: which conversation snapshots are already in
  // Supabase, and which ids existed there (so deletions propagate).
  const cloudReadyRef = useRef(false);
  const syncedSnapshotsRef = useRef(new Map<string, string>());
  const knownCloudIdsRef = useRef(new Set<string>());
  const conversationListRef = useRef<GuestChatMeta[]>([]);
  const messagesByIdRef = useRef<Record<string, GuestChatMessage[]>>({});
  const cloudSyncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Per-conversation "load earlier" availability (a full 100-message
  // page means older messages may exist). Guests always hold the
  // whole conversation locally, so theirs is always false.
  const earlierAvailableRef = useRef(new Map<string, boolean>());
  // Persist bookkeeping: trailing-debounce timer + a flag for writes
  // that must skip the debounce (stream commits), + the 1 s interim
  // persist timer that bounds crash loss while a stream is active.
  const persistTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const persistNowRef = useRef(false);
  const interimPersistTimerRef = useRef<ReturnType<typeof setInterval> | null>(
    null
  );

  useEffect(() => {
    conversationListRef.current = conversationList;
  }, [conversationList]);
  useEffect(() => {
    messagesByIdRef.current = messagesById;
  }, [messagesById]);
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


  // Load one conversation's messages on demand: a guest reads its
  // per-conversation key, a signed-in user fetches the latest page
  // from the cloud. Already-loaded conversations are a no-op.
  const ensureMessagesLoaded = useCallback(
    async (id: string) => {
      if (messagesByIdRef.current[id] !== undefined) return;

      if (!user) {
        const messages = readConversationMessages(
          window.localStorage,
          id
        );
        setMessagesById((prev) => ({
          ...prev,
          [id]: messages ?? [],
        }));
        earlierAvailableRef.current.set(id, false);
        setHasEarlierMessages(false);
        return;
      }

      const fetched = await fetchConversationMessages(user.id, id);
      if (fetched === null) {
        setMessagesById((prev) => ({ ...prev, [id]: [] }));
        return;
      }
      setMessagesById((prev) => ({ ...prev, [id]: fetched }));
      earlierAvailableRef.current.set(id, fetched.length === 100);
      setHasEarlierMessages(fetched.length === 100);
      // These messages just came from the cloud, so the next sync
      // pass must not re-upload them as if they were local changes.
      const meta = conversationListRef.current.find(
        (conversation) => conversation.id === id
      );
      if (meta) {
        syncedSnapshotsRef.current.set(
          id,
          JSON.stringify({ ...meta, messages: fetched })
        );
      }
    },
    [user]
  );

  // On sign-in: load the conversation LIST first (metadata only,
  // latest 20), then the active conversation's messages on demand.
  // If the cloud is empty but this browser holds guest chats, import
  // them once so signing in never loses history.
  useEffect(() => {
    if (!user) {
      cloudReadyRef.current = false;
      return;
    }

    let cancelled = false;
    const userId = user.id;

    void (async () => {
      const list = await fetchConversationList(userId);
      if (cancelled || !list) return;

      const sortedList = sortConversations(list);

      if (list.length === 0 && conversationListRef.current.length > 0) {
        const local = conversationListRef.current;
        for (const meta of local) {
          const messages =
            readConversationMessages(window.localStorage, meta.id) ?? [];
          await syncConversation(
            userId,
            toCloudConversation({ ...meta, messages })
          );
        }
        syncedSnapshotsRef.current = new Map(
          local.map((meta) => {
            const messages =
              messagesByIdRef.current[meta.id] ??
              readConversationMessages(window.localStorage, meta.id) ??
              [];
            return [meta.id, JSON.stringify({ ...meta, messages })];
          })
        );
        knownCloudIdsRef.current = new Set(
          local.map((meta) => meta.id)
        );
        setHasMoreConversations(false);
        setHasEarlierMessages(false);
        cloudReadyRef.current = true;
        return;
      }

      if (list.length === 0) {
        syncedSnapshotsRef.current = new Map();
        knownCloudIdsRef.current = new Set();
        setHasMoreConversations(false);
        setHasEarlierMessages(false);
        cloudReadyRef.current = true;
        return;
      }

      setConversationList(sortedList);
      const activeId = sortedList[0]?.id ?? null;
      setActiveConversationId(activeId);

      const messages =
        activeId === null
          ? []
          : ((await fetchConversationMessages(userId, activeId)) ?? []);
      if (cancelled) return;
      if (activeId !== null) {
        setMessagesById((prev) => ({ ...prev, [activeId]: messages }));
        earlierAvailableRef.current.set(activeId, messages.length === 100);
        setHasEarlierMessages(messages.length === 100);
      } else {
        setHasEarlierMessages(false);
      }
      setHasMoreConversations(list.length === 20);
      syncedSnapshotsRef.current = new Map(
        sortedList.map((meta) => [
          meta.id,
          JSON.stringify({
            ...meta,
            messages: meta.id === activeId ? messages : [],
          }),
        ])
      );
      knownCloudIdsRef.current = new Set(
        sortedList.map((meta) => meta.id)
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
    const snapshotList = conversationList;
    const snapshotMessages = messagesById;

    cloudSyncTimerRef.current = setTimeout(() => {
      void (async () => {
        const currentIds = new Set<string>();

        for (const meta of snapshotList) {
          currentIds.add(meta.id);
          const messages = snapshotMessages[meta.id];
          const full: GuestChatConversation = {
            ...meta,
            messages: messages ?? [],
          };
          const serialized = JSON.stringify(full);
          if (syncedSnapshotsRef.current.get(meta.id) !== serialized) {
            // Loaded conversations sync fully; metadata-only ones
            // (messages not loaded yet) sync just the row.
            const ok =
              messages !== undefined
                ? await syncConversation(
                    userId,
                    toCloudConversation(full)
                  )
                : await syncConversationMeta(userId, meta);
            if (ok) {
              syncedSnapshotsRef.current.set(meta.id, serialized);
              knownCloudIdsRef.current.add(meta.id);
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
  }, [conversationList, messagesById, user]);

  const activeRequestRef = useRef<ActiveRequest | null>(null);

  // Streaming hot path (perf): streamed text accumulates in a ref and
  // flushes to React state at most every 100 ms. The `conversations`
  // store is written once per answer by commitStreaming(), never per
  // token — per-token store updates used to re-sort all conversations
  // and rewrite the whole history to localStorage on every chunk.
  const streamingRef = useRef<StreamingState | null>(null);
  const streamingFlushTimerRef = useRef<ReturnType<typeof setInterval> | null>(
    null
  );
  const [streamingSnapshot, setStreamingSnapshot] =
    useState<StreamingState | null>(null);

  const activeConversation = useMemo(() => {
    const meta =
      conversationList.find(
        (conversation) => conversation.id === activeConversationId
      ) ?? null;
    if (!meta) return null;
    return {
      ...meta,
      messages: messagesById[activeConversationId ?? ""] ?? [],
    };
  }, [conversationList, messagesById, activeConversationId]);

  // Displayed messages: during a stream, the in-flight assistant
  // message comes from the throttled snapshot, so only that row
  // re-renders; every other row keeps its object identity and stays
  // memo-skipped by MessageRow.
  const messages = useMemo(() => {
    const base = activeConversation?.messages ?? [];
    if (
      !streamingSnapshot ||
      streamingSnapshot.conversationId !== activeConversation?.id
    ) {
      return base;
    }
    return base.map((message) =>
      message.id === streamingSnapshot.messageId
        ? {
            ...message,
            content: streamingSnapshot.content,
            thinking: streamingSnapshot.thinking,
            sources: streamingSnapshot.sources,
          }
        : message
    );
  }, [activeConversation, streamingSnapshot]);

  // Guest sign-in nudge: guests chat freely, but once they have sent
  // 3 messages in this conversation a dismissible, non-blocking
  // reminder appears above the composer to sign in so their chats are
  // saved to their account. The banner stays until dismissed; the
  // dismissal is remembered in localStorage. Ignoring it changes
  // nothing — the guest keeps chatting as a guest.
  // Read the dismissal flag lazily with the same typeof-window guard
  // the guest-state read above uses (no effect: setting it in an
  // effect trips the set-state-in-effect lint rule).
  const [nudgeDismissed, setNudgeDismissed] = useState(
    () =>
      typeof window === "undefined"
        ? false
        : readNudgeDismissed(window.localStorage)
  );
  const guestUserMessageCount = useMemo(
    () => messages.filter((message) => message.role === "user").length,
    [messages]
  );
  const showSignInNudge = shouldShowSignInNudge({
    isGuest: !user && !authLoading,
    userMessageCount: guestUserMessageCount,
    dismissed: nudgeDismissed,
  });
  const dismissSignInNudge = useCallback(() => {
    writeNudgeDismissed(window.localStorage);
    setNudgeDismissed(true);
  }, []);

  // Persist guest chat history. Trailing-debounced 500 ms so a burst
  // of actions writes once, not per change; a stream commit sets
  // persistNowRef and skips the debounce (it is a single write).
  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const write = () => {
      try {
        persistGuestState(
          window.localStorage,
          conversationList,
          activeConversationId,
          messagesById
        );
      } catch (error) {
        console.warn("Unable to persist guest chat history.", error);
      }
    };

    if (persistNowRef.current) {
      persistNowRef.current = false;
      write();
      return;
    }

    if (persistTimerRef.current) {
      clearTimeout(persistTimerRef.current);
    }
    persistTimerRef.current = setTimeout(write, 500);
    return () => {
      if (persistTimerRef.current) {
        clearTimeout(persistTimerRef.current);
      }
    };
  }, [conversationList, activeConversationId, messagesById]);

  // Flush any pending persist when the page is hidden or unloaded, so
  // a crash or close never loses more than the debounce window. Reads
  // from refs so the unmount-only effect always sees current values.
  const activeConversationIdRef = useRef<string | null>(
    initialGuestState.activeConversationId
  );
  useEffect(() => {
    activeConversationIdRef.current = activeConversationId;
  }, [activeConversationId]);
  useEffect(() => {
    const flush = () => {
      if (persistTimerRef.current) {
        clearTimeout(persistTimerRef.current);
        persistTimerRef.current = null;
      }
      try {
        persistGuestState(
          window.localStorage,
          conversationListRef.current,
          activeConversationIdRef.current,
          messagesByIdRef.current,
          streamingRef.current
        );
      } catch (error) {
        console.warn("Unable to persist guest chat history.", error);
      }
    };
    const onPageHide = () => flush();
    const onVisibility = () => {
      if (document.hidden) flush();
    };
    window.addEventListener("pagehide", onPageHide);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("pagehide", onPageHide);
      document.removeEventListener("visibilitychange", onVisibility);
      flush();
    };
  }, []);

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

  // Create a new conversation. No entry is created until the first
  // message is sent: handleSend (and handleGenerateImage) create the
  // entry with a title and preview then. Creating an empty entry
  // here persisted blank "New chat" rows in history, and the
  // artifact panel from the previous conversation stayed open over
  // the empty one.
  const handleNewConversation = useCallback(() => {
    handleStop();

    setActiveConversationId(null);
    setHasEarlierMessages(false);
    setSidebarOpen(false);
    setOpenArtifact(null);
    setSidePanel(null);
  }, [handleStop]);

  // Select a conversation. Messages load on demand (guest key or
  // cloud page) the first time it is opened. The side panel belongs
  // to the previous conversation, so it closes here — otherwise an
  // artifact from the old chat stays open over the new one.
  const handleSelectConversation = useCallback(
    (id: string) => {
      handleStop();
      setActiveConversationId(id);
      setSidebarOpen(false);
      setOpenArtifact(null);
      setSidePanel(null);
      setHasEarlierMessages(earlierAvailableRef.current.get(id) ?? false);
      void ensureMessagesLoaded(id);
    },
    [handleStop, ensureMessagesLoaded]
  );

  // Rename a conversation.
  const handleRenameConversation = useCallback(
    (id: string, title: string) => {
      const trimmed = title.trim();

      if (!trimmed) {
        return;
      }

      setConversationList((prev) =>
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

  // Delete a conversation (also removes its messages key).
  const handleDeleteConversation = useCallback(
    (id: string) => {
      if (activeConversationId === id) {
        handleStop();
      }

      setMessagesById((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
      if (typeof window !== "undefined") {
        window.localStorage.removeItem(conversationMessagesKey(id));
      }

      setConversationList((prev) => {
        const remaining = prev.filter(
          (conversation) => conversation.id !== id
        );

        if (remaining.length === 0) {
          setActiveConversationId(null);
          setOpenArtifact(null);
          setSidePanel(null);
          return remaining;
        }

        if (activeConversationId === id) {
          setActiveConversationId(remaining[0].id);
          setOpenArtifact(null);
          setSidePanel(null);
          setHasEarlierMessages(
            earlierAvailableRef.current.get(remaining[0].id) ?? false
          );
          void ensureMessagesLoaded(remaining[0].id);
        }

        return remaining;
      });
    },
    [activeConversationId, handleStop, ensureMessagesLoaded]
  );

  // Pin or unpin a conversation.
  const handleTogglePin = useCallback((id: string) => {
    setConversationList((prev) =>
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

  // Sidebar "show more": fetch the next 20-conversation page,
  // cursoring on the oldest loaded conversation's updated_at.
  // De-dupe by id: a conversation updated between pages can
  // straddle the boundary.
  const handleLoadMoreConversations = useCallback(async () => {
    if (!user || loadingMoreConversations) return;
    setLoadingMoreConversations(true);
    try {
      const oldest =
        conversationListRef.current[
          conversationListRef.current.length - 1
        ];
      const page = await fetchConversationList(user.id, {
        before: oldest?.updatedAt,
      });
      if (!page) return;
      const existingIds = new Set(
        conversationListRef.current.map((meta) => meta.id)
      );
      const fresh = page.filter((meta) => !existingIds.has(meta.id));
      if (fresh.length > 0) {
        setConversationList((prev) =>
          sortConversations([...prev, ...fresh])
        );
      }
      setHasMoreConversations(page.length === 20);
    } finally {
      setLoadingMoreConversations(false);
    }
  }, [user, loadingMoreConversations]);

  // MessageList "load earlier messages": fetch the next 100-message
  // page older than the oldest loaded message and prepend it.
  const handleLoadEarlierMessages = useCallback(async () => {
    const id = activeConversationIdRef.current;
    if (!id || !user || loadingEarlierMessages) return;
    const current = messagesByIdRef.current[id] ?? [];
    const oldest = current[0];
    if (!oldest?.createdAt) return;
    setLoadingEarlierMessages(true);
    try {
      const page = await fetchConversationMessages(user.id, id, {
        before: oldest.createdAt,
      });
      if (!page || page.length === 0) {
        earlierAvailableRef.current.set(id, false);
        setHasEarlierMessages(false);
        return;
      }
      const existingIds = new Set(current.map((message) => message.id));
      const fresh = page.filter((message) => !existingIds.has(message.id));
      setMessagesById((prev) => ({
        ...prev,
        [id]: [...fresh, ...(prev[id] ?? [])],
      }));
      earlierAvailableRef.current.set(id, page.length === 100);
      setHasEarlierMessages(page.length === 100);
    } finally {
      setLoadingEarlierMessages(false);
    }
  }, [user, loadingEarlierMessages]);

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

  // Move a conversation into a folder (null = no folder).
  const handleSetFolder = useCallback(
    (id: string, folder: string | null) => {
      setConversationList((prev) =>
        prev.map((conversation) =>
          conversation.id === id
            ? {
                ...conversation,
                folder: normalizeFolderName(folder),
                updatedAt: createTimestamp(),
              }
            : conversation
        )
      );
    },
    []
  );

  // Append one message to a conversation (research flow helper).
  const appendMessageToConversation = useCallback(
    (conversationId: string, message: Message) => {
      setMessagesById((prev) => ({
        ...prev,
        [conversationId]: [...(prev[conversationId] ?? []), message],
      }));
      setConversationList((prev) =>
        sortConversations(
          prev.map((conversation) =>
            conversation.id === conversationId
              ? {
                  ...conversation,
                  updatedAt: createTimestamp(),
                }
              : conversation
          )
        )
      );
    },
    []
  );

  // Replace a conversation's tags (normalized, de-duplicated).
  const handleSetTags = useCallback((id: string, tags: string[]) => {
    setConversationList((prev) =>
      prev.map((conversation) =>
        conversation.id === id
          ? {
              ...conversation,
              tags: normalizeTags(tags),
              updatedAt: createTimestamp(),
            }
          : conversation
      )
    );
  }, []);

  // Branch/fork the active chat at one message: copy the messages up
  // to and including it into a new chat and switch to it.
  const handleForkMessage = useCallback(
    (messageId: string) => {
      if (!activeConversation) return;
      handleStop();
      const forked = forkConversation(
        activeConversation,
        messageId,
        crypto.randomUUID(),
        createTimestamp()
      );
      if (!forked) return;
      // forkedAtMessageId rides along as fork bookkeeping; it is not
      // part of the stored conversation shape and is dropped by the
      // cloud sync (which upserts explicit columns only).
      const next: GuestChatConversation = forked;
      setConversationList((prev) =>
        sortConversations([toMeta(next), ...prev])
      );
      setMessagesById((prev) => ({ ...prev, [next.id]: next.messages }));
      setActiveConversationId(next.id);
    },
    [activeConversation, handleStop]
  );

  // Generate an image for a prompt and append it as an assistant
  // message (rendered like an attachment). Failures become an honest
  // assistant message, never a silent gap — the free lane is busy
  // or down often enough that the user must see why.
  const handleGenerateImage = useCallback(
    async (prompt: string): Promise<boolean> => {
      const trimmedPrompt = prompt.trim();
      if (!trimmedPrompt || activeRequestRef.current) return false;

      const timestamp = createTimestamp();
      let workingConversationId = activeConversationId;

      if (!workingConversationId) {
        workingConversationId = crypto.randomUUID();
        // Const capture: TS does not carry `let` narrowing into the
        // updater closure below.
        const newId = workingConversationId;
        const newMeta: GuestChatMeta = {
          id: workingConversationId,
          title: generateChatTitle(trimmedPrompt),
          preview: trimmedPrompt,
          createdAt: timestamp,
          updatedAt: timestamp,
          pinned: false,
        };
        setConversationList((prev) =>
          sortConversations([newMeta, ...prev])
        );
        setMessagesById((prev) => ({
          ...prev,
          [newId]: [],
        }));
        setActiveConversationId(workingConversationId);
        // A fresh conversation replaces the previous one: its
        // artifact panel does not carry over.
        setOpenArtifact(null);
        setSidePanel(null);
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

      setMessagesById((prev) => ({
        ...prev,
        [workingConversationId]: [
          ...(prev[workingConversationId] ?? []),
          userMessage,
          assistantMessage,
        ],
      }));
      setConversationList((prev) =>
        prev.map((conversation) =>
          conversation.id === workingConversationId
            ? {
                ...conversation,
                preview: trimmedPrompt,
                updatedAt: timestamp,
              }
            : conversation
        )
      );

      const updateAssistantMessage = (patch: Partial<Message>) => {
        setMessagesById((prev) => ({
          ...prev,
          [workingConversationId]: (
            prev[workingConversationId] ?? []
          ).map((message) =>
            message.id === assistantMessageId
              ? { ...message, ...patch }
              : message
          ),
        }));
        setConversationList((prev) =>
          prev.map((conversation) =>
            conversation.id === workingConversationId
              ? {
                  ...conversation,
                  updatedAt: createTimestamp(),
                }
              : conversation
          )
        );
      };

      try {
        const image = await requestGeneratedImage(trimmedPrompt);
        updateAssistantMessage({ generatedImage: image });
        // Session usage, as above: an image that actually came back.
        recordSessionUsage("generate");
        return true;
      } catch (error) {
        const message =
          error instanceof GeneratedImageError
            ? error.message
            : "Image generation failed. Please try again.";
        updateAssistantMessage({ content: message });
        return true;
      }
    },
    [activeConversationId]
  );

  // Memory v2 extraction, batched: at most once per 6 user turns in a
  // chat (never per message), fire-and-forget. Guests have no user to
  // attach memories to, so this never runs for them. A failed call is
  // invisible — a missing memory is never an error the user sees.
  const extractedTurnsRef = useRef<Set<string>>(new Set());
  const maybeExtractMemories = useCallback(
    (
      conversationId: string,
      userTurnCount: number,
      transcript: { role: "user" | "assistant"; content: string }[]
    ) => {
      if (!user) return;
      if (!shouldExtractNow(userTurnCount, null)) return;
      const key = `${conversationId}:${userTurnCount}`;
      if (extractedTurnsRef.current.has(key)) return;
      extractedTurnsRef.current.add(key);

      void (async () => {
        try {
          await fetch("/api/memory/extract", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              ...(await getAuthHeaders()),
            },
            body: JSON.stringify({
              conversationId,
              messages: transcript.slice(-10),
            }),
          });
        } catch {
          // Best-effort: extraction failing must never surface in chat.
        }
      })();
    },
    [user]
  );
  // Advance one research step (one short server call). On `done` the
  // finished report is also appended to chat history, so it survives
  // the panel being closed. After 3 consecutive failed advances the
  // run is marked failed locally so polling stops instead of looping.
  const advanceResearch = useCallback(async (runId: string) => {
    setResearchBusy(true);
    try {
      const response = await fetch(`/api/research/${runId}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(await getAuthHeaders()),
        },
        body: JSON.stringify({ action: "advance" }),
      });

      if (!response.ok) throw new Error("Advance failed");

      const data = (await response.json()) as { run: ResearchRun };
      researchAdvanceFailuresRef.current = 0;
      const next = data.run;
      setResearchRun(next);

      if (next.status === "done" && next.reportMarkdown) {
        const conversationId = researchConversationIdRef.current;
        if (conversationId) {
          appendMessageToConversation(conversationId, {
            id: crypto.randomUUID(),
            role: "assistant",
            content: next.reportMarkdown,
            createdAt: createTimestamp(),
          });
        }
      }
    } catch (error) {
      console.error("Research advance failed:", error);
      researchAdvanceFailuresRef.current += 1;
      if (researchAdvanceFailuresRef.current >= 3) {
        setResearchRun((prev) =>
          prev && prev.id === runId
            ? {
                ...prev,
                status: "failed",
                error:
                  "Could not reach the research service. Retry from the panel.",
              }
            : prev
        );
      }
    } finally {
      setResearchBusy(false);
    }
  }, [appendMessageToConversation]);

  // Poll `advance` while the run is non-terminal (~2 s between steps).
  // Each advance is one short Gemini call; polling is what chunks the
  // run across requests instead of one long call.
  useEffect(() => {
    if (!researchRun || isResearchTerminal(researchRun.status)) return;
    const timer = setTimeout(() => {
      void advanceResearch(researchRun.id);
    }, 2000);
    return () => clearTimeout(timer);
  }, [researchRun, advanceResearch]);

  const cancelResearch = useCallback(async () => {
    if (!researchRun) return;
    setResearchBusy(true);
    try {
      const response = await fetch(`/api/research/${researchRun.id}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(await getAuthHeaders()),
        },
        body: JSON.stringify({ action: "cancel" }),
      });
      if (response.ok) {
        const data = (await response.json()) as { run: ResearchRun };
        setResearchRun(data.run);
      }
    } catch (error) {
      console.error("Research cancel failed:", error);
    } finally {
      setResearchBusy(false);
    }
  }, [researchRun]);

  const steerResearch = useCallback(
    async (direction: string) => {
      if (!researchRun) return;
      setResearchBusy(true);
      try {
        const response = await fetch(`/api/research/${researchRun.id}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(await getAuthHeaders()),
          },
          body: JSON.stringify({ action: "steer", direction }),
        });
        if (response.ok) {
          const data = (await response.json()) as { run: ResearchRun };
          setResearchRun(data.run);
        }
      } catch (error) {
        console.error("Research steer failed:", error);
      } finally {
        setResearchBusy(false);
      }
    },
    [researchRun]
  );

  // Closing the panel while a run is active cancels it — otherwise
  // a hidden run would keep burning quota with nobody watching.
  const handleCloseResearchPanel = useCallback(async () => {
    if (researchRun && !isResearchTerminal(researchRun.status)) {
      await cancelResearch();
    }
    setResearchRun(null);
    setSidePanel(null);
  }, [researchRun, cancelResearch]);

  // Start a scoped deep-research run instead of a normal chat reply.
  // Deep research takes its own path: POST /api/research, show the
  // run in the side panel, append the user question to history now
  // and the report when it finishes. Memoized so handleSend (which
  // delegates to it) stays referentially stable: it only changes
  // when the active conversation or the running research changes,
  // never per streamed chunk.
  const handleStartResearch = useCallback(
    async (prompt: string): Promise<boolean> => {
      if (researchRun && !isResearchTerminal(researchRun.status)) {
        return false;
      }

      let workingConversationId = activeConversationId;
    const timestamp = createTimestamp();

    if (!workingConversationId) {
      workingConversationId = crypto.randomUUID();
      // Const capture: TS does not carry `let` narrowing into the
      // updater closure below.
      const newId = workingConversationId;
      const newMeta: GuestChatMeta = {
        id: workingConversationId,
        title: generateChatTitle(prompt),
        preview: prompt,
        createdAt: timestamp,
        updatedAt: timestamp,
        pinned: false,
      };

      setConversationList((prev) =>
        sortConversations([newMeta, ...prev])
      );
      setMessagesById((prev) => ({
        ...prev,
        [newId]: [],
      }));
      setActiveConversationId(workingConversationId);
    }

    researchConversationIdRef.current = workingConversationId;

    appendMessageToConversation(workingConversationId, {
      id: crypto.randomUUID(),
      role: "user",
      content: prompt,
      createdAt: timestamp,
    });

    try {
      const response = await fetch("/api/research", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(await getAuthHeaders()),
        },
        body: JSON.stringify({ question: prompt }),
      });

      const data = (await response.json()) as {
        run?: ResearchRun;
        error?: string;
      };

      if (!response.ok || !data.run) {
        appendMessageToConversation(workingConversationId, {
          id: crypto.randomUUID(),
          role: "assistant",
          content:
            data.error ??
            "Could not start deep research. Please try again.",
          createdAt: createTimestamp(),
        });
        return true;
      }

      setResearchRun(data.run);
      setOpenArtifact(null);
      setSidePanel("research");
      return true;
    } catch (error) {
      console.error("Research start failed:", error);
      appendMessageToConversation(workingConversationId, {
        id: crypto.randomUUID(),
        role: "assistant",
        content: "Could not start deep research. Please try again.",
        createdAt: createTimestamp(),
      });
      return true;
    }
  }, [researchRun, activeConversationId, appendMessageToConversation]);

  const handleOpenSettings = useCallback(() => {
    router.push("/settings");
  }, [router]);

  // Stabilize the sidebar threads array: sortConversations returns a
  // new array identity on every setConversations, which defeats
  // ChatSidebar's memo and re-runs its grouping useMemo per chunk.
  // The signature covers exactly the fields the sidebar renders
  // (Thread: id/title/preview/updatedAt/pinned), so the mapped array
  // is rebuilt only when something visible changes.
  const sidebarSignature = useMemo(
    () =>
      conversationList
        .map(
          (conversation) =>
            `${conversation.id}|${conversation.title}|${conversation.preview}|${conversation.pinned ? 1 : 0}|${conversation.updatedAt}`
        )
        .join(";"),
    [conversationList]
  );
  const sidebarThreads = useMemo(
    () =>
      conversationList.map((conversation) => ({
        id: conversation.id,
        title: conversation.title,
        // Clean at display time too: previews stored before the
        // cleaning landed can still hold raw artifact markup.
        preview: cleanPreviewText(conversation.preview),
        updatedAt: conversation.updatedAt,
        pinned: conversation.pinned,
      })),
    // The signature string is the dep: the mapped array only changes
    // when a rendered field changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [sidebarSignature]
  );

  // Send a message and stream the response.
  const handleSend = useCallback(
    async (
      prompt: string,
      options: ChatSendOptions
    ): Promise<boolean> => {
    const trimmedPrompt = prompt.trim();

    if (!trimmedPrompt) {
      return false;
    }

    // Deep research takes a different path: no chat stream, a run in
    // the side panel instead.
    if (options.research) {
      return handleStartResearch(trimmedPrompt);
    }

    if (activeRequestRef.current) {
      return false;
    }

    const controller = new AbortController();

    const request: ActiveRequest = {
      controller,
      reader: null,
      stopped: false,
    };

    activeRequestRef.current = request;

    // Session usage: the server meter reads a per-instance in-memory
    // limiter, so it usually shows 0 for guests — this browser's own
    // count is what the Settings meter merges in (display only).
    recordSessionUsage("chat");

    let workingConversationId = activeConversationId;
    const timestamp = createTimestamp();

    if (!workingConversationId) {
      workingConversationId = crypto.randomUUID();
      // Const capture: TS does not carry `let` narrowing into the
      // updater closure below.
      const newId = workingConversationId;

      const newMeta: GuestChatMeta = {
        id: workingConversationId,
        title: generateChatTitle(trimmedPrompt),
        preview: trimmedPrompt,
        createdAt: timestamp,
        updatedAt: timestamp,
        pinned: false,
        folder: null,
        tags: [],
      };

      setConversationList((prev) =>
        sortConversations([newMeta, ...prev])
      );
      setMessagesById((prev) => ({
        ...prev,
        [newId]: [],
      }));

      setActiveConversationId(workingConversationId);
      // A fresh conversation replaces the previous one: its artifact
      // panel does not carry over.
      setOpenArtifact(null);
      setSidePanel(null);
    }

    // Narrowed once here: the updaters below are closures, and TS
    // does not carry `let` narrowing into them.
    const targetConversationId = workingConversationId;

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
      comparePrompt: trimmedPrompt,
    };

    setMessagesById((prev) => ({
      ...prev,
      [targetConversationId]: [
        ...(prev[targetConversationId] ?? []),
        userMessage,
        assistantMessage,
      ],
    }));

    setConversationList((prev) =>
      sortConversations(
        prev.map((conversation) => {
          if (conversation.id !== targetConversationId) {
            return conversation;
          }

          const nextTitle =
            conversation.title === "New chat" ||
            (messagesByIdRef.current[targetConversationId]?.length ??
              0) === 0
              ? generateChatTitle(trimmedPrompt)
              : conversation.title;

          return {
            ...conversation,
            title: nextTitle,
            preview: trimmedPrompt,
            updatedAt: timestamp,
          };
        })
      )
    );

    setIsTyping(true);

    // Streamed text lives in a ref; React state flushes at most every
    // 100 ms and the store is written once by commitStreaming().
    streamingRef.current = {
      conversationId: targetConversationId,
      messageId: assistantMessageId,
      content: "",
      thinking: "",
      sources: [],
    };
    setStreamingSnapshot({ ...streamingRef.current });
    streamingFlushTimerRef.current = setInterval(() => {
      if (streamingRef.current) {
        setStreamingSnapshot({ ...streamingRef.current });
      }
    }, 100);

    // Interim persist (1 s) while streaming: bounds crash loss to ~1 s
    // of streamed text, since the store is only written on commit.
    interimPersistTimerRef.current = setInterval(() => {
      try {
        persistGuestState(
          window.localStorage,
          conversationListRef.current,
          targetConversationId,
          messagesByIdRef.current,
          streamingRef.current
        );
      } catch (error) {
        console.warn("Unable to persist guest chat history.", error);
      }
    }, 1000);

    // Write the finished answer to the store exactly once, on every
    // exit path. A second call is a no-op (the ref is cleared first).
    const commitStreaming = (finalContent: string) => {
      const current = streamingRef.current;
      streamingRef.current = null;
      setStreamingSnapshot(null);
      if (!current) return;
      // Skip the 500 ms persist debounce: a commit is a single write.
      persistNowRef.current = true;
      setMessagesById((prev) => ({
        ...prev,
        [current.conversationId]: (prev[current.conversationId] ?? []).map(
          (message) =>
            message.id === current.messageId
              ? {
                  ...message,
                  content: finalContent,
                  thinking: current.thinking,
                  sources: current.sources,
                }
              : message
        ),
      }));
      setConversationList((prev) =>
        sortConversations(
          prev.map((conversation) =>
            conversation.id === current.conversationId
              ? {
                  ...conversation,
                  // Preview from the cleaned reply: the raw answer can
                  // be an artifact fence plus a whole HTML document,
                  // which would leak code into the sidebar. Fall back
                  // to the user prompt when nothing readable remains.
                  preview:
                    cleanPreviewText(finalContent).slice(0, 120) ||
                    trimmedPrompt,
                  updatedAt: createTimestamp(),
                }
              : conversation
          )
        )
      );
    };

    const decoder = new TextDecoder();

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
          assistantId: options.assistantId ?? null,
          assistant: options.assistant,
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

      let ndjsonRemainder = "";

      // Ref-only writes: no setConversations, no re-sort, no persist
      // per event. The 100 ms flush renders the latest snapshot.
      const applyEvent = (event: ChatEvent) => {
        const current = streamingRef.current;
        if (!current) return;
        switch (event.t) {
          case "thinking":
            current.thinking += event.text;
            break;
          case "text":
            current.content += event.text;
            break;
          case "sources":
            current.sources = event.sources;
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
          } else if (streamingRef.current) {
            streamingRef.current.content += chunkText;
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
          } else if (streamingRef.current) {
            streamingRef.current.content += tail;
          }
        }
      }

      if (request.stopped) {
        return true;
      }

      const finalText = streamingRef.current?.content ?? "";
      if (!finalText.trim()) {
        throw new Error("AI returned an empty response.");
      }

      commitStreaming(finalText);

      // Memory v2: this turn counts once the reply landed. The prior
      // user-turn count comes from the pre-send message list. Read it
      // from messagesByIdRef, not the `messages` closure: handleSend
      // is memoized (deps below), so the closure would go stale after
      // the first answer in a conversation — the ref is fresh at call
      // time. At this point the ref still holds the pre-send list
      // (commitStreaming's setState has not re-rendered yet), which is
      // exactly the list the extraction wants.
      const preSendMessages =
        messagesByIdRef.current[workingConversationId] ?? [];
      const priorUserTurns = preSendMessages.filter(
        (message) => message.role === "user"
      ).length;
      maybeExtractMemories(
        workingConversationId,
        priorUserTurns + 1,
        [
          ...preSendMessages.map((message) => ({
            role: message.role,
            content: message.content,
          })),
          { role: "user" as const, content: trimmedPrompt },
          { role: "assistant" as const, content: finalText },
        ]
      );

      return true;
    } catch (error) {
      if (
        request.stopped ||
        (error instanceof Error && error.name === "AbortError")
      ) {
        const partial = streamingRef.current?.content ?? "";
        commitStreaming(partial.trim() ? partial : "Response stopped.");

        return true;
      }

      console.error("Chat streaming error:", error);

      const errorMessage =
        error instanceof Error
          ? error.message
          : "Something went wrong while generating the response.";

      const partial = streamingRef.current?.content ?? "";
      commitStreaming(
        partial.trim()
          ? `${partial}\n\n[Response interrupted. Please try again.]`
          : errorMessage
      );

      return false;
    } finally {
      if (streamingFlushTimerRef.current) {
        clearInterval(streamingFlushTimerRef.current);
        streamingFlushTimerRef.current = null;
      }

      if (interimPersistTimerRef.current) {
        clearInterval(interimPersistTimerRef.current);
        interimPersistTimerRef.current = null;
      }

      // Backstop: commit whatever is still streaming (covers the stop
      // path and any exit that skipped the explicit commit). The guard
      // inside commitStreaming makes a second call a no-op.
      const pending = streamingRef.current;
      if (pending) {
        commitStreaming(pending.content);
      }

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
    // Deps are the stable values only: handleStartResearch and
    // maybeExtractMemories are memoized callbacks (they change on
    // research/user change, never per chunk). `messages` is
    // deliberately NOT a dep — the extraction above reads the fresh
    // list from messagesByIdRef instead, so this callback stays
    // referentially stable across streamed chunks and ChatInput
    // does not re-render per chunk.
  }, [activeConversationId, handleStartResearch, maybeExtractMemories]);

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
              threads={sidebarThreads}
              hasMoreThreads={user !== null && hasMoreConversations}
              loadingMoreThreads={loadingMoreConversations}
              onLoadMoreThreads={handleLoadMoreConversations}
              activeThread={activeConversationId ?? ""}
              onSelectThread={handleSelectConversation}
              onNewThread={handleNewConversation}
              onRenameThread={handleRenameConversation}
              onDeleteThread={handleDeleteConversation}
              onTogglePin={handleTogglePin}
              onCollapse={setSidebarCollapsed}
              onSetFolder={handleSetFolder}
              onSetTags={handleSetTags}
              onOpenSettings={handleOpenSettings}
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
                  threads={sidebarThreads}
                  hasMoreThreads={user !== null && hasMoreConversations}
                  loadingMoreThreads={loadingMoreConversations}
                  onLoadMoreThreads={handleLoadMoreConversations}
                  activeThread={activeConversationId ?? ""}
                  onSelectThread={handleSelectConversation}
                  onNewThread={handleNewConversation}
                  onRenameThread={handleRenameConversation}
                  onDeleteThread={handleDeleteConversation}
                  onTogglePin={handleTogglePin}
              onSetFolder={handleSetFolder}
              onSetTags={handleSetTags}
                  onOpenSettings={handleOpenSettings}
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
          {/* Dark scrim: keeps the empty-state text readable over the
              background glow. */}
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

            {/* MESSAGES + INPUT with the artifact side panel */}
            <div className="flex min-h-0 flex-1 overflow-hidden">
              <div className="relative flex min-w-0 flex-1 flex-col overflow-hidden">
            {/* DESKTOP TOOLBAR — conversation title + share. An
                overlay at the top of the message area, not in-flow,
                so it costs no vertical space; the message list's
                top padding clears it. The background is a gradient
                — solid where the title and Share sit, fading to
                transparent at the bottom — so scrolling text
                visibly slides under it (ChatGPT-style) instead of
                vanishing behind a solid bar. At rest the first row
                sits below the bar, so no message text ever sits
                under it while still. */}
            {messages.length > 0 && activeConversationId && (
              <div className="absolute inset-x-0 top-0 z-20 hidden h-11 items-center justify-between bg-[linear-gradient(to_bottom,#0B0B0C_0%,#0B0B0C_55%,transparent_100%)] px-4 md:flex">
                <p className="min-w-0 truncate text-xs font-medium text-zinc-300">
                  {activeConversation?.title ?? "Chat"}
                </p>
                <ShareButton
                  resourceType="chat"
                  resourceId={activeConversationId}
                  resourceLabel="chat"
                />
              </div>
            )}
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

                    {/* Starter templates — one tap fills the composer. */}
                    <div className="mx-auto mt-8 flex max-w-2xl flex-wrap items-center justify-center gap-2">
                      {[
                        "cold-email",
                        "explain-code",
                        "dsa-practice",
                        "explain-topic",
                      ].map((templateId) => {
                        const template = getPromptTemplate(templateId);
                        if (!template) return null;
                        return (
                          <button
                            key={template.id}
                            type="button"
                            onClick={() =>
                              handleUseTemplate(template.id)
                            }
                            className="
                              rounded-full border border-white/10
                              bg-white/[0.04] px-3.5 py-2
                              text-xs font-medium text-zinc-300
                              transition-colors
                              hover:border-[#D4AF37]/40
                              hover:bg-[#D4AF37]/[0.08]
                              hover:text-[#E9C96B]
                              focus-visible:outline-none
                              focus-visible:ring-2
                              focus-visible:ring-[#D4AF37]/60
                            "
                          >
                            {template.title}
                          </button>
                        );
                      })}
                    </div>
                    <p className="mt-3 text-[11px] text-zinc-600">
                      Or tap the template icon in the composer to browse
                      all templates — fill in the{" "}
                      <span className="font-mono">{"{{…}}"}</span>{" "}
                      parts before sending.
                    </p>
                  </div>

                  <div className="mt-8">
                    <VoiceChatButton />
                  </div>
                </div>
              ) : (
                <MessageList
                  messages={messages}
                  isTyping={isTyping}
                  onForkMessage={handleForkMessage}
                  onOpenArtifact={(artifact) => {
                    setOpenArtifact(artifact);
                    setSidePanel("artifact");
                  }}
                  hasEarlierMessages={hasEarlierMessages}
                  loadingEarlierMessages={loadingEarlierMessages}
                  onLoadEarlierMessages={handleLoadEarlierMessages}
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
                pt-2
                sm:px-6
                sm:pb-4
                sm:pt-2
              "
            >
              <div className="mx-auto w-full max-w-3xl">
                {showSignInNudge && (
                  <div
                    role="status"
                    className="mb-3 flex items-center justify-between gap-3 rounded-xl border border-[#D4AF37]/30 bg-[#D4AF37]/10 px-4 py-2.5"
                  >
                    <p className="text-[13px] leading-5 text-zinc-200">
                      Sign in to save your chats — your guest history
                      moves to your account.
                    </p>
                    <span className="flex shrink-0 items-center gap-2">
                      <Link
                        href="/auth"
                        className="rounded-lg bg-[#D4AF37] px-3 py-1.5 text-[13px] font-semibold text-black transition-colors hover:bg-[#E5C65C] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D4AF37]/70"
                      >
                        Sign in
                      </Link>
                      <button
                        type="button"
                        onClick={dismissSignInNudge}
                        aria-label="Dismiss sign-in reminder"
                        className="flex h-7 w-7 items-center justify-center rounded-lg text-zinc-400 transition-colors hover:bg-white/[0.07] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D4AF37]/70"
                      >
                        <X className="h-4 w-4" aria-hidden="true" />
                      </button>
                    </span>
                  </div>
                )}

                <ChatInput
                  onSend={handleSend}
                  isGenerating={isTyping}
                  onStop={handleStop}
                  seedPrompt={composerSeed}
                  onGenerateImage={handleGenerateImage}
                />

                <p
                  className="
                    mt-2
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

              {/* ARTIFACT SIDE PANEL (desktop) */}
              {sidePanel === "artifact" && openArtifact && (
                <aside
                  className="
                    hidden
                    w-[440px]
                    shrink-0
                    flex-col
                    overflow-hidden
                    border-l
                    border-white/[0.08]
                    bg-[#0B0B0C]
                    md:flex
                  "
                  aria-label={`Artifact: ${openArtifact.title}`}
                >
                  <ArtifactViewer
                    artifact={openArtifact}
                    onClose={() => {
                      setOpenArtifact(null);
                      setSidePanel(null);
                    }}
                  />
                </aside>
              )}

              {/* RESEARCH SIDE PANEL (desktop) */}
              {sidePanel === "research" && researchRun && (
                <aside
                  className="
                    hidden
                    w-[440px]
                    shrink-0
                    flex-col
                    overflow-hidden
                    border-l
                    border-white/[0.08]
                    bg-[#0B0B0C]
                    md:flex
                  "
                  aria-label="Deep research"
                >
                  <ResearchPanel
                    run={researchRun}
                    busy={researchBusy}
                    onAdvance={() => void advanceResearch(researchRun.id)}
                    onCancel={() => void cancelResearch()}
                    onSteer={(direction) => void steerResearch(direction)}
                    onClose={() => void handleCloseResearchPanel()}
                  />
                </aside>
              )}
            </div>

            {/* ARTIFACT PANEL (mobile overlay) */}
            {sidePanel === "artifact" && openArtifact && (
              <div className="fixed inset-0 z-[60] md:hidden">
                <ArtifactViewer
                  artifact={openArtifact}
                  onClose={() => {
                    setOpenArtifact(null);
                    setSidePanel(null);
                  }}
                />
              </div>
            )}

            {/* RESEARCH PANEL (mobile overlay) */}
            {sidePanel === "research" && researchRun && (
              <div className="fixed inset-0 z-[60] md:hidden">
                <ResearchPanel
                  run={researchRun}
                  busy={researchBusy}
                  onAdvance={() => void advanceResearch(researchRun.id)}
                  onCancel={() => void cancelResearch()}
                  onSteer={(direction) => void steerResearch(direction)}
                  onClose={() => void handleCloseResearchPanel()}
                />
              </div>
            )}
          </div>
        </main>
      </div>
    </AppShell>
  );
}