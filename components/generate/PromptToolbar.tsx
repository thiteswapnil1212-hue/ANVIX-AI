"use client";

import {
  useCallback,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import {
  ArrowUp,
  Check,
  ChevronDown,
  Code2,
  FilePlus2,
  Globe,
  Keyboard,
  Loader2,
  Paperclip,
  Plus,
  Settings2,
  Sparkles,
  X,
} from "lucide-react";

const MAX_CHARS = 2200;

const FRAMEWORKS = [
  {
    id: "nextjs",
    label: "Next.js",
    description: "React framework",
  },
  {
    id: "react",
    label: "React",
    description: "Frontend application",
  },
  {
    id: "vite",
    label: "Vite",
    description: "Fast frontend tooling",
  },
] as const;

const MODELS = [
  {
    id: "anvix-pro",
    label: "ANVIX Pro",
    description: "Best for complex builds",
  },
  {
    id: "anvix-fast",
    label: "ANVIX Fast",
    description: "Fast generation",
  },
] as const;

interface PromptBuilderProps {
  prompt: string;
  setPrompt: (value: string) => void;
  onGenerate: () => void;
  isSubmitting?: boolean;
}

export default function PromptBuilder({
  prompt,
  setPrompt,
  onGenerate,
  isSubmitting = false,
}: PromptBuilderProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const [showSettings, setShowSettings] = useState(false);
  const [showFrameworks, setShowFrameworks] = useState(false);
  const [showModels, setShowModels] = useState(false);

  const [framework, setFramework] = useState("nextjs");
  const [model, setModel] = useState("anvix-pro");

  const trimmedPrompt = prompt.trim();
  const remainingChars = MAX_CHARS - prompt.length;
  const canGenerate =
    trimmedPrompt.length > 0 && !isSubmitting;

  const selectedFramework =
    FRAMEWORKS.find((item) => item.id === framework) ??
    FRAMEWORKS[0];

  const selectedModel =
    MODELS.find((item) => item.id === model) ??
    MODELS[0];

  const handlePromptChange = useCallback(
    (value: string) => {
      if (value.length > MAX_CHARS) {
        setPrompt(value.slice(0, MAX_CHARS));
        return;
      }

      setPrompt(value);
    },
    [setPrompt]
  );

  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLTextAreaElement>) => {
      if (
        event.key === "Enter" &&
        (event.metaKey || event.ctrlKey)
      ) {
        event.preventDefault();

        if (canGenerate) {
          onGenerate();
        }
      }
    },
    [canGenerate, onGenerate]
  );

  const focusPrompt = useCallback(() => {
    textareaRef.current?.focus();
  }, []);

  const handleAttachment = useCallback(() => {
    // File attachment will be connected to the generation
    // context system in the next iteration.
    focusPrompt();
  }, [focusPrompt]);

  return (
    <section
      aria-labelledby="builder-title"
      className="
        relative
        overflow-visible
        rounded-[28px]
        border
        border-zinc-800/80
        bg-[#111113]
        shadow-[0_24px_80px_rgba(0,0,0,0.28)]
      "
    >
      {/* Ambient glow */}
      <div
        aria-hidden="true"
        className="
          pointer-events-none
          absolute
          -right-32
          -top-32
          h-80
          w-80
          rounded-full
          bg-[#D4AF37]/[0.055]
          blur-[110px]
        "
      />

      <div
        aria-hidden="true"
        className="
          pointer-events-none
          absolute
          -bottom-40
          left-1/3
          h-72
          w-72
          rounded-full
          bg-[#D4AF37]/[0.025]
          blur-[100px]
        "
      />

      <div className="relative">
        {/* Header */}
        <header
          className="
            flex
            items-center
            justify-between
            gap-4
            border-b
            border-zinc-800/70
            px-5
            py-4
            sm:px-6
          "
        >
          <div className="flex min-w-0 items-center gap-3">
            <div
              className="
                flex
                h-9
                w-9
                shrink-0
                items-center
                justify-center
                rounded-xl
                border
                border-[#D4AF37]/20
                bg-[#D4AF37]/[0.07]
              "
            >
              <Sparkles
                className="h-4 w-4 text-[#D4AF37]"
                strokeWidth={1.8}
              />
            </div>

            <div className="min-w-0">
              <h2
                id="builder-title"
                className="truncate text-sm font-semibold text-white"
              >
                Build with ANVIX
              </h2>

              <p className="mt-0.5 hidden text-[11px] text-zinc-600 sm:block">
                Describe your idea and let the agent build it.
              </p>
            </div>
          </div>

          <div className="hidden items-center gap-2 rounded-full border border-zinc-800 bg-[#0D0D0F] px-3 py-1.5 md:flex">
            <Keyboard className="h-3.5 w-3.5 text-zinc-600" />

            <span className="text-[10px] text-zinc-600">
              Ctrl / ⌘ + Enter
            </span>
          </div>
        </header>

        {/* Prompt area */}
        <div className="p-4 sm:p-5">
          <div
            className={`
              overflow-hidden
              rounded-2xl
              border
              bg-[#0B0B0D]
              transition-all
              duration-200
              ${
                trimmedPrompt
                  ? "border-[#D4AF37]/35 shadow-[0_0_35px_rgba(212,175,55,0.045)]"
                  : "border-zinc-800"
              }
              ${
                isSubmitting
                  ? "pointer-events-none opacity-80"
                  : ""
              }
            `}
          >
            <textarea
              ref={textareaRef}
              id="generate-prompt"
              name="prompt"
              value={prompt}
              onChange={(event) =>
                handlePromptChange(event.target.value)
              }
              onKeyDown={handleKeyDown}
              maxLength={MAX_CHARS}
              rows={8}
              disabled={isSubmitting}
              spellCheck
              autoComplete="off"
              aria-label="Describe the application you want ANVIX to build"
              aria-describedby="prompt-helper prompt-counter"
              placeholder="Build a premium SaaS dashboard for a design agency with authentication, project management, team collaboration, analytics, billing, and a clean dark interface..."
              className="
                block
                min-h-[200px]
                w-full
                resize-none
                bg-transparent
                px-5
                py-5
                text-sm
                leading-7
                text-zinc-100
                outline-none
                placeholder:text-zinc-600
                disabled:cursor-not-allowed
                sm:min-h-[220px]
                sm:text-[15px]
              "
            />

            {/* Prompt footer */}
            <div
              className="
                flex
                flex-wrap
                items-center
                justify-between
                gap-3
                border-t
                border-zinc-800/70
                px-4
                py-2.5
              "
            >
              <span
                id="prompt-helper"
                className="text-[10px] text-zinc-600"
              >
                {trimmedPrompt
                  ? "Ready to build"
                  : "Describe your product, users and key features"}
              </span>

              <span
                id="prompt-counter"
                className={`
                  text-[10px]
                  tabular-nums
                  ${
                    remainingChars < 200
                      ? "text-[#D4AF37]"
                      : "text-zinc-700"
                  }
                `}
              >
                {prompt.length.toLocaleString()} /{" "}
                {MAX_CHARS.toLocaleString()}
              </span>
            </div>

            {/* Toolbar */}
            <div
              className="
                flex
                items-center
                justify-between
                gap-2
                border-t
                border-zinc-800/70
                px-3
                py-2.5
              "
            >
              <div className="flex min-w-0 items-center gap-1.5">
                {/* Attachment */}
                <button
                  type="button"
                  onClick={handleAttachment}
                  disabled={isSubmitting}
                  className="
                    inline-flex
                    items-center
                    gap-1.5
                    rounded-lg
                    px-2.5
                    py-1.5
                    text-[10px]
                    text-zinc-600
                    transition
                    hover:bg-zinc-800/60
                    hover:text-zinc-300
                    disabled:cursor-not-allowed
                    disabled:opacity-40
                  "
                  aria-label="Add context"
                >
                  <Paperclip className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">
                    Add context
                  </span>
                </button>

                <div className="h-4 w-px bg-zinc-800" />

                {/* Framework selector */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => {
                      setShowFrameworks(
                        (current) => !current
                      );
                      setShowModels(false);
                    }}
                    disabled={isSubmitting}
                    className="
                      inline-flex
                      max-w-[140px]
                      items-center
                      gap-1.5
                      rounded-lg
                      px-2.5
                      py-1.5
                      text-[10px]
                      text-zinc-500
                      transition
                      hover:bg-zinc-800/60
                      hover:text-zinc-300
                      disabled:cursor-not-allowed
                      disabled:opacity-40
                    "
                    aria-haspopup="listbox"
                    aria-expanded={showFrameworks}
                  >
                    <Code2 className="h-3.5 w-3.5 shrink-0" />

                    <span className="truncate">
                      {selectedFramework.label}
                    </span>

                    <ChevronDown className="h-3 w-3 shrink-0" />
                  </button>

                  {showFrameworks && (
                    <div
                      className="
                        absolute
                        bottom-full
                        left-0
                        z-50
                        mb-2
                        w-56
                        overflow-hidden
                        rounded-xl
                        border
                        border-zinc-800
                        bg-[#111113]
                        p-1
                        shadow-[0_20px_50px_rgba(0,0,0,0.45)]
                      "
                    >
                      {FRAMEWORKS.map((item) => {
                        const active =
                          item.id === framework;

                        return (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => {
                              setFramework(item.id);
                              setShowFrameworks(false);
                            }}
                            className="
                              flex
                              w-full
                              items-center
                              justify-between
                              rounded-lg
                              px-3
                              py-2.5
                              text-left
                              transition
                              hover:bg-zinc-800/60
                            "
                          >
                            <div>
                              <p
                                className={`
                                  text-xs
                                  font-medium
                                  ${
                                    active
                                      ? "text-[#D4AF37]"
                                      : "text-zinc-300"
                                  }
                                `}
                              >
                                {item.label}
                              </p>

                              <p className="mt-0.5 text-[10px] text-zinc-600">
                                {item.description}
                              </p>
                            </div>

                            {active && (
                              <Check className="h-3.5 w-3.5 text-[#D4AF37]" />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Model selector */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => {
                      setShowModels((current) => !current);
                      setShowFrameworks(false);
                    }}
                    disabled={isSubmitting}
                    className="
                      inline-flex
                      max-w-[140px]
                      items-center
                      gap-1.5
                      rounded-lg
                      px-2.5
                      py-1.5
                      text-[10px]
                      text-zinc-500
                      transition
                      hover:bg-zinc-800/60
                      hover:text-zinc-300
                      disabled:cursor-not-allowed
                      disabled:opacity-40
                    "
                    aria-haspopup="listbox"
                    aria-expanded={showModels}
                  >
                    <Sparkles className="h-3.5 w-3.5 shrink-0" />

                    <span className="truncate">
                      {selectedModel.label}
                    </span>

                    <ChevronDown className="h-3 w-3 shrink-0" />
                  </button>

                  {showModels && (
                    <div
                      className="
                        absolute
                        bottom-full
                        left-0
                        z-50
                        mb-2
                        w-56
                        overflow-hidden
                        rounded-xl
                        border
                        border-zinc-800
                        bg-[#111113]
                        p-1
                        shadow-[0_20px_50px_rgba(0,0,0,0.45)]
                      "
                    >
                      {MODELS.map((item) => {
                        const active = item.id === model;

                        return (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => {
                              setModel(item.id);
                              setShowModels(false);
                            }}
                            className="
                              flex
                              w-full
                              items-center
                              justify-between
                              rounded-lg
                              px-3
                              py-2.5
                              text-left
                              transition
                              hover:bg-zinc-800/60
                            "
                          >
                            <div>
                              <p
                                className={`
                                  text-xs
                                  font-medium
                                  ${
                                    active
                                      ? "text-[#D4AF37]"
                                      : "text-zinc-300"
                                  }
                                `}
                              >
                                {item.label}
                              </p>

                              <p className="mt-0.5 text-[10px] text-zinc-600">
                                {item.description}
                              </p>
                            </div>

                            {active && (
                              <Check className="h-3.5 w-3.5 text-[#D4AF37]" />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* Generate button */}
              <button
                type="button"
                onClick={onGenerate}
                disabled={!canGenerate}
                className="
                  group
                  flex
                  h-9
                  w-9
                  shrink-0
                  items-center
                  justify-center
                  rounded-xl
                  bg-[#D4AF37]
                  text-black
                  shadow-[0_6px_20px_rgba(212,175,55,0.12)]
                  transition-all
                  duration-200
                  hover:bg-[#E2C259]
                  hover:shadow-[0_8px_25px_rgba(212,175,55,0.18)]
                  active:scale-95
                  disabled:cursor-not-allowed
                  disabled:bg-zinc-800
                  disabled:text-zinc-600
                  disabled:shadow-none
                "
                aria-label={
                  isSubmitting
                    ? "Building application"
                    : "Build application"
                }
              >
                {isSubmitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <ArrowUp
                    className="
                      h-4
                      w-4
                      transition-transform
                      duration-200
                      group-hover:-translate-y-0.5
                    "
                    strokeWidth={2.5}
                  />
                )}
              </button>
            </div>
          </div>

          {/* Advanced settings */}
          <div className="mt-3">
            <button
              type="button"
              onClick={() =>
                setShowSettings((current) => !current)
              }
              className="
                inline-flex
                items-center
                gap-2
                rounded-lg
                px-2
                py-1.5
                text-[10px]
                text-zinc-600
                transition
                hover:text-zinc-400
              "
              aria-expanded={showSettings}
            >
              <Settings2 className="h-3.5 w-3.5" />

              Advanced build settings

              <ChevronDown
                className={`
                  h-3 w-3 transition-transform
                  ${showSettings ? "rotate-180" : ""}
                `}
              />
            </button>

            {showSettings && (
              <div
                className="
                  mt-2
                  grid
                  gap-2
                  rounded-xl
                  border
                  border-zinc-800/70
                  bg-[#0D0D0F]
                  p-3
                  sm:grid-cols-3
                "
              >
                <Setting
                  icon={Globe}
                  label="Responsive"
                  value="Desktop + Mobile"
                />

                <Setting
                  icon={FilePlus2}
                  label="Architecture"
                  value="Production ready"
                />

                <Setting
                  icon={Plus}
                  label="Code style"
                  value="TypeScript"
                />
              </div>
            )}
          </div>

          {/* Keyboard hint */}
          <div className="mt-3 flex items-center justify-between">
            <p className="text-[10px] leading-5 text-zinc-700">
              Be specific about features, users, integrations,
              and visual direction.
            </p>

            <span className="hidden items-center gap-1.5 text-[10px] text-zinc-700 sm:flex">
              <Keyboard className="h-3 w-3" />
              Ctrl + Enter
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}

interface SettingProps {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}

function Setting({
  icon: Icon,
  label,
  value,
}: SettingProps) {
  return (
    <div
      className="
        flex
        items-center
        gap-2.5
        rounded-lg
        border
        border-zinc-800/70
        bg-[#111113]
        px-3
        py-2.5
      "
    >
      <Icon className="h-3.5 w-3.5 shrink-0 text-zinc-600" />

      <div className="min-w-0">
        <p className="text-[9px] uppercase tracking-[0.12em] text-zinc-700">
          {label}
        </p>

        <p className="mt-0.5 truncate text-[10px] text-zinc-400">
          {value}
        </p>
      </div>
    </div>
  );
}