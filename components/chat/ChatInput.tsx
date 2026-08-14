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
    name: "Gemini 1.5 Flash",
    provider: "Google Gemini",
    locked: false,
  },
];

type ChatInputProps = {
  onSend: (message: string, model: string) => void;
};

export default function ChatInput({
  onSend,
}: ChatInputProps) {
  const [value, setValue] = useState("");
  const [modelOpen, setModelOpen] = useState(false);
  const [selectedModel, setSelectedModel] =
    useState("Gemini 1.5 Flash");

  const textareaRef =
    useRef<HTMLTextAreaElement | null>(null);

  const modelRef =
    useRef<HTMLDivElement | null>(null);

  /* --------------------------------
     AUTO RESIZE TEXTAREA
  -------------------------------- */
  useEffect(() => {
    const textarea = textareaRef.current;

    if (!textarea) return;

    textarea.style.height = "auto";

    const height = Math.min(
      textarea.scrollHeight,
      120
    );

    textarea.style.height = `${height}px`;
  }, [value]);

  /* --------------------------------
     CLOSE DROPDOWN OUTSIDE CLICK
  -------------------------------- */
  useEffect(() => {
    const handleOutsideClick = (
      event: MouseEvent
    ) => {
      if (
        modelRef.current &&
        !modelRef.current.contains(
          event.target as Node
        )
      ) {
        setModelOpen(false);
      }
    };

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
     MODEL SELECTION
  -------------------------------- */
  const handleModelSelect = (
    model: Model
  ) => {
    if (model.locked) {
      return;
    }

    setSelectedModel(model.name);
    setModelOpen(false);
  };

  /* --------------------------------
     SEND MESSAGE
  -------------------------------- */
  const handleSubmit = () => {
    const prompt = value.trim();

    if (!prompt) {
      return;
    }

    onSend(prompt, selectedModel);
    setValue("");
    setModelOpen(false);
  };

  /* --------------------------------
     KEYBOARD HANDLING
  -------------------------------- */
  const handleKeyDown = (
    event: React.KeyboardEvent<HTMLTextAreaElement>
  ) => {
    if (
      event.key === "Enter" &&
      !event.shiftKey
    ) {
      event.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="relative mx-auto w-full">
      <form
        onSubmit={(event) => {
          event.preventDefault();
          handleSubmit();
        }}
      >
        {/* =====================================
            MAIN PROMPT BOX
        ====================================== */}
        <div
          className="
            relative
            flex
            w-full
            items-end
            gap-2
            rounded-[18px]
            border
            border-[#3F3F46]
            bg-[#151518]/80
            px-3
            py-2.5
            shadow-[0_10px_40px_rgba(0,0,0,0.25)]
            backdrop-blur-xl
            transition-all
            duration-300
            focus-within:border-[#D4AF37]/50
            focus-within:shadow-[0_0_30px_rgba(212,175,55,0.08)]
          "
        >
          {/* =====================================
              ATTACHMENT BUTTON
          ====================================== */}
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
              hover:bg-white/[0.06]
              hover:text-white
              hover:scale-105
              active:scale-95
            "
            aria-label="Attach file"
          >
            <Paperclip className="h-[18px] w-[18px]" />
          </button>

          {/* =====================================
              TEXTAREA
          ====================================== */}
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(event) => {
              const nextValue = event.target.value;
              setValue(nextValue);

              if (nextValue.trim().length > 0) {
                setModelOpen(false);
              }
            }}
            onKeyDown={handleKeyDown}
            rows={1}
            placeholder="Message ANVIX AI..."
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
              scrollbar-thin
              scrollbar-track-transparent
              scrollbar-thumb-zinc-700
            "
            aria-label="Message ANVIX AI"
          />

          {/* =====================================
              MODEL SELECTOR
          ====================================== */}
          {!value.trim() && (
            <div
              ref={modelRef}
              className="
                relative
                mb-0.5
                shrink-0
              "
            >
              <button
                type="button"
                onClick={() =>
                  setModelOpen(
                    (previous) => !previous
                  )
                }
                className="
                  flex
                  h-9
                  items-center
                  gap-1.5
                  rounded-xl
                  px-2.5
                  text-xs
                  font-medium
                  text-zinc-300
                  transition-all
                  duration-200
                  hover:bg-white/[0.06]
                  hover:text-white
                  active:scale-[0.97]
                "
                aria-haspopup="listbox"
                aria-expanded={modelOpen}
              >
                <span className="whitespace-nowrap">
                  {selectedModel}
                </span>

                <ChevronDown
                  className={`
                    h-3.5
                    w-3.5
                    transition-transform
                    duration-200
                    ${
                      modelOpen
                        ? "rotate-180"
                        : "rotate-0"
                    }
                  `}
                />
              </button>

              {/* =================================
                  MODEL DROPDOWN
              ================================== */}
              {modelOpen && (
                <div
                  className="
                    absolute
                    bottom-[46px]
                    right-0
                    z-[9999]
                    w-[280px]
                    overflow-hidden
                    rounded-2xl
                    border
                    border-zinc-800
                    bg-[#18181B]
                    p-2
                    shadow-[0_20px_60px_rgba(0,0,0,0.75)]
                    backdrop-blur-xl
                  "
                  role="listbox"
                >
                  {/* Header */}
                  <div className="px-3 pb-2 pt-1">
                    <p
                      className="
                        text-[11px]
                        font-semibold
                        uppercase
                        tracking-[0.12em]
                        text-zinc-500
                      "
                    >
                      Select model
                    </p>

                    <p className="mt-1 text-xs text-zinc-600">
                      Choose your AI model
                    </p>
                  </div>

                  {/* Model list */}
                  <div className="max-h-[250px] overflow-y-auto">
                    <div className="space-y-1">
                      {models.map((model) => {
                        const selected =
                          selectedModel ===
                          model.name;

                        return (
                          <button
                            key={`${model.provider}-${model.name}`}
                            type="button"
                            disabled={model.locked}
                            onClick={() =>
                              handleModelSelect(
                                model
                              )
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
                              transition-all
                              duration-150
                              ${
                                model.locked
                                  ? "cursor-not-allowed opacity-60"
                                  : "hover:bg-white/[0.06]"
                              }
                            `}
                          >
                            {/* Model info */}
                            <div className="min-w-0">
                              <p
                                className={`
                                  truncate
                                  text-sm
                                  font-medium
                                  ${
                                    selected
                                      ? "text-white"
                                      : "text-zinc-200"
                                  }
                                `}
                              >
                                {model.name}
                              </p>

                              <p
                                className="
                                  mt-0.5
                                  truncate
                                  text-[11px]
                                  text-zinc-600
                                "
                              >
                                {model.provider}
                              </p>
                            </div>

                            {/* Status */}
                            {model.locked ? (
                              <span
                                className="
                                  ml-3
                                  flex
                                  shrink-0
                                  items-center
                                  gap-1
                                  rounded-md
                                  border
                                  border-zinc-700
                                  px-1.5
                                  py-1
                                  text-[9px]
                                  font-bold
                                  uppercase
                                  tracking-wide
                                  text-zinc-500
                                "
                              >
                                <Lock className="h-2.5 w-2.5" />
                                PRO
                              </span>
                            ) : selected ? (
                              <Check
                                className="
                                  ml-3
                                  h-4
                                  w-4
                                  shrink-0
                                  text-[#D4AF37]
                                "
                              />
                            ) : null}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* =====================================
              SEND BUTTON
          ====================================== */}
          <button
            type="submit"
            disabled={!value.trim()}
            className="
              mb-0.5
              flex
              h-9
              w-9
              shrink-0
              items-center
              justify-center
              rounded-full
              bg-[#D4AF37]
              text-black
              transition-all
              duration-200
              hover:bg-[#E5C158]
              hover:scale-105
              active:scale-90
              disabled:cursor-not-allowed
              disabled:bg-zinc-700
              disabled:text-zinc-500
              disabled:hover:scale-100
            "
            aria-label="Send message"
          >
            <ArrowUp className="h-[17px] w-[17px]" />
          </button>
        </div>
      </form>
    </div>
  );
}
