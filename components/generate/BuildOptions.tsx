"use client";

import {
  Check,
  ChevronRight,
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
    description: "Choose the type of product ANVIX should build.",
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
    description: "Choose the foundation for your application.",
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
    description: "Decide whether your app needs persistent data.",
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
    description: "Choose how users should access the app.",
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
    description: "Choose the intelligence your product needs.",
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
  const selectedCount = optionGroups.filter(
    (group) => Boolean(value[group.id])
  ).length;

  const getSelectedLabel = (
    group: OptionGroup
  ) => {
    return (
      group.options.find(
        (option) => option.id === value[group.id]
      )?.label ?? "Not selected"
    );
  };

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
        shadow-2xl
        shadow-black/10
      "
    >
      {/* Ambient background */}
      <div
        aria-hidden="true"
        className="
          pointer-events-none
          absolute
          -right-40
          -top-40
          h-80
          w-80
          rounded-full
          bg-[#D4AF37]/[0.045]
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
          h-64
          w-64
          rounded-full
          bg-[#D4AF37]/[0.02]
          blur-[100px]
        "
      />

      {/* Header */}
      <div
        className="
          relative
          border-b
          border-zinc-800/70
          px-5
          py-5
          sm:px-6
        "
      >
        <div
          className="
            flex
            flex-col
            gap-4
            sm:flex-row
            sm:items-center
            sm:justify-between
          "
        >
          <div className="flex items-start gap-3">
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
              <div className="flex items-center gap-2">
                <h2
                  id="build-options-title"
                  className="text-sm font-semibold text-white"
                >
                  Build configuration
                </h2>

                <span
                  className="
                    hidden
                    rounded-full
                    border
                    border-zinc-800
                    bg-[#0D0D0F]
                    px-2
                    py-0.5
                    text-[8px]
                    font-medium
                    uppercase
                    tracking-[0.1em]
                    text-zinc-600
                    sm:inline-flex
                  "
                >
                  Optional
                </span>
              </div>

              <p className="mt-1 text-xs leading-5 text-zinc-600">
                Set a few preferences before ANVIX starts your build.
              </p>
            </div>
          </div>

          {/* Status */}
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
                flex
                h-4
                w-4
                items-center
                justify-center
                rounded-full
                bg-emerald-500/10
              "
            >
              <Check
                className="h-2.5 w-2.5 text-emerald-400"
                strokeWidth={2.8}
                aria-hidden="true"
              />
            </span>

            <span className="text-[10px] text-zinc-500">
              {selectedCount}/{optionGroups.length} configured
            </span>
          </div>
        </div>

        {/* Selected summary */}
        <div
          className="
            mt-5
            grid
            gap-2
            sm:grid-cols-2
            lg:grid-cols-5
          "
        >
          {optionGroups.map((group) => (
            <div
              key={group.id}
              className="
                min-w-0
                rounded-xl
                border
                border-zinc-800/70
                bg-[#0D0D0F]/70
                px-3
                py-2.5
              "
            >
              <p
                className="
                  truncate
                  text-[9px]
                  font-medium
                  uppercase
                  tracking-[0.08em]
                  text-zinc-700
                "
              >
                {group.label}
              </p>

              <div className="mt-1 flex min-w-0 items-center gap-1.5">
                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#D4AF37]/70" />

                <p className="truncate text-[10px] font-medium text-zinc-400">
                  {getSelectedLabel(group)}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Option groups */}
      <div className="relative divide-y divide-zinc-800/50">
        {optionGroups.map((group) => {
          const GroupIcon = group.icon;

          return (
            <div
              key={group.id}
              className="px-5 py-5 sm:px-6"
            >
              {/* Group heading */}
              <div className="mb-3.5 flex items-start gap-3">
                <div
                  className="
                    flex
                    h-8
                    w-8
                    shrink-0
                    items-center
                    justify-center
                    rounded-lg
                    border
                    border-zinc-800
                    bg-[#0D0D0F]
                  "
                >
                  <GroupIcon
                    className="h-3.5 w-3.5 text-zinc-500"
                    strokeWidth={1.7}
                    aria-hidden="true"
                  />
                </div>

                <div className="min-w-0">
                  <p className="text-xs font-medium text-zinc-300">
                    {group.label}
                  </p>

                  <p className="mt-0.5 text-[10px] leading-4 text-zinc-600">
                    {group.description}
                  </p>
                </div>
              </div>

              {/* Options */}
              <div
                className={`
                  grid
                  gap-2
                  ${
                    group.options.length === 2
                      ? "sm:grid-cols-2"
                      : "sm:grid-cols-3"
                  }
                `}
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
                        min-h-[74px]
                        items-center
                        gap-3
                        rounded-xl
                        border
                        p-3
                        text-left
                        outline-none
                        transition-all
                        duration-200
                        disabled:cursor-not-allowed
                        disabled:opacity-50
                        focus-visible:ring-2
                        focus-visible:ring-[#D4AF37]/30
                        focus-visible:ring-offset-2
                        focus-visible:ring-offset-[#111113]

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
                      {/* Option icon */}
                      <div
                        className={`
                          flex
                          h-9
                          w-9
                          shrink-0
                          items-center
                          justify-center
                          rounded-lg
                          border
                          transition-all
                          duration-200

                          ${
                            selected
                              ? `
                                border-[#D4AF37]/20
                                bg-[#D4AF37]/[0.09]
                              `
                              : `
                                border-zinc-800
                                bg-[#111113]
                                group-hover:border-zinc-700
                              `
                          }
                        `}
                      >
                        <OptionIcon
                          className={`
                            h-3.5
                            w-3.5
                            transition-colors
                            duration-200
                            ${
                              selected
                                ? "text-[#D4AF37]"
                                : "text-zinc-600 group-hover:text-zinc-400"
                            }
                          `}
                          strokeWidth={1.7}
                          aria-hidden="true"
                        />
                      </div>

                      {/* Content */}
                      <div className="min-w-0 flex-1 pr-6">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span
                            className={`
                              text-[11px]
                              font-medium
                              transition-colors
                              ${
                                selected
                                  ? "text-zinc-200"
                                  : "text-zinc-400 group-hover:text-zinc-300"
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

                        <p className="mt-1 text-[10px] leading-4 text-zinc-600 transition-colors group-hover:text-zinc-500">
                          {option.description}
                        </p>
                      </div>

                      {/* Selection indicator */}
                      <div
                        className={`
                          absolute
                          right-3
                          top-1/2
                          flex
                          h-4
                          w-4
                          -translate-y-1/2
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
                                group-hover:border-zinc-600
                              `
                          }
                        `}
                        aria-hidden="true"
                      >
                        {selected && (
                          <Check
                            className="h-2.5 w-2.5 text-black"
                            strokeWidth={2.8}
                          />
                        )}
                      </div>

                      {/* Subtle hover arrow */}
                      {!selected && (
                        <ChevronRight
                          className="
                            absolute
                            bottom-2.5
                            right-3
                            h-2.5
                            w-2.5
                            text-zinc-800
                            opacity-0
                            transition-all
                            duration-200
                            group-hover:translate-x-0.5
                            group-hover:text-zinc-600
                            group-hover:opacity-100
                          "
                          aria-hidden="true"
                        />
                      )}
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
        <div className="flex items-start gap-2.5">
          <Sparkles
            className="mt-0.5 h-3 w-3 shrink-0 text-[#D4AF37]/60"
            aria-hidden="true"
          />

          <p className="text-[10px] leading-5 text-zinc-600">
            These preferences guide ANVIX&apos;s initial build.
            You&apos;ll be able to refine the generated application
            from the workspace later.
          </p>
        </div>
      </div>
    </section>
  );
}