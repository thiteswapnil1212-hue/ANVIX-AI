
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
import ShareButton from "@/components/share/ShareButton";
import ArtifactViewer from "./ArtifactViewer";
import ResearchPanel from "./ResearchPanel";
import VoiceChatButton from "@/components/voice/VoiceChatButton";
import AppShell from "@/components/layout/AppShell";
import { parseChatEvents, type ChatEvent } from "@/lib/chat-events";
import type { GroundingSource } from "@/lib/gemini/grounding";
import { getPromptTemplate } from "@/lib/prompt-templates";
import {
  forkConversation,
  normalizeFolderName,
  normalizeTags,
} from "@/lib/chat-organization";
import {
  GeneratedImageError,
  requestGeneratedImage,
  toPersistableImage,
  type GeneratedImage,
} from "@/lib/image-client";
import { shouldExtractNow } from "@/lib/memory";
import type { ChatArtifact } from "@/lib/artifacts";
import {
  isResearchTerminal,
  type ResearchRun,
} from "@/lib/research";

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
  /** A Pollinations image generated for this message (assistant only). */
  generatedImage?: GeneratedImage;
  /** The user prompt this answer replies to (assistant only). */
  comparePrompt?: string;
};

type GuestChatConversation = {
  id: string;
  title: string;
  preview: string;
  updatedAt: string;
  createdAt: string;
  pinned?: boolean;
  /** Organization folder (null = no folder). */
  folder?: string | null;
  /** Lowercase tags. */
  tags?: string[];
  /** Id of the chat this one was branched from, if any. */
  forkedFrom?: string;
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
    folder: normalizeFolderName(conversation.folder),
    tags: normalizeTags(conversation.tags),
    forkedFrom:
      typeof conversation.forkedFrom === "string"
        ? conversation.forkedFrom
        : undefined,
    messages: messages.map((message) => ({
      ...message,
      // A blob URL dies on reload — saved messages keep the
      // Pollinations URL so the image still loads (see image-client).
      ...(message.generatedImage
        ? { generatedImage: toPersistableImage(message.generatedImage) }
        : {}),
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

  // The chat video has no reduced-motion guard (unlike AppShell's):
  // respect the preference here too, and pause while the tab is hidden.
  const [reduceMotion, setReduceMotion] = useState(false);
  const chatVideoRef = useRef<HTMLVideoElement | null>(null);
  useEffect(() => {
    const mediaQuery = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    );
    const update = () => setReduceMotion(mediaQuery.matches);
    update();
    mediaQuery.addEventListener("change", update);
    return () => mediaQuery.removeEventListener("change", update);
  }, []);
  useEffect(() => {
    const onVisibility = () => {
      const video = chatVideoRef.current;
      if (!video) return;
      if (document.hidden) video.pause();
      else video.play().catch(() => {});
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);
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
      folder: null,
      tags: [],
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

  // Move a conversation into a folder (null = no folder).
  const handleSetFolder = useCallback(
    (id: string, folder: string | null) => {
      setConversations((prev) =>
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
      setConversations((prev) =>
        sortConversations(
          prev.map((conversation) =>
            conversation.id === conversationId
              ? {
                  ...conversation,
                  updatedAt: createTimestamp(),
                  messages: [...conversation.messages, message],
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
    setConversations((prev) =>
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
      setConversations((prev) => sortConversations([next, ...prev]));
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
          prev.map((conversation) =>
            conversation.id === workingConversationId
              ? {
                  ...conversation,
                  preview: trimmedPrompt,
                  updatedAt: timestamp,
                  messages: [
                    ...conversation.messages,
                    userMessage,
                    assistantMessage,
                  ],
                }
              : conversation
          )
        )
      );

      const updateAssistantMessage = (patch: Partial<Message>) => {
        setConversations((prev) =>
          sortConversations(
            prev.map((conversation) =>
              conversation.id === workingConversationId
                ? {
                    ...conversation,
                    updatedAt: createTimestamp(),
                    messages: conversation.messages.map((message) =>
                      message.id === assistantMessageId
                        ? { ...message, ...patch }
                        : message
                    ),
                  }
                : conversation
            )
          )
        );
      };

      try {
        const image = await requestGeneratedImage(trimmedPrompt);
        updateAssistantMessage({ generatedImage: image });
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
  const handleStartResearch = async (
    prompt: string
  ): Promise<boolean> => {
    if (researchRun && !isResearchTerminal(researchRun.status)) {
      return false;
    }

    let workingConversationId = activeConversationId;
    const timestamp = createTimestamp();

    if (!workingConversationId) {
      workingConversationId = crypto.randomUUID();

      const newConversation: GuestChatConversation = {
        id: workingConversationId,
        title: generateChatTitle(prompt),
        preview: prompt,
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
  };

  // Send a message and stream the response.
  const handleSend = async (
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
        folder: null,
        tags: [],
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
      comparePrompt: trimmedPrompt,
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

      // Memory v2: this turn counts once the reply landed. The prior
      // user-turn count comes from the pre-send message list.
      const priorUserTurns = messages.filter(
        (message) => message.role === "user"
      ).length;
      maybeExtractMemories(
        workingConversationId,
        priorUserTurns + 1,
        [
          ...messages.map((message) => ({
            role: message.role,
            content: message.content,
          })),
          { role: "user" as const, content: trimmedPrompt },
          { role: "assistant" as const, content: streamedText },
        ]
      );

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
    <AppShell hideVideo>
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
              onSetFolder={handleSetFolder}
              onSetTags={handleSetTags}
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
              onSetFolder={handleSetFolder}
              onSetTags={handleSetTags}
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
          {!reduceMotion && (
            <video
              ref={chatVideoRef}
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
          )}

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

            {/* DESKTOP TOOLBAR — conversation title + share */}
            {messages.length > 0 && activeConversationId && (
              <div className="hidden h-11 shrink-0 items-center justify-between border-b border-white/[0.06] px-4 md:flex">
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

            {/* MESSAGES + INPUT with the artifact side panel */}
            <div className="flex min-h-0 flex-1 overflow-hidden">
              <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
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
                  seedPrompt={composerSeed}
                  onGenerateImage={handleGenerateImage}
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