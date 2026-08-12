"use client";

import { useEffect, useRef, useState } from "react";
import {
  ArrowUp,
  ChevronDown,
  Paperclip,
  Lock,
  Check,
} from "lucide-react";

type Model = {
  provider: string;
  name: string;
  locked: boolean;
};

const models: Model[] = [
  // OpenAI
  { provider: "OpenAI", name: "GPT-5.5", locked: true },
  { provider: "OpenAI", name: "GPT-4.1", locked: true },
  { provider: "OpenAI", name: "GPT-4o", locked: true },
  { provider: "OpenAI", name: "GPT-4o Mini", locked: true },

  // Anthropic
  { provider: "Anthropic Claude", name: "Claude 4 Sonnet", locked: true },
  { provider: "Anthropic Claude", name: "Claude 4 Opus", locked: true },
  { provider: "Anthropic Claude", name: "Claude 3.7 Sonnet", locked: true },

  // Google
  { provider: "Google Gemini", name: "Gemini 1.5 Flash", locked: false },
  { provider: "Google Gemini", name: "Gemini 2.5 Pro", locked: true },
  { provider: "Google Gemini", name: "Gemini 2.5 Flash", locked: true },
  { provider: "Google Gemini", name: "Gemini 2.0 Flash", locked: true },

  // DeepSeek
  { provider: "DeepSeek", name: "DeepSeek V3", locked: true },
  { provider: "DeepSeek", name: "DeepSeek R1", locked: true },
  { provider: "DeepSeek", name: "DeepSeek Coder V2", locked: true },

  // xAI
  { provider: "xAI Grok", name: "Grok 4", locked: true },
  { provider: "xAI Grok", name: "Grok 3", locked: true },

  // Meta
  { provider: "Meta Llama", name: "Llama 4", locked: true },
  { provider: "Meta Llama", name: "Llama 3.3 70B", locked: true },

  // Alibaba
  { provider: "Alibaba Qwen", name: "Qwen 3", locked: true },
  { provider: "Alibaba Qwen", name: "Qwen 2.5 Coder", locked: true },

  // Mistral
  { provider: "Mistral", name: "Mistral Large", locked: true },
  { provider: "Mistral", name: "Mistral Small", locked: true },

  // Microsoft
  { provider: "Microsoft", name: "Phi-4", locked: true },
];

export default function ChatInput() {
  const [value, setValue] = useState("");
  const [modelOpen, setModelOpen] = useState(false);
  const [selectedModel, setSelectedModel] = useState("Gemini 1.5 Flash");

  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const modelMenuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!textareaRef.current) return;

    textareaRef.current.style.height = "auto";

    textareaRef.current.style.height = `${Math.min(
      textareaRef.current.scrollHeight,
      120
    )}px`;
  }, [value]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        modelMenuRef.current &&
        !modelMenuRef.current.contains(event.target as Node)
      ) {
        setModelOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleSubmit = () => {
    if (!value.trim()) return;

    setValue("");
  };

  const handleKeyDown = (
    event: React.KeyboardEvent<HTMLTextAreaElement>
  ) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      handleSubmit();
    }
  };

  const handleModelSelect = (model: Model) => {
    if (model.locked) return;

    setSelectedModel(model.name);
    setModelOpen(false);
  };

  return (
    <div className="mx-auto w-full">
      <form
        onSubmit={(event) => {
          event.preventDefault();
          handleSubmit();
        }}
      >
        <div
          className="
            relative
            flex
            items-end
            gap-2
            rounded-[20px]
            border
            border-[#3F3F46]
            bg-[#151518]/80
            px-3
            py-2.5
            backdrop-blur-xl
            transition-all
            duration-200
            focus-within:border-[#D4AF37]/40
            focus-within:shadow-[0_0_30px_rgba(212,175,55,0.06)]
          "
        >
          {/* Attach */}
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
              transition
              hover:bg-white/[0.05]
              hover:text-white
            "
            aria-label="Attach file"
          >
            <Paperclip className="h-[18px] w-[18px]" />
          </button>

          {/* Prompt */}
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(event) => setValue(event.target.value)}
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
            "
            aria-label="Message ANVIX AI"
          />

          {/* Model Selector
              Visible ONLY when input is empty */}
          {!value.trim() && (
            <div
              ref={modelMenuRef}
              className="relative mb-0.5 shrink-0"
            >
              <button
                type="button"
                onClick={() => setModelOpen((open) => !open)}
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
                  transition
                  hover:bg-white/[0.05]
                  hover:text-white
                "
              >
                <span>{selectedModel}</span>

                <ChevronDown
                  className={`h-3.5 w-3.5 transition-transform ${
                    modelOpen ? "rotate-180" : ""
                  }`}
                />
              </button>

              {/* Model Dropdown */}
              {modelOpen && (
                <div
                  className="
                    absolute
                    bottom-12
                    right-0
                    z-50
                    w-[280px]
                    overflow-hidden
                    rounded-2xl
                    border
                    border-zinc-800
                    bg-[#18181B]
                    p-2
                    shadow-[0_20px_60px_rgba(0,0,0,0.6)]
                    backdrop-blur-xl
                  "
                >
                  <div className="px-3 pb-2 pt-1">
                    <p className="text-[11px] font-medium uppercase tracking-wider text-zinc-600">
                      Select model
                    </p>
                  </div>

                  <div className="max-h-[360px] overflow-y-auto">
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
                            rounded-xl
                            px-3
                            py-2.5
                            text-left
                            transition
                            ${
                              model.locked
                                ? "cursor-not-allowed opacity-45"
                                : "hover:bg-white/[0.06]"
                            }
                          `}
                        >
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-zinc-200">
                              {model.name}
                            </p>

                            <p className="mt-0.5 text-[11px] text-zinc-600">
                              {model.provider}
                            </p>
                          </div>

                          <div className="ml-3 shrink-0">
                            {model.locked ? (
                              <span className="flex items-center gap-1 rounded-md border border-zinc-700/70 px-1.5 py-1 text-[9px] font-semibold uppercase tracking-wide text-zinc-500">
                                <Lock className="h-2.5 w-2.5" />
                                PRO
                              </span>
                            ) : selected ? (
                              <Check className="h-4 w-4 text-[#D4AF37]" />
                            ) : null}
                          </div>
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
              transition
              hover:bg-[#E5C158]
              active:scale-95
              disabled:cursor-not-allowed
              disabled:bg-zinc-700
              disabled:text-zinc-500
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