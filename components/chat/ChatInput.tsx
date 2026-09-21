
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
  Lock,
  Check,
  Paperclip,
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
};

export default function ChatInput({
  onSend,
  isGenerating,
  onStop,
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
    hasMessage && !isSubmitting && !isGenerating;

  const selectedModelConfig =
    CHAT_MODELS.find((model) => model.id === selectedModel) ??
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
      isGenerating
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
              rounded-2xl border border-zinc-800/90
              bg-[#151518] p-2.5
              shadow-[0_8px_30px_rgba(0,0,0,0.22)]
              transition-[border-color,box-shadow]
              duration-200
              focus-within:border-zinc-700
              focus-within:shadow-[0_10px_34px_rgba(0,0,0,0.28)]
              sm:gap-2.5 sm:p-3
            "
          >
            {/* Attachment button */}
            <button
              type="button"
              disabled={isSubmitting || isGenerating}
              className="
                mb-0.5 flex h-8 w-8 shrink-0
                items-center justify-center rounded-xl
                text-zinc-500 transition-colors
                hover:bg-zinc-800/70 hover:text-zinc-200
                active:scale-95
                disabled:cursor-not-allowed
                disabled:opacity-40
              "
              aria-label="Attach file"
              title="File attachments coming soon"
            >
              <Paperclip
                className="h-[17px] w-[17px]"
                strokeWidth={1.8}
                aria-hidden="true"
              />
            </button>

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

            {/* Model selector */}
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

                    <div className="space-y-0.5">
                      {CHAT_MODELS.map((model) => {
                        const selected =
                          selectedModel === model.id;

                        const unavailable =
                          model.locked ||
                          model.apiModelId === null ||
                          isSubmitting ||
                          isGenerating;

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

                            {model.locked ||
                            model.apiModelId === null ? (
                              <span
                                className="
                                  flex shrink-0 items-center
                                  gap-1 rounded-md
                                  border border-zinc-800
                                  px-1.5 py-1
                                  text-[9px] font-semibold
                                  uppercase tracking-wide
                                  text-zinc-600
                                "
                              >
                                <Lock
                                  className="h-2.5 w-2.5"
                                  aria-hidden="true"
                                />
                                PRO
                              </span>
                            ) : selected ? (
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