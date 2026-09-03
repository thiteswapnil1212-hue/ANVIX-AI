"use client";

import {
  Check,
  Database,
  Globe2,
  KeyRound,
  LayoutDashboard,
  Server,
  Sparkles,
  WandSparkles,
} from "lucide-react";

export type BuildOptionCategory =
  | "application"
  | "backend"
  | "database"
  | "authentication"
  | "ai";

export interface BuildConfiguration {
  application: string;
  backend: string;
  database: string;
  authentication: string;
  ai: string;
}

interface BuildOptionsProps {
  value: BuildConfiguration;
  onChange: (
    category: BuildOptionCategory,
    option: string
  ) => void;
  disabled?: boolean;
}

interface Option {
  id: string;
  label: string;
  description: string;
  icon: typeof Globe2;
  badge?: string;
}

interface OptionGroup {
  id: BuildOptionCategory;
  label: string;
  description: string;
  icon: typeof Globe2;
  options: Option[];
}

const optionGroups: OptionGroup[] = [
  {
    id: "application",
    label: "Application",
    description: "What are you building?",
    icon: LayoutDashboard,
    options: [
      {
        id: "web-app",
        label: "Web App",
        description: "Modern responsive application",
        icon: Globe2,
        badge: "Recommended",
      },
      {
        id: "dashboard",
        label: "Dashboard",
        description: "Data-rich admin experience",
        icon: LayoutDashboard,
      },
    ],
  },
  {
    id: "backend",
    label: "Backend",
    description: "How should your app run?",
    icon: Server,
    options: [
      {
        id: "nextjs",
        label: "Next.js",
        description: "Full-stack React application",
        icon: Server,
        badge: "Default",
      },
      {
        id: "api",
        label: "API Ready",
        description: "Structured backend architecture",
        icon: Server,
      },
    ],
  },
  {
    id: "database",
    label: "Database",
    description: "Where should data live?",
    icon: Database,
    options: [
      {
        id: "postgresql",
        label: "PostgreSQL",
        description: "Production-ready relational data",
        icon: Database,
      },
      {
        id: "none",
        label: "No Database",
        description: "Frontend-first prototype",
        icon: Database,
      },
    ],
  },
  {
    id: "authentication",
    label: "Authentication",
    description: "How should users sign in?",
    icon: KeyRound,
    options: [
      {
        id: "email",
        label: "Email & Password",
        description: "Standard secure authentication",
        icon: KeyRound,
      },
      {
        id: "social",
        label: "Social Login",
        description: "Google and other providers",
        icon: KeyRound,
      },
      {
        id: "none",
        label: "No Auth",
        description: "Public application",
        icon: KeyRound,
      },
    ],
  },
  {
    id: "ai",
    label: "AI Capabilities",
    description: "Add intelligence to your product",
    icon: Sparkles,
    options: [
      {
        id: "ai-assistant",
        label: "AI Assistant",
        description: "Conversational AI experience",
        icon: Sparkles,
        badge: "Popular",
      },
      {
        id: "ai-agents",
        label: "AI Agents",
        description: "Task-oriented AI workflows",
        icon: WandSparkles,
      },
      {
        id: "none",
        label: "No AI",
        description: "Traditional application",
        icon: Sparkles,
      },
    ],
  },
];

export const defaultBuildConfiguration: BuildConfiguration = {
  application: "web-app",
  backend: "nextjs",
  database: "postgresql",
  authentication: "email",
  ai: "ai-assistant",
};

export default function BuildOptions({
  value,
  onChange,
  disabled = false,
}: BuildOptionsProps) {
  return (
    <section
      aria-labelledby="build-options-title"
      className="
        relative
        overflow-hidden
        rounded-3xl
        border
        border-zinc-800/80
        bg-[#111113]
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
          h-72
          w-72
          rounded-full
          bg-[#D4AF37]/[0.035]
          blur-[100px]
        "
      />

      {/* Header */}
      <div
        className="
          relative
          flex
          flex-col
          gap-4
          border-b
          border-zinc-800/70
          px-5
          py-5
          sm:flex-row
          sm:items-center
          sm:justify-between
          sm:px-6
        "
      >
        <div className="flex items-center gap-3">
          <div
            className="
              flex
              h-10
              w-10
              shrink-0
              items-center
              justify-center
              rounded-xl
              border
              border-[#D4AF37]/15
              bg-[#D4AF37]/[0.06]
            "
          >
            <WandSparkles
              className="h-4.5 w-4.5 text-[#D4AF37]"
              strokeWidth={1.7}
              aria-hidden="true"
            />
          </div>

          <div>
            <h2
              id="build-options-title"
              className="text-sm font-semibold text-white"
            >
              Build configuration
            </h2>

            <p className="mt-0.5 text-xs text-zinc-600">
              Give ANVIX a few preferences for your first build.
            </p>
          </div>
        </div>

        {/* Configuration count */}
        <div
          className="
            inline-flex
            w-fit
            items-center
            gap-2
            rounded-full
            border
            border-zinc-800
            bg-[#0D0D0F]
            px-3
            py-1.5
          "
        >
          <span
            className="
              h-1.5
              w-1.5
              rounded-full
              bg-emerald-400
            "
            aria-hidden="true"
          />

          <span className="text-[10px] text-zinc-500">
            Configuration ready
          </span>
        </div>
      </div>

      {/* Option groups */}
      <div className="relative space-y-7 p-5 sm:p-6">
        {optionGroups.map((group) => {
          const GroupIcon = group.icon;

          return (
            <div key={group.id}>
              {/* Group heading */}
              <div className="mb-3 flex items-start gap-3">
                <div
                  className="
                    mt-0.5
                    flex
                    h-7
                    w-7
                    shrink-0
                    items-center
                    justify-center
                    rounded-lg
                    bg-zinc-800/60
                  "
                >
                  <GroupIcon
                    className="h-3.5 w-3.5 text-zinc-500"
                    strokeWidth={1.7}
                    aria-hidden="true"
                  />
                </div>

                <div>
                  <p className="text-xs font-medium text-zinc-300">
                    {group.label}
                  </p>

                  <p className="mt-0.5 text-[10px] text-zinc-600">
                    {group.description}
                  </p>
                </div>
              </div>

              {/* Options */}
              <div
                className={`grid gap-2 ${
                  group.options.length === 2
                    ? "sm:grid-cols-2"
                    : "sm:grid-cols-3"
                }`}
              >
                {group.options.map((option) => {
                  const OptionIcon = option.icon;
                  const selected =
                    value[group.id] === option.id;

                  return (
                    <button
                      key={option.id}
                      type="button"
                      disabled={disabled}
                      onClick={() =>
                        onChange(group.id, option.id)
                      }
                      aria-pressed={selected}
                      className={`
                        group
                        relative
                        flex
                        min-h-[76px]
                        items-start
                        gap-3
                        rounded-xl
                        border
                        p-3
                        text-left
                        transition-all
                        duration-200
                        disabled:cursor-not-allowed
                        disabled:opacity-50

                        ${
                          selected
                            ? `
                              border-[#D4AF37]/35
                              bg-[#D4AF37]/[0.055]
                              shadow-[0_0_25px_rgba(212,175,55,0.035)]
                            `
                            : `
                              border-zinc-800
                              bg-[#0D0D0F]
                              hover:border-zinc-700
                              hover:bg-[#141416]
                            `
                        }
                      `}
                    >
                      {/* Selected indicator */}
                      <div
                        className={`
                          absolute
                          right-3
                          top-3
                          flex
                          h-4
                          w-4
                          items-center
                          justify-center
                          rounded-full
                          border
                          transition-all
                          duration-200

                          ${
                            selected
                              ? `
                                border-[#D4AF37]
                                bg-[#D4AF37]
                              `
                              : `
                                border-zinc-700
                                bg-transparent
                              `
                          }
                        `}
                      >
                        {selected && (
                          <Check
                            className="h-2.5 w-2.5 text-black"
                            strokeWidth={2.8}
                            aria-hidden="true"
                          />
                        )}
                      </div>

                      {/* Option icon */}
                      <div
                        className={`
                          flex
                          h-8
                          w-8
                          shrink-0
                          items-center
                          justify-center
                          rounded-lg
                          border
                          transition-colors
                          duration-200

                          ${
                            selected
                              ? `
                                border-[#D4AF37]/15
                                bg-[#D4AF37]/[0.08]
                              `
                              : `
                                border-zinc-800
                                bg-[#111113]
                              `
                          }
                        `}
                      >
                        <OptionIcon
                          className={`
                            h-3.5
                            w-3.5
                            ${
                              selected
                                ? "text-[#D4AF37]"
                                : "text-zinc-600"
                            }
                          `}
                          strokeWidth={1.7}
                          aria-hidden="true"
                        />
                      </div>

                      {/* Content */}
                      <div className="min-w-0 pr-5">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span
                            className={`
                              text-[11px]
                              font-medium
                              ${
                                selected
                                  ? "text-zinc-200"
                                  : "text-zinc-400"
                              }
                            `}
                          >
                            {option.label}
                          </span>

                          {option.badge && (
                            <span
                              className={`
                                rounded-full
                                px-1.5
                                py-0.5
                                text-[8px]
                                font-semibold
                                uppercase
                                tracking-[0.08em]

                                ${
                                  selected
                                    ? `
                                      bg-[#D4AF37]/10
                                      text-[#D4AF37]
                                    `
                                    : `
                                      bg-zinc-800
                                      text-zinc-600
                                    `
                                }
                              `}
                            >
                              {option.badge}
                            </span>
                          )}
                        </div>

                        <p className="mt-1 text-[10px] leading-4 text-zinc-600">
                          {option.description}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div
        className="
          relative
          border-t
          border-zinc-800/70
          bg-[#0D0D0F]/60
          px-5
          py-3.5
          sm:px-6
        "
      >
        <p className="text-[10px] leading-5 text-zinc-600">
          These preferences guide the initial architecture. You
          can refine the generated workspace later.
        </p>
      </div>
    </section>
  );
}