
"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type {
  KeyboardEvent as ReactKeyboardEvent,
  FormEvent,
  ChangeEvent,
} from "react";

import {
  ArrowUp,
  ChevronDown,
  Check,
  Globe,
  ImagePlus,
  Paperclip,
  Square,
  LoaderCircle,
  BookOpen,
  LayoutTemplate,
  X,
} from "lucide-react";

import {
  CHAT_MODES,
  DEFAULT_CHAT_MODE_ID,
  defaultThinkingForMode,
  type ChatMode,
  type ChatModeId,
  type ThinkingChoice,
} from "@/lib/chat-modes";
import {
  MAX_ATTACHMENTS,
  type ChatAttachmentInput,
} from "@/lib/chat-attachments";
import { prepareAttachmentFiles } from "@/lib/chat-attachments-client";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth/AuthProvider";
import {
  findStarterAssistant,
  readStoredAssistantSelection,
  STARTER_ASSISTANTS,
  storeAssistantSelection,
  type AssistantRecord,
  type StoredAssistantSelection,
} from "@/lib/assistants";
import { fetchAssistants } from "@/lib/supabase/assistants-memory";

import {
  PROMPT_TEMPLATE_CATEGORIES,
  searchPromptTemplates,
  type PromptTemplateCategory,
} from "@/lib/prompt-templates";

import ModelGuide from "./ModelGuide";

export type ChatSendOptions = {
  mode: ChatModeId;
  thinking: ThinkingChoice;
  web: boolean;
  attachments: ChatAttachmentInput[];
  /** Saved assistant id, or null for a starter / inline assistant. */
  assistantId: string | null;
  /** Inline assistant (starters, guests) — a saved assistant loaded
   *  by id on the server always wins over this. */
  assistant: {
    name: string;
    instructions: string;
    mode: ChatModeId | null;
  } | null;
};

type ChatInputProps = {
  onSend: (
    message: string,
    options: ChatSendOptions
  ) => boolean | Promise<boolean>;
  isGenerating: boolean;
  onStop: () => void;
  /**
   * A prompt seeded from outside the composer (e.g. a template picked
   * on the empty state). Changing `nonce` applies the text once.
   */
  seedPrompt?: { text: string; nonce: number } | null;
  /** Generate an image for a prompt (Pollinations, 10/day). */
  onGenerateImage?: (prompt: string) => Promise<boolean>;
};

export type TemplateCategoryFilter =
  | "all"
  | PromptTemplateCategory;

const THINKING_CHOICES: {
  id: ThinkingChoice;
  name: string;
  hint: string;
}[] = [
  { id: "off", name: "Off", hint: "Fastest, lowest quota use." },
  { id: "fast", name: "Fast", hint: "A little reasoning." },
  { id: "deep", name: "Deep", hint: "Hardest reasoning, most quota." },
];

const MODE_STORAGE_KEY = "anvix-chat-mode";
const THINKING_STORAGE_KEY = "anvix-chat-thinking";
const WEB_STORAGE_KEY = "anvix-chat-web";

function readStoredMode(): ChatModeId {
  if (typeof window === "undefined") return DEFAULT_CHAT_MODE_ID;
  const stored = window.localStorage.getItem(MODE_STORAGE_KEY);
  return CHAT_MODES.some((mode) => mode.id === stored)
    ? (stored as ChatModeId)
    : DEFAULT_CHAT_MODE_ID;
}

function readStoredThinking(modeId: ChatModeId): ThinkingChoice {
  if (typeof window === "undefined") {
    return defaultThinkingForMode(modeId);
  }
  const stored = window.localStorage.getItem(THINKING_STORAGE_KEY);
  return stored === "off" || stored === "fast" || stored === "deep"
    ? stored
    : defaultThinkingForMode(modeId);
}

function readStoredWeb(): boolean {
  if (typeof window === "undefined") return true;
  return window.localStorage.getItem(WEB_STORAGE_KEY) !== "off";
}

export default function ChatInput({
  onSend,
  isGenerating,
  onStop,
  seedPrompt = null,
  onGenerateImage,
}: ChatInputProps) {
  const router = useRouter();
  const { user } = useAuth();
  const [value, setValue] = useState("");
  const [modelOpen, setModelOpen] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);
  const [templateOpen, setTemplateOpen] = useState(false);
  const [templateQuery, setTemplateQuery] = useState("");
  const [templateCategory, setTemplateCategory] =
    useState<TemplateCategoryFilter>("all");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedMode, setSelectedMode] =
    useState<ChatModeId>(readStoredMode);
  const [thinking, setThinking] = useState<ThinkingChoice>(() =>
    readStoredThinking(readStoredMode())
  );
  const [webEnabled, setWebEnabled] = useState<boolean>(readStoredWeb);
  // Custom assistant picked for this chat (skills pattern). Starters
  // work for guests; saved assistants load once the user signs in.
  const [assistantSelection, setAssistantSelection] =
    useState<StoredAssistantSelection | null>(readStoredAssistantSelection);
  const [savedAssistants, setSavedAssistants] = useState<AssistantRecord[]>(
    []
  );

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    void (async () => {
      const rows = await fetchAssistants(user.id);
      if (!cancelled) setSavedAssistants(rows ?? []);
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  const assistantSelectValue = !assistantSelection
    ? "none"
    : assistantSelection.id
      ? `saved:${assistantSelection.id}`
      : `starter:${assistantSelection.name}`;

  function handleAssistantSelect(value: string) {
    if (value === "manage") {
      router.push("/assistants");
      return;
    }
    if (value === "none") {
      setAssistantSelection(null);
      storeAssistantSelection(null);
      return;
    }
    if (value.startsWith("saved:")) {
      const id = value.slice("saved:".length);
      const found = savedAssistants.find(
        (assistant) => assistant.id === id
      );
      if (!found) return;
      const selection: StoredAssistantSelection = {
        id: found.id,
        name: found.name,
        instructions: found.instructions,
        mode: found.mode,
      };
      setAssistantSelection(selection);
      storeAssistantSelection(selection);
      return;
    }
    if (value.startsWith("starter:")) {
      const starter = findStarterAssistant(value.slice("starter:".length));
      if (!starter) return;
      const selection: StoredAssistantSelection = {
        id: null,
        name: starter.name,
        instructions: starter.instructions,
        mode: starter.mode,
      };
      setAssistantSelection(selection);
      storeAssistantSelection(selection);
    }
  }
  const [attachments, setAttachments] = useState<ChatAttachmentInput[]>(
    []
  );
  const [attachError, setAttachError] = useState<string | null>(null);
  const [isPreparingFiles, setIsPreparingFiles] = useState(false);
  const [imagePromptOpen, setImagePromptOpen] = useState(false);
  const [imagePrompt, setImagePrompt] = useState("");
  const [imageError, setImageError] = useState<string | null>(null);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const modelRef = useRef<HTMLDivElement>(null);
  const templateRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const submittingRef = useRef(false);
  const previousGeneratingRef = useRef(isGenerating);

  const hasMessage = value.trim().length > 0;

  const canSend =
    hasMessage && !isSubmitting && !isGenerating && !isPreparingFiles;

  const selectedModeConfig =
    CHAT_MODES.find((mode) => mode.id === selectedMode) ??
    CHAT_MODES[1];

  // Apply a prompt seeded from outside the composer (template chip).
  // Render-time state adjustment (the React-documented pattern for
  // "adjust state when a prop changes"): no effect, so no
  // set-state-in-effect, and the composer keeps its mode/attachments.
  const [appliedSeedNonce, setAppliedSeedNonce] = useState(0);
  const seedNonce = seedPrompt?.nonce ?? 0;
  if (seedPrompt && seedNonce !== 0 && seedNonce !== appliedSeedNonce) {
    setAppliedSeedNonce(seedNonce);
    setValue(seedPrompt.text);
    setTemplateOpen(false);
    setModelOpen(false);
  }

  const visibleTemplates = useMemo(() => {
    const searched = searchPromptTemplates(templateQuery);
    return templateCategory === "all"
      ? searched
      : searched.filter(
          (template) => template.category === templateCategory
        );
  }, [templateQuery, templateCategory]);

  const applyTemplate = useCallback((prompt: string) => {
    setValue(prompt);
    setTemplateOpen(false);
    setModelOpen(false);
    textareaRef.current?.focus();
  }, []);
  useEffect(() => {
    try {
      window.localStorage.setItem(MODE_STORAGE_KEY, selectedMode);
      window.localStorage.setItem(THINKING_STORAGE_KEY, thinking);
      window.localStorage.setItem(
        WEB_STORAGE_KEY,
        webEnabled ? "on" : "off"
      );
    } catch {
      // Private mode / full storage: choices just don't persist.
    }
  }, [selectedMode, thinking, webEnabled]);

  // Auto-resize textarea.
  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    textarea.style.height = "auto";

    const nextHeight = Math.min(
      Math.max(textarea.scrollHeight, 36),
      120
    );

    textarea.style.height = `${nextHeight}px`;
  }, [value]);

  // Close mode dropdown / template picker when clicking outside.
  useEffect(() => {
    function handlePointerDown(event: PointerEvent) {
      const target = event.target;

      if (
        target instanceof Node &&
        modelRef.current &&
        !modelRef.current.contains(target)
      ) {
        setModelOpen(false);
      }

      if (
        target instanceof Node &&
        templateRef.current &&
        !templateRef.current.contains(target)
      ) {
        setTemplateOpen(false);
      }
    }

    document.addEventListener(
      "pointerdown",
      handlePointerDown
    );

    return () => {
      document.removeEventListener(
        "pointerdown",
        handlePointerDown
      );
    };
  }, []);

  // Escape closes the guide first, then the template picker,
  // then the dropdown.
  useEffect(() => {
    function handleEscape(event: globalThis.KeyboardEvent) {
      if (event.key !== "Escape") return;

      if (guideOpen) {
        setGuideOpen(false);
        return;
      }

      if (templateOpen) {
        setTemplateOpen(false);
        return;
      }

      setModelOpen(false);
    }

    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener(
        "keydown",
        handleEscape
      );
    };
  }, [guideOpen, templateOpen]);

  // Focus input when generation finishes.
  useEffect(() => {
    const wasGenerating = previousGeneratingRef.current;
    previousGeneratingRef.current = isGenerating;

    if (wasGenerating && !isGenerating) {
      textareaRef.current?.focus();
    }
  }, [isGenerating]);

  const handleStop = useCallback(() => {
    if (isGenerating) {
      onStop();
    }
  }, [isGenerating, onStop]);

  const handleSubmit = useCallback(async () => {
    const message = value.trim();

    if (
      !message ||
      submittingRef.current ||
      isSubmitting ||
      isGenerating ||
      isPreparingFiles
    ) {
      return;
    }

    // Prevent duplicate submissions.
    submittingRef.current = true;
    setIsSubmitting(true);

    try {
      const accepted = await onSend(message, {
        mode: selectedMode,
        thinking,
        web: webEnabled,
        attachments,
        assistantId: assistantSelection?.id ?? null,
        assistant: assistantSelection
          ? {
              name: assistantSelection.name,
              instructions: assistantSelection.instructions,
              mode: assistantSelection.mode,
            }
          : null,
      });

      if (accepted) {
        setValue("");
        setAttachments([]);
        setAttachError(null);
        setModelOpen(false);
        setTemplateOpen(false);
        setGuideOpen(false);
      }
    } catch (error) {
      console.error(
        "ANVIX chat submission failed:",
        error
      );
    } finally {
      submittingRef.current = false;
      setIsSubmitting(false);
    }
  }, [
    value,
    isSubmitting,
    isGenerating,
    isPreparingFiles,
    onSend,
    selectedMode,
    thinking,
    webEnabled,
    attachments,
    assistantSelection,
  ]);

  function handleKeyDown(
    event: ReactKeyboardEvent<HTMLTextAreaElement>
  ) {
    if (
      event.key !== "Enter" ||
      event.shiftKey ||
      event.nativeEvent.isComposing
    ) {
      return;
    }

    event.preventDefault();

    if (isGenerating) {
      handleStop();
      return;
    }

    if (canSend) {
      void handleSubmit();
    }
  }

  function handleFormSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (isGenerating) {
      handleStop();
      return;
    }

    if (canSend) {
      void handleSubmit();
    }
  }

  function handleModeSelect(mode: ChatMode) {
    if (isSubmitting || isGenerating) {
      return;
    }

    // Changing mode resets thinking to that mode's default.
    setSelectedMode(mode.id);
    setThinking(defaultThinkingForMode(mode.id));
    setModelOpen(false);
    textareaRef.current?.focus();
  }

  function handleThinkingSelect(choice: ThinkingChoice) {
    if (isSubmitting || isGenerating) {
      return;
    }

    setThinking(choice);
  }

  function handleOpenGuide() {
    setGuideOpen(true);
  }

  function handleCloseGuide() {
    setGuideOpen(false);
  }

  async function handleFilesSelected(
    event: ChangeEvent<HTMLInputElement>
  ) {
    const files = Array.from(event.target.files ?? []);
    // Reset so picking the same file again still fires onChange.
    event.target.value = "";

    if (files.length === 0 || isGenerating || isSubmitting) {
      return;
    }

    setIsPreparingFiles(true);
    setAttachError(null);

    try {
      const prepared = await prepareAttachmentFiles(
        files,
        attachments.length
      );

      if (prepared.attachments.length > 0) {
        setAttachments((prev) => [...prev, ...prepared.attachments]);
      }

      if (prepared.errors.length > 0) {
        setAttachError(prepared.errors[0]);
      }
    } finally {
      setIsPreparingFiles(false);
    }
  }

  function handleRemoveAttachment(name: string) {
    setAttachments((prev) =>
      prev.filter((attachment) => attachment.name !== name)
    );
    setAttachError(null);
  }

  async function handleGenerateImage() {
    const prompt = imagePrompt.trim();

    if (!prompt || !onGenerateImage || isGeneratingImage || isGenerating) {
      return;
    }

    setIsGeneratingImage(true);
    setImageError(null);

    try {
      const accepted = await onGenerateImage(prompt);
      if (accepted) {
        setImagePrompt("");
        setImagePromptOpen(false);
      }
    } catch (error) {
      console.error("ANVIX image generation failed:", error);
      setImageError(
        error instanceof Error
          ? error.message
          : "Image generation failed. Please try again."
      );
    } finally {
      setIsGeneratingImage(false);
    }
  }

  return (
    <>
      <div className="relative mx-auto w-full">
        <form
          onSubmit={handleFormSubmit}
          aria-label="Chat message form"
        >
          <div
            className="
              relative flex w-full flex-col
              rounded-2xl border border-zinc-800/90
              bg-[#151518] p-2.5
              shadow-[0_8px_30px_rgba(0,0,0,0.22)]
              transition-[border-color,box-shadow]
              duration-200
              focus-within:border-zinc-700
              focus-within:shadow-[0_10px_34px_rgba(0,0,0,0.28)]
              sm:p-3
            "
          >
            {/* Attachment chips */}
            {attachments.length > 0 && (
              <div className="mb-2 flex flex-wrap gap-1.5 px-1 pt-1">
                {attachments.map((attachment) => (
                  <span
                    key={attachment.name}
                    className="
                      inline-flex max-w-full items-center
                      gap-1.5 rounded-lg border
                      border-white/10 bg-white/[0.05]
                      py-1 pl-2 pr-1
                      text-[11px] font-medium text-zinc-300
                    "
                  >
                    <span className="truncate">
                      {attachment.name}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        handleRemoveAttachment(attachment.name)
                      }
                      aria-label={`Remove ${attachment.name}`}
                      className="
                        flex h-4 w-4 shrink-0 items-center
                        justify-center rounded text-zinc-500
                        transition-colors hover:bg-white/10
                        hover:text-zinc-200
                        focus-visible:outline-none
                        focus-visible:ring-2
                        focus-visible:ring-[#D4AF37]/60
                      "
                    >
                      <X
                        className="h-3 w-3"
                        aria-hidden="true"
                      />
                    </button>
                  </span>
                ))}
              </div>
            )}

            {attachError && (
              <p
                role="alert"
                className="mb-2 px-1 text-[11px] text-red-400"
              >
                {attachError}
              </p>
            )}

            {/* Image generation row (Pollinations, free community model) */}
            {imagePromptOpen && (
              <div className="mb-2 px-1">
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={imagePrompt}
                    onChange={(event) =>
                      setImagePrompt(event.target.value)
                    }
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault();
                        void handleGenerateImage();
                      }
                    }}
                    disabled={isGeneratingImage || isGenerating}
                    placeholder="Describe an image… (free model, 10/day)"
                    aria-label="Image description"
                    className="
                      min-w-0 flex-1 rounded-lg border border-white/10
                      bg-white/[0.04] px-2.5 py-2
                      text-[13px] text-zinc-100 outline-none
                      placeholder:text-zinc-600
                      focus-visible:ring-2 focus-visible:ring-[#D4AF37]/60
                      disabled:opacity-60
                    "
                  />
                  <button
                    type="button"
                    onClick={() => void handleGenerateImage()}
                    disabled={
                      !imagePrompt.trim() ||
                      isGeneratingImage ||
                      isGenerating
                    }
                    className="
                      shrink-0 rounded-lg bg-[#D4AF37] px-3 py-2
                      text-xs font-semibold text-black
                      transition-colors hover:bg-[#E0BB4C]
                      disabled:cursor-not-allowed disabled:opacity-40
                      focus-visible:outline-none
                      focus-visible:ring-2 focus-visible:ring-[#D4AF37]
                    "
                  >
                    {isGeneratingImage ? "Making…" : "Generate"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setImagePromptOpen(false);
                      setImageError(null);
                    }}
                    aria-label="Close image generation"
                    className="
                      flex h-8 w-8 shrink-0 items-center justify-center
                      rounded-lg text-zinc-500 transition-colors
                      hover:bg-white/10 hover:text-zinc-200
                      focus-visible:outline-none
                      focus-visible:ring-2 focus-visible:ring-[#D4AF37]/60
                    "
                  >
                    <X className="h-3.5 w-3.5" aria-hidden="true" />
                  </button>
                </div>
                {imageError ? (
                  <p
                    role="alert"
                    className="mt-1.5 text-[11px] text-red-400"
                  >
                    {imageError}
                  </p>
                ) : (
                  <p className="mt-1.5 text-[11px] leading-5 text-zinc-600">
                    Generated by a free community model — quality
                    varies, and it can be slow or briefly unavailable.
                  </p>
                )}
              </div>
            )}

            <div className="flex w-full items-end gap-2 sm:gap-2.5">
              {/* Attachment button */}
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/jpeg,image/png,image/webp,application/pdf"
                className="hidden"
                aria-hidden="true"
                tabIndex={-1}
                onChange={handleFilesSelected}
              />
              <button
                type="button"
                disabled={
                  isSubmitting ||
                  isGenerating ||
                  isPreparingFiles ||
                  attachments.length >= MAX_ATTACHMENTS
                }
                onClick={() => fileInputRef.current?.click()}
                className="
                  mb-0.5 flex h-8 w-8 shrink-0
                  items-center justify-center rounded-xl
                  text-zinc-400 transition-colors
                  hover:bg-zinc-800/70 hover:text-zinc-200
                  disabled:cursor-not-allowed
                  disabled:opacity-40
                  focus-visible:outline-none
                  focus-visible:ring-2
                  focus-visible:ring-[#D4AF37]/60
                "
                aria-label="Attach image or PDF"
                title="Attach image or PDF (max 3, images downscaled to 768px, PDFs up to 3 MB)"
              >
                <Paperclip
                  className="h-[17px] w-[17px]"
                  strokeWidth={1.8}
                  aria-hidden="true"
                />
              </button>

              {/* Templates button */}
              <div ref={templateRef} className="relative mb-0.5 shrink-0">
                <button
                  type="button"
                  disabled={isSubmitting || isGenerating}
                  onClick={() =>
                    setTemplateOpen((open) => !open)
                  }
                  className="
                    mb-0.5 flex h-8 w-8 shrink-0
                    items-center justify-center rounded-xl
                    text-zinc-400 transition-colors
                    hover:bg-zinc-800/70 hover:text-zinc-200
                    disabled:cursor-not-allowed
                    disabled:opacity-40
                    focus-visible:outline-none
                    focus-visible:ring-2
                    focus-visible:ring-[#D4AF37]/60
                  "
                  aria-label="Browse prompt templates"
                  aria-expanded={templateOpen}
                  title="Prompt templates — start from a ready prompt"
                >
                  <LayoutTemplate
                    className="h-[17px] w-[17px]"
                    strokeWidth={1.8}
                    aria-hidden="true"
                  />
                </button>

                {/* Template picker */}
                {templateOpen && (
                  <div
                    className="
                      absolute bottom-[43px] left-0 z-[9999]
                      max-h-[min(420px,60vh)]
                      w-[min(340px,calc(100vw-32px))]
                      overflow-y-auto overflow-x-hidden
                      rounded-xl border border-zinc-800
                      bg-[#18181B] p-1.5
                      shadow-[0_16px_45px_rgba(0,0,0,0.55)]
                    "
                    aria-label="Prompt templates"
                  >
                    <div className="px-2.5 pb-2 pt-2">
                      <p className="text-[10px] font-medium uppercase tracking-[0.1em] text-zinc-600">
                        Start from a template
                      </p>
                      <input
                        type="search"
                        value={templateQuery}
                        onChange={(event) =>
                          setTemplateQuery(event.target.value)
                        }
                        placeholder="Search templates…"
                        aria-label="Search prompt templates"
                        className="
                          mt-2 w-full rounded-lg border
                          border-zinc-800 bg-[#151518]
                          px-2.5 py-2 text-xs text-zinc-200
                          outline-none placeholder:text-zinc-600
                          focus:border-[#D4AF37]/40
                        "
                      />
                      <div
                        className="mt-2 flex flex-wrap gap-1"
                        role="group"
                        aria-label="Template category"
                      >
                        <button
                          type="button"
                          onClick={() => setTemplateCategory("all")}
                          aria-pressed={templateCategory === "all"}
                          className={`
                            rounded-full border px-2.5 py-1
                            text-[11px] font-medium transition-colors
                            ${
                              templateCategory === "all"
                                ? "border-[#D4AF37]/50 bg-[#D4AF37]/10 text-[#E9C96B]"
                                : "border-zinc-800 text-zinc-400 hover:bg-zinc-800/70 hover:text-zinc-200"
                            }
                          `}
                        >
                          All
                        </button>
                        {PROMPT_TEMPLATE_CATEGORIES.map((category) => (
                          <button
                            key={category.id}
                            type="button"
                            onClick={() =>
                              setTemplateCategory(category.id)
                            }
                            aria-pressed={
                              templateCategory === category.id
                            }
                            title={category.hint}
                            className={`
                              rounded-full border px-2.5 py-1
                              text-[11px] font-medium transition-colors
                              ${
                                templateCategory === category.id
                                  ? "border-[#D4AF37]/50 bg-[#D4AF37]/10 text-[#E9C96B]"
                                  : "border-zinc-800 text-zinc-400 hover:bg-zinc-800/70 hover:text-zinc-200"
                              }
                            `}
                          >
                            {category.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-0.5" role="listbox" aria-label="Templates">
                      {visibleTemplates.map((template) => (
                        <button
                          key={template.id}
                          type="button"
                          role="option"
                          aria-selected={false}
                          onClick={() => applyTemplate(template.prompt)}
                          className="
                            flex w-full flex-col gap-0.5
                            rounded-lg px-2.5 py-2.5
                            text-left transition-colors
                            hover:bg-zinc-800/70
                          "
                        >
                          <span className="text-sm font-medium text-zinc-100">
                            {template.title}
                          </span>
                          <span className="text-[11px] leading-4 text-zinc-600">
                            {template.description}
                          </span>
                        </button>
                      ))}

                      {visibleTemplates.length === 0 && (
                        <p className="px-2.5 py-4 text-center text-xs text-zinc-500">
                          No templates match that search.
                        </p>
                      )}
                    </div>

                    <p className="border-t border-zinc-800/80 px-2.5 pb-1 pt-2.5 text-[11px] leading-5 text-zinc-600">
                      Tap a template to fill the composer — replace the{" "}
                      <span className="font-mono text-zinc-400">
                        {"{{…}}"}
                      </span>{" "}
                      parts with your details before sending.
                    </p>
                  </div>
                )}
              </div>

              {/* Image generation button */}
              {onGenerateImage && (
                <button
                  type="button"
                  disabled={isSubmitting || isGenerating || isGeneratingImage}
                  onClick={() =>
                    setImagePromptOpen((open) => !open)
                  }
                  className="
                    mb-0.5 flex h-8 w-8 shrink-0
                    items-center justify-center rounded-xl
                    text-zinc-400 transition-colors
                    hover:bg-zinc-800/70 hover:text-zinc-200
                    disabled:cursor-not-allowed
                    disabled:opacity-40
                    focus-visible:outline-none
                    focus-visible:ring-2
                    focus-visible:ring-[#D4AF37]/60
                  "
                  aria-label="Generate an image"
                  aria-expanded={imagePromptOpen}
                  title="Generate an image (free community model, 10/day)"
                >
                  <ImagePlus
                    className="h-[17px] w-[17px]"
                    strokeWidth={1.8}
                    aria-hidden="true"
                  />
                </button>
              )}

              {/* Message textarea */}
              <textarea
                id="chat-message"
                name="message"
                ref={textareaRef}
                value={value}
                onChange={(event) => {
                  const nextValue = event.target.value;
                  setValue(nextValue);

                  if (nextValue.trim()) {
                    setModelOpen(false);
                    setTemplateOpen(false);
                  }
                }}
                onKeyDown={handleKeyDown}
                rows={1}
                disabled={isSubmitting}
                placeholder={
                  isGenerating
                    ? "Press Enter to stop..."
                    : "Message ANVIX AI..."
                }
                aria-label="Message ANVIX AI"
                aria-describedby="chat-input-hint"
                className="
                  min-h-[36px] max-h-[120px] min-w-0 flex-1
                  resize-none overflow-y-auto bg-transparent
                  px-0.5 py-1.5 text-[15px] leading-6
                  text-zinc-100 outline-none
                  placeholder:text-zinc-600
                  disabled:cursor-wait disabled:opacity-70
                "
              />

              {/* Assistant selector */}
              {!hasMessage && !isGenerating && (
                <select
                  value={assistantSelectValue}
                  onChange={(event) =>
                    handleAssistantSelect(event.target.value)
                  }
                  disabled={isSubmitting}
                  aria-label="Choose an assistant"
                  title={
                    assistantSelection
                      ? `Assistant: ${assistantSelection.name} — its instructions shape every reply in this chat`
                      : "Chat with a custom assistant (optional)"
                  }
                  className="
                    mb-0.5 h-8 max-w-[150px] shrink-0
                    truncate rounded-xl border border-transparent
                    bg-transparent px-2 text-[11px] font-medium
                    text-zinc-400 outline-none transition-colors
                    hover:bg-zinc-800/70 hover:text-zinc-200
                    focus:border-[#D4AF37]/40 disabled:opacity-40
                    sm:text-xs
                  "
                >
                  <option value="none">No assistant</option>
                  {user && savedAssistants.length > 0 && (
                    <optgroup label="Your assistants">
                      {savedAssistants.map((assistant) => (
                        <option
                          key={assistant.id}
                          value={`saved:${assistant.id}`}
                        >
                          {assistant.name}
                        </option>
                      ))}
                    </optgroup>
                  )}
                  <optgroup label="Starters">
                    {STARTER_ASSISTANTS.map((starter) => (
                      <option
                        key={starter.name}
                        value={`starter:${starter.name}`}
                      >
                        {starter.name}
                      </option>
                    ))}
                  </optgroup>
                  <option value="manage">Manage assistants…</option>
                </select>
              )}

              {/* Mode selector */}
              {!hasMessage && !isGenerating && (
                <div
                  ref={modelRef}
                  className="relative mb-0.5 shrink-0"
                >
                  <button
                    type="button"
                    disabled={isSubmitting}
                    onClick={() =>
                      setModelOpen((open) => !open)
                    }
                    className="
                      flex h-8 max-w-[150px] items-center
                      gap-1.5 rounded-xl px-2
                      text-[11px] font-medium text-zinc-400
                      transition-colors
                      hover:bg-zinc-800/70 hover:text-zinc-200
                      disabled:opacity-40 sm:text-xs
                    "
                    aria-haspopup="listbox"
                    aria-expanded={modelOpen}
                    aria-label={`Selected mode: ${selectedModeConfig.name}`}
                  >
                    <span className="truncate whitespace-nowrap">
                      {selectedModeConfig.name}
                    </span>

                    <ChevronDown
                      className={`
                        h-3.5 w-3.5 shrink-0 text-zinc-600
                        transition-transform duration-150
                        ${modelOpen ? "rotate-180" : ""}
                      `}
                      aria-hidden="true"
                    />
                  </button>

                  {/* Mode dropdown */}
                  {modelOpen && (
                    <div
                      className="
                        absolute bottom-[43px] right-0 z-[9999]
                        max-h-[min(420px,60vh)]
                        w-[min(300px,calc(100vw-32px))]
                        overflow-y-auto overflow-x-hidden
                        rounded-xl border border-zinc-800
                        bg-[#18181B] p-1.5
                        shadow-[0_16px_45px_rgba(0,0,0,0.55)]
                      "
                      aria-label="Select chat mode"
                    >
                      {/* Dropdown header + Notes */}
                      <div
                        className="
                          flex items-center justify-between
                          gap-2 px-2.5 pb-2 pt-2
                        "
                      >
                        <p
                          className="
                            text-[10px] font-medium uppercase
                            tracking-[0.1em] text-zinc-600
                          "
                        >
                          Choose a mode
                        </p>

                        <button
                          type="button"
                          onClick={handleOpenGuide}
                          className="
                            inline-flex shrink-0
                            items-center gap-1.5
                            rounded-full
                            border border-[#D4AF37]/40
                            bg-[#D4AF37]/10
                            px-2.5 py-1.5
                            text-[11px] font-medium
                            text-[#D4AF37]
                            transition-colors
                            hover:bg-[#D4AF37]/20
                            focus-visible:outline-none
                            focus-visible:ring-2
                            focus-visible:ring-[#D4AF37]
                          "
                          aria-label="Open model guide"
                        >
                          <BookOpen
                            className="h-3.5 w-3.5"
                            aria-hidden="true"
                          />
                          Notes
                        </button>
                      </div>

                      <div
                        className="space-y-0.5"
                        role="listbox"
                        aria-label="Chat mode"
                      >
                        {CHAT_MODES.map((mode) => {
                          const selected =
                            selectedMode === mode.id;

                          const unavailable =
                            isSubmitting || isGenerating;

                          return (
                            <button
                              key={mode.id}
                              type="button"
                              role="option"
                              aria-selected={selected}
                              disabled={unavailable}
                              onClick={() =>
                                handleModeSelect(mode)
                              }
                              className={`
                                flex w-full items-center
                                justify-between gap-3
                                rounded-lg px-2.5 py-2.5
                                text-left transition-colors
                                ${
                                  unavailable
                                    ? "cursor-not-allowed opacity-45"
                                    : "hover:bg-zinc-800/70"
                                }
                              `}
                            >
                              <span className="min-w-0">
                                <span
                                  className={`
                                    block truncate text-sm
                                    font-medium
                                    ${
                                      selected
                                        ? "text-zinc-100"
                                        : "text-zinc-300"
                                    }
                                  `}
                                >
                                  {mode.name}
                                </span>

                                <span
                                  className="
                                    mt-0.5 block
                                    text-[11px] text-zinc-600
                                  "
                                >
                                  {mode.blurb}
                                </span>
                              </span>

                              {selected ? (
                                <Check
                                  className="
                                    h-4 w-4 shrink-0
                                    text-[#D4AF37]
                                  "
                                  strokeWidth={2}
                                  aria-hidden="true"
                                />
                              ) : null}
                            </button>
                          );
                        })}
                      </div>

                      {/* Thinking toggle */}
                      <div className="mt-2 border-t border-zinc-800/80 px-2.5 pb-1 pt-3">
                        <p className="text-[10px] font-medium uppercase tracking-[0.1em] text-zinc-600">
                          Thinking
                        </p>
                        <div
                          className="mt-2 flex gap-1"
                          role="group"
                          aria-label="Thinking effort"
                        >
                          {THINKING_CHOICES.map((choice) => {
                            const selected =
                              thinking === choice.id;
                            return (
                              <button
                                key={choice.id}
                                type="button"
                                aria-pressed={selected}
                                disabled={
                                  isSubmitting || isGenerating
                                }
                                onClick={() =>
                                  handleThinkingSelect(choice.id)
                                }
                                className={`
                                  flex-1 rounded-lg border px-2
                                  py-1.5 text-xs font-medium
                                  transition-colors
                                  focus-visible:outline-none
                                  focus-visible:ring-2
                                  focus-visible:ring-[#D4AF37]/60
                                  ${
                                    selected
                                      ? "border-[#D4AF37]/50 bg-[#D4AF37]/10 text-[#E9C96B]"
                                      : "border-zinc-800 text-zinc-400 hover:bg-zinc-800/70 hover:text-zinc-200"
                                  }
                                `}
                              >
                                {choice.name}
                              </button>
                            );
                          })}
                        </div>
                        <p className="mt-1.5 text-[11px] leading-5 text-zinc-600">
                          {
                            THINKING_CHOICES.find(
                              (choice) => choice.id === thinking
                            )?.hint
                          }{" "}
                          Deep thinking uses the most quota.
                        </p>
                      </div>

                      {/* Web grounding toggle */}
                      <div className="mt-2 border-t border-zinc-800/80 px-2.5 py-2.5">
                        <button
                          type="button"
                          role="switch"
                          aria-checked={webEnabled}
                          disabled={isSubmitting || isGenerating}
                          onClick={() =>
                            setWebEnabled((value) => !value)
                          }
                          className="
                            flex w-full items-center
                            justify-between gap-3 rounded-lg
                            px-1 py-1 text-left
                            focus-visible:outline-none
                            focus-visible:ring-2
                            focus-visible:ring-[#D4AF37]/60
                          "
                        >
                          <span className="flex min-w-0 items-center gap-2">
                            <Globe
                              className="h-4 w-4 shrink-0 text-zinc-500"
                              aria-hidden="true"
                            />
                            <span className="min-w-0">
                              <span className="block truncate text-sm font-medium text-zinc-300">
                                Search the web
                              </span>
                              <span className="mt-0.5 block text-[11px] leading-4 text-zinc-600">
                                Ground answers in live results, with
                                sources.
                              </span>
                            </span>
                          </span>
                          <span
                            aria-hidden="true"
                            className={`
                              flex h-5 w-9 shrink-0 items-center
                              rounded-full p-0.5 transition-colors
                              ${
                                webEnabled
                                  ? "justify-end bg-[#D4AF37]"
                                  : "justify-start bg-zinc-700"
                              }
                            `}
                          >
                            <span className="h-4 w-4 rounded-full bg-white shadow" />
                          </span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Stop / Send */}
              <button
                type={isGenerating ? "button" : "submit"}
                onClick={
                  isGenerating ? handleStop : undefined
                }
                disabled={
                  isGenerating ? false : !canSend
                }
                aria-label={
                  isGenerating
                    ? "Stop response"
                    : isSubmitting
                      ? "Sending message"
                      : "Send message"
                }
                title={
                  isGenerating
                    ? "Stop response"
                    : isSubmitting
                      ? "Sending..."
                      : "Send message"
                }
                className={`
                  mb-0.5 flex h-8 w-8 shrink-0
                  items-center justify-center rounded-full
                  transition-all duration-150
                  focus-visible:outline-none
                  focus-visible:ring-2
                  focus-visible:ring-[#D4AF37]
                  focus-visible:ring-offset-2
                  focus-visible:ring-offset-[#151518]
                  ${
                    isGenerating
                      ? "bg-zinc-200 text-black hover:bg-white active:scale-95"
                      : canSend
                        ? "bg-[#D4AF37] text-black hover:bg-[#E0BB4C] active:scale-95"
                        : "cursor-not-allowed bg-zinc-800 text-zinc-600"
                  }
                `}
              >
                {isGenerating ? (
                  <Square
                    className="h-3.5 w-3.5"
                    fill="currentColor"
                    strokeWidth={2}
                    aria-hidden="true"
                  />
                ) : isSubmitting ? (
                  <LoaderCircle
                    className="h-4 w-4 animate-spin"
                    aria-hidden="true"
                  />
                ) : (
                  <ArrowUp
                    className="h-[16px] w-[16px]"
                    strokeWidth={2.2}
                    aria-hidden="true"
                  />
                )}
              </button>
            </div>
          </div>

          {/* Keyboard hint */}
          <div
            id="chat-input-hint"
            className="
              mt-2 flex min-h-4 items-center
              justify-center gap-2 px-2
              text-center text-[10px] text-zinc-600
              sm:text-[11px]
            "
          >
            
          </div>
        </form>
      </div>

      {/* Model Guide popup */}
      {guideOpen && (
        <ModelGuide onClose={handleCloseGuide} />
      )}
    </>
  );
}
