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

    setIsSubmitting(true);

    try {
      const accepted = await onSend(
        message,
        selectedModel
      );

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
            gap-2
            rounded-[17px]
            border
            border-zinc-800
            bg-[#151518]
            px-2.5
            py-2.5
            shadow-[0_8px_30px_rgba(0,0,0,0.22)]
            transition-[border-color,box-shadow]
            duration-200
            focus-within:border-zinc-700
            focus-within:shadow-[0_10px_34px_rgba(0,0,0,0.28)]
            sm:gap-2.5
            sm:px-3
            sm:py-3
          "
        >
          {/* Attach */}
          <button
            type="button"
            className="
              mb-0.5
              flex
              h-8
              w-8
              shrink-0
              items-center
              justify-center
              rounded-lg
              text-zinc-500
              transition-colors
              duration-150
              hover:bg-zinc-800/70
              hover:text-zinc-300
              active:bg-zinc-800
            "
            aria-label="Attach file"
          >
            <Paperclip
              className="h-[17px] w-[17px]"
              strokeWidth={1.8}
              aria-hidden="true"
            />
          </button>

          {/* Message */}
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
              px-0.5
              py-1.5
              text-[15px]
              leading-6
              text-zinc-100
              outline-none
              placeholder:text-zinc-600
              disabled:cursor-wait
              disabled:opacity-70
            "
          />

          {/* Model selector */}
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
                  h-8
                  max-w-[150px]
                  items-center
                  gap-1.5
                  rounded-lg
                  px-2
                  text-[11px]
                  font-medium
                  text-zinc-400
                  transition-colors
                  duration-150
                  hover:bg-zinc-800/70
                  hover:text-zinc-200
                  sm:text-xs
                "
                aria-haspopup="listbox"
                aria-expanded={modelOpen}
              >
                <span className="truncate whitespace-nowrap">
                  {selectedModel}
                </span>

                <ChevronDown
                  className={`
                    h-3.5
                    w-3.5
                    shrink-0
                    text-zinc-600
                    transition-transform
                    duration-150
                    ${modelOpen ? "rotate-180" : ""}
                  `}
                  aria-hidden="true"
                />
              </button>

              {/* Model dropdown */}
              {modelOpen && (
                <div
                  className="
                    absolute
                    bottom-[43px]
                    right-0
                    z-[9999]
                    w-[250px]
                    overflow-hidden
                    rounded-xl
                    border
                    border-zinc-800
                    bg-[#18181B]
                    p-1.5
                    shadow-[0_16px_45px_rgba(0,0,0,0.55)]
                    sm:w-[270px]
                  "
                  role="listbox"
                  aria-label="Select AI model"
                >
                  <div className="px-2.5 pb-2 pt-2">
                    <p className="text-[10px] font-medium uppercase tracking-[0.1em] text-zinc-600">
                      Model
                    </p>
                  </div>

                  <div className="space-y-0.5">
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
                            rounded-lg
                            px-2.5
                            py-2.5
                            text-left
                            transition-colors
                            duration-150
                            ${
                              model.locked
                                ? "cursor-not-allowed opacity-45"
                                : "hover:bg-zinc-800/70"
                            }
                          `}
                        >
                          <div className="min-w-0">
                            <p
                              className={`
                                truncate
                                text-sm
                                font-medium
                                ${
                                  selected
                                    ? "text-zinc-100"
                                    : "text-zinc-300"
                                }
                              `}
                            >
                              {model.name}
                            </p>

                            <p className="mt-0.5 text-[11px] text-zinc-600">
                              {model.provider}
                            </p>
                          </div>

                          {model.locked ? (
                            <span
                              className="
                                flex
                                shrink-0
                                items-center
                                gap-1
                                rounded-md
                                border
                                border-zinc-800
                                px-1.5
                                py-1
                                text-[9px]
                                font-semibold
                                uppercase
                                tracking-wide
                                text-zinc-600
                              "
                            >
                              <Lock className="h-2.5 w-2.5" />
                              PRO
                            </span>
                          ) : selected ? (
                            <Check
                              className="h-4 w-4 shrink-0 text-[#D4AF37]"
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

          {/* Send */}
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
              h-8
              w-8
              shrink-0
              items-center
              justify-center
              rounded-full
              transition-all
              duration-150
              ${
                canSend
                  ? "bg-[#D4AF37] text-black hover:bg-[#E0BB4C] active:scale-95"
                  : "cursor-not-allowed bg-zinc-800 text-zinc-600"
              }
            `}
          >
            <ArrowUp
              className="h-[16px] w-[16px]"
              strokeWidth={2.2}
              aria-hidden="true"
            />
          </button>
        </div>
      </form>
    </div>
  );
}