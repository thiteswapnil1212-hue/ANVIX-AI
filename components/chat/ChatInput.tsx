
"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import type {
  KeyboardEvent as ReactKeyboardEvent,
  FormEvent,
} from "react";

import {
  ArrowUp,
  ChevronDown,
  Globe,
  Check,
  Plus,
  Square,
  LoaderCircle,
  BookOpen,
} from "lucide-react";

import {
  CHAT_MODELS,
  DEFAULT_CHAT_MODEL_ID,
  type ChatModel,
} from "@/lib/chat-models";

import ModelGuide from "./ModelGuide";

type ChatInputProps = {
  onSend: (
    message: string,
    model: string
  ) => boolean | Promise<boolean>;
  isGenerating: boolean;
  onStop: () => void;
  /** Web-task mode: send to /api/web-agent instead of /api/chat. */
  webTaskMode?: boolean;
  onToggleWebTask?: () => void;
  /** Composer is paused while a web-task approval waits (§4.6). */
  disabled?: boolean;
};

export default function ChatInput({
  onSend,
  isGenerating,
  onStop,
  webTaskMode = false,
  onToggleWebTask,
  disabled = false,
}: ChatInputProps) {
  const [value, setValue] = useState("");
  const [modelOpen, setModelOpen] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedModel, setSelectedModel] =
    useState(DEFAULT_CHAT_MODEL_ID);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const modelRef = useRef<HTMLDivElement>(null);
  const submittingRef = useRef(false);
  const previousGeneratingRef = useRef(isGenerating);

  const hasMessage = value.trim().length > 0;

  const canSend =
    hasMessage && !isSubmitting && !isGenerating && !disabled;

  // The picker shows only connected models — the locked entries in
  // lib/chat-models.ts are a roadmap record, never a selectable list.
  // Today that is Gemini 2.5 Flash alone.
  const availableModels = CHAT_MODELS.filter(
    (model) => !model.locked && model.apiModelId !== null
  );

  const selectedModelConfig =
    availableModels.find((model) => model.id === selectedModel) ??
    availableModels[0] ??
    CHAT_MODELS[0];

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

  // Close model dropdown when clicking outside.
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

  // Escape closes the guide first, then the dropdown.
  useEffect(() => {
    function handleEscape(event: globalThis.KeyboardEvent) {
      if (event.key !== "Escape") return;

      if (guideOpen) {
        setGuideOpen(false);
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
  }, [guideOpen]);

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
      disabled
    ) {
      return;
    }

    // Prevent duplicate submissions.
    submittingRef.current = true;
    setIsSubmitting(true);

    try {
      const accepted = await onSend(
        message,
        selectedModel
      );

      if (accepted) {
        setValue("");
        setModelOpen(false);
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
    disabled,
    onSend,
    selectedModel,
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

  function handleModelSelect(model: ChatModel) {
    if (
      model.locked ||
      model.apiModelId === null ||
      isSubmitting ||
      isGenerating
    ) {
      return;
    }

    setSelectedModel(model.id);
    setModelOpen(false);
    textareaRef.current?.focus();
  }

  function handleOpenGuide() {
    setGuideOpen(true);
  }

  function handleCloseGuide() {
    setGuideOpen(false);
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
              relative flex w-full items-end gap-2
              rounded-full bg-[#313132] p-2.5
              transition-[box-shadow]
              duration-200
              focus-within:shadow-[0_0_0_1px_rgba(255,255,255,0.18)]
              sm:gap-2.5 sm:p-3
            "
          >
            {/* Add button — no attachments exist yet, so the button
                is always disabled with an honest tooltip instead of
                doing nothing on click. Hidden in web-task mode: web
                tasks don't take attachments. */}
            {!webTaskMode && (
              <button
                type="button"
                disabled
                className="
                  mb-0.5 flex h-9 w-9 shrink-0
                  items-center justify-center rounded-full
                  text-white transition-colors
                  active:scale-95
                  disabled:cursor-not-allowed
                  disabled:opacity-40
                "
                aria-label="Add attachment"
                title="File attachments — coming soon"
              >
                <Plus
                  className="h-5 w-5"
                  strokeWidth={2}
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
                }
              }}
              onKeyDown={handleKeyDown}
              rows={1}
              disabled={isSubmitting || disabled}
              placeholder={
                isGenerating
                  ? "Press Enter to stop..."
                  : webTaskMode
                    ? "Give AGI a web task…"
                    : "Message AGI..."
              }
              aria-label={webTaskMode ? "Give AGI a web task" : "Message AGI"}
              aria-describedby="chat-input-hint"
              className="
                min-h-[36px] max-h-[120px] min-w-0 flex-1
                resize-none overflow-y-auto bg-transparent
                px-0.5 py-1.5 text-[15px] leading-6
                text-zinc-100 outline-none
                placeholder:text-zinc-400
                disabled:cursor-wait disabled:opacity-70
              "
            />

            {/* Model selector + Web task toggle */}
            {!hasMessage && !isGenerating && (
              <div
                ref={modelRef}
                className="relative mb-0.5 flex shrink-0 items-center gap-1"
              >
                {onToggleWebTask && (
                  <button
                    type="button"
                    disabled={isSubmitting}
                    onClick={onToggleWebTask}
                    aria-pressed={webTaskMode}
                    aria-label="Toggle web task mode"
                    title="Web task: AGI opens a browser and does the task. Steps that send or submit ask you first."
                    className={`
                      flex h-8 shrink-0 items-center gap-1.5
                      rounded-xl px-2 text-[11px] font-medium
                      transition-colors sm:text-xs
                      ${
                        webTaskMode
                          ? "bg-[#0074E8] text-white hover:bg-[#0A7FF0]"
                          : "text-zinc-400 hover:bg-zinc-800/70 hover:text-zinc-200"
                      }
                      disabled:opacity-40
                    `}
                  >
                    <Globe
                      className="h-3.5 w-3.5 shrink-0"
                      aria-hidden="true"
                    />
                    <span className="hidden whitespace-nowrap min-[420px]:inline">Web task</span>
                  </button>
                )}
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() =>
                    setModelOpen((open) => !open)
                  }
                  className="
                    flex h-8 max-w-[104px] items-center
                    gap-1.5 rounded-xl px-2
                    text-[11px] font-medium text-zinc-400
                    transition-colors
                    hover:bg-zinc-800/70 hover:text-zinc-200
                    disabled:opacity-40 sm:text-xs
                    min-[420px]:max-w-[150px]
                  "
                  aria-haspopup="listbox"
                  aria-expanded={modelOpen}
                  aria-label={`Selected model: ${selectedModelConfig.name}`}
                >
                  <span className="truncate whitespace-nowrap">
                    {selectedModelConfig.name}
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

                {/* Model dropdown */}
                {modelOpen && (
                  <div
                    className="
                      absolute bottom-[43px] right-0 z-[9999]
                      max-h-[min(360px,60vh)]
                      w-[min(290px,calc(100vw-32px))]
                      overflow-y-auto overflow-x-hidden
                      rounded-xl border border-zinc-800
                      bg-[#18181B] p-1.5
                      shadow-[0_16px_45px_rgba(0,0,0,0.55)]
                    "
                    aria-label="Select AI model"
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
                        Choose a model
                      </p>

                      <button
                        type="button"
                        onClick={handleOpenGuide}
                        className="
                          inline-flex shrink-0
                          items-center gap-1.5
                          rounded-full
                          border border-[#FAFAFA]/40
                          bg-[#FAFAFA]/10
                          px-2.5 py-1.5
                          text-[11px] font-medium
                          text-[#FAFAFA]
                          transition-colors
                          hover:bg-[#FAFAFA]/20
                          focus-visible:outline-none
                          focus-visible:ring-2
                          focus-visible:ring-[#FAFAFA]
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

                    <div className="space-y-0.5">
                      {availableModels.map((model) => {
                        const selected =
                          selectedModel === model.id;

                        const unavailable =
                          isSubmitting || isGenerating;

                        return (
                          <button
                            key={model.id}
                            type="button"
                            disabled={unavailable}
                            onClick={() =>
                              handleModelSelect(model)
                            }
                            aria-pressed={selected}
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
                                {model.name}
                              </span>

                              <span
                                className="
                                  mt-0.5 block truncate
                                  text-[11px] text-zinc-600
                                "
                              >
                                {model.provider}
                              </span>
                            </span>

                            {selected ? (
                              <Check
                                className="
                                  h-4 w-4 shrink-0
                                  text-[#FAFAFA]
                                "
                                strokeWidth={2}
                                aria-hidden="true"
                              />
                            ) : null}
                          </button>
                        );
                      })}
                    </div>

                    <p className="border-t border-zinc-800 px-2.5 pb-1.5 pt-2.5 text-[11px] leading-5 text-zinc-600">
                      More models are coming. Only Gemini 2.5 Flash is
                      connected today.
                    </p>
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
                mb-0.5 flex h-9 w-9 shrink-0
                items-center justify-center rounded-full
                transition-all duration-150
                focus-visible:outline-none
                focus-visible:ring-2
                focus-visible:ring-[#0074E8]
                focus-visible:ring-offset-2
                focus-visible:ring-offset-[#181819]
                ${
                  isGenerating || isSubmitting || canSend
                    ? "bg-[#0074E8] text-white hover:bg-[#0A7FF0] active:scale-95"
                    : "cursor-not-allowed bg-[#0074E8] text-white/50"
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
            {disabled
              ? "Waiting for your approval"
              : webTaskMode
                ? "Web task mode — AGI opens a browser and does the task. Steps that send or submit ask you first."
                : "Enter to send · Shift+Enter for a new line"}
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