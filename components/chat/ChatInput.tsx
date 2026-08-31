"use client";

import { useEffect, useRef, useState } from "react";
import {
  ArrowUp,
  ChevronDown,
  Lock,
  Check,
  Paperclip,
} from "lucide-react";

type Model = {
  name: string;
  provider: string;
  locked: boolean;
};

const models: Model[] = [
  {
    name: "GPT-5.5",
    provider: "OpenAI",
    locked: true,
  },
  {
    name: "GPT-4.1",
    provider: "OpenAI",
    locked: true,
  },
  {
    name: "Gemini 2.5 Flash",
    provider: "Google Gemini",
    locked: false,
  },
];

type ChatInputProps = {
  onSend: (
    message: string,
    model: string
  ) => boolean | Promise<boolean>;
};

export default function ChatInput({ onSend }: ChatInputProps) {
  const [value, setValue] = useState("");
  const [modelOpen, setModelOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedModel, setSelectedModel] =
    useState("Gemini 2.5 Flash");

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const modelRef = useRef<HTMLDivElement>(null);

  /*
   * IMPORTANT:
   * The button is enabled whenever the user has entered
   * meaningful text and we are not currently submitting.
   */
  const hasMessage = value.trim().length > 0;
  const canSend = hasMessage && !isSubmitting;

  /* --------------------------------
     AUTO RESIZE
  -------------------------------- */
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

  /* --------------------------------
     CLOSE DROPDOWN
  -------------------------------- */
  useEffect(() => {
    function handleOutsideClick(event: MouseEvent) {
      const target = event.target as Node;

      if (
        modelRef.current &&
        !modelRef.current.contains(target)
      ) {
        setModelOpen(false);
      }
    }

    document.addEventListener(
      "mousedown",
      handleOutsideClick
    );

    return () => {
      document.removeEventListener(
        "mousedown",
        handleOutsideClick
      );
    };
  }, []);

  /* --------------------------------
     ESC CLOSES MODEL MENU
  -------------------------------- */
  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setModelOpen(false);
      }
    }

    document.addEventListener(
      "keydown",
      handleEscape
    );

    return () => {
      document.removeEventListener(
        "keydown",
        handleEscape
      );
    };
  }, []);

  /* --------------------------------
     MODEL SELECT
  -------------------------------- */
  function handleModelSelect(model: Model) {
    if (model.locked) return;

    setSelectedModel(model.name);
    setModelOpen(false);

    textareaRef.current?.focus();
  }

  /* --------------------------------
     SEND
  -------------------------------- */
  async function handleSubmit() {
    const message = value.trim();

    if (!message || isSubmitting) {
      return;
    }

    /*
     * Lock immediately so double-click / Enter spam
     * cannot create duplicate messages.
     */
    setIsSubmitting(true);

    try {
      const accepted = await onSend(
        message,
        selectedModel
      );

      /*
       * Parent accepted the message.
       * Only now clear the input.
       */
      if (accepted) {
        setValue("");
        setModelOpen(false);

        requestAnimationFrame(() => {
          textareaRef.current?.focus();
        });
      }
    } catch (error) {
      console.error(
        "ANVIX chat submission failed:",
        error
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  /* --------------------------------
     KEYBOARD
  -------------------------------- */
  function handleKeyDown(
    event: React.KeyboardEvent<HTMLTextAreaElement>
  ) {
    /*
     * Enter = send
     * Shift + Enter = newline
     */
    if (
      event.key === "Enter" &&
      !event.shiftKey
    ) {
      event.preventDefault();

      if (canSend) {
        void handleSubmit();
      }
    }
  }

  return (
    <div className="relative mx-auto w-full">
      <form
        onSubmit={(event) => {
          event.preventDefault();

          if (canSend) {
            void handleSubmit();
          }
        }}
      >
        <div
          className="
            relative
            flex
            w-full
            items-end
            gap-2.5
            rounded-[18px]
            border
            border-[#3F3F46]
            bg-[#151518]/85
            px-3
            py-3
            shadow-[0_10px_40px_rgba(0,0,0,0.25)]
            backdrop-blur-xl
            transition-all
            duration-300
            focus-within:border-[#D4AF37]/50
            focus-within:shadow-[0_0_30px_rgba(212,175,55,0.08)]
            sm:gap-3
            sm:px-3.5
            sm:py-3.5
          "
        >
          <button
            type="button"
            className="
              mb-0.5
              flex
              h-9
              w-9
              shrink-0
              items-center
              justify-center
              rounded-xl
              text-zinc-500
              transition-all
              duration-200
              hover:scale-105
              hover:bg-white/[0.06]
              hover:text-white
              active:scale-95
            "
            aria-label="Attach file"
          >
            <Paperclip
              className="h-[18px] w-[18px]"
              aria-hidden="true"
            />
          </button>

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
            placeholder="Message ANVIX AI..."
            aria-label="Message ANVIX AI"
            className="
              min-h-[36px]
              max-h-[120px]
              min-w-0
              flex-1
              resize-none
              overflow-y-auto
              bg-transparent
              py-1.5
              text-[15px]
              leading-6
              text-white
              outline-none
              placeholder:text-zinc-600
              disabled:cursor-wait
              disabled:opacity-80
            "
          />

          {!hasMessage && (
            <div
              ref={modelRef}
              className="relative mb-0.5 shrink-0"
            >
              <button
                type="button"
                onClick={() =>
                  setModelOpen((open) => !open)
                }
                className="
                  flex
                  h-9
                  max-w-[120px]
                  items-center
                  gap-1
                  rounded-xl
                  px-2
                  text-[11px]
                  font-medium
                  text-zinc-300
                  transition-all
                  hover:bg-white/[0.06]
                  hover:text-white
                  sm:gap-1.5
                  sm:px-2.5
                  sm:text-xs
                "
                aria-haspopup="listbox"
                aria-expanded={modelOpen}
              >
                <span className="truncate whitespace-nowrap">
                  {selectedModel}
                </span>

                <ChevronDown
                  className={`h-3.5 w-3.5 shrink-0 transition-transform duration-200 ${
                    modelOpen ? "rotate-180" : ""
                  }`}
                  aria-hidden="true"
                />
              </button>

              {modelOpen && (
                <div
                  className="
                    absolute
                    bottom-[46px]
                    right-0
                    z-[9999]
                    w-[240px]
                    overflow-hidden
                    rounded-2xl
                    border
                    border-zinc-800
                    bg-[#18181B]
                    p-2
                    shadow-[0_20px_60px_rgba(0,0,0,0.75)]
                    sm:w-[280px]
                  "
                  role="listbox"
                  aria-label="Select AI model"
                >
                  <div className="px-3 pb-2 pt-1">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-zinc-500">
                      Select model
                    </p>

                    <p className="mt-1 text-xs text-zinc-600">
                      Choose your AI model
                    </p>
                  </div>

                  <div className="space-y-1">
                    {models.map((model) => {
                      const selected =
                        selectedModel === model.name;

                      return (
                        <button
                          key={`${model.provider}-${model.name}`}
                          type="button"
                          disabled={model.locked}
                          onClick={() =>
                            handleModelSelect(model)
                          }
                          className={`
                            flex
                            w-full
                            items-center
                            justify-between
                            gap-3
                            rounded-xl
                            px-3
                            py-2.5
                            text-left
                            transition
                            ${
                              model.locked
                                ? "cursor-not-allowed opacity-60"
                                : "hover:bg-white/[0.06]"
                            }
                          `}
                        >
                          <div className="min-w-0">
                            <p
                              className={`truncate text-sm font-medium ${
                                selected
                                  ? "text-white"
                                  : "text-zinc-200"
                              }`}
                            >
                              {model.name}
                            </p>

                            <p className="mt-0.5 text-[11px] text-zinc-600">
                              {model.provider}
                            </p>
                          </div>

                          {model.locked ? (
                            <span className="flex shrink-0 items-center gap-1 rounded-md border border-zinc-700 px-1.5 py-1 text-[9px] font-bold uppercase tracking-wide text-zinc-500">
                              <Lock className="h-2.5 w-2.5" />
                              PRO
                            </span>
                          ) : selected ? (
                            <Check
                              className="h-4 w-4 shrink-0 text-[#D4AF37]"
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

          <button
            type="submit"
            disabled={!canSend}
            aria-disabled={!canSend}
            aria-label={
              isSubmitting
                ? "Sending message"
                : "Send message"
            }
            className={`
              mb-0.5
              flex
              h-9
              w-9
              shrink-0
              items-center
              justify-center
              rounded-full
              transition-all
              duration-200
              ${
                canSend
                  ? "bg-[#D4AF37] text-black hover:scale-105 hover:bg-[#E5C158] active:scale-90"
                  : "cursor-not-allowed bg-zinc-700 text-zinc-500"
              }
            `}
          >
            <ArrowUp
              className="h-[17px] w-[17px]"
              aria-hidden="true"
            />
          </button>
        </div>
      </form>
    </div>
  );
}