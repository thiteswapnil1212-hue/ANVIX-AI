"use client";

import {
  ArrowRight,
  Layers3,
  Sparkles,
  WandSparkles,
  Zap,
} from "lucide-react";

interface ExamplePrompt {
  title: string;
  description: string;
  prompt: string;
  icon: typeof WandSparkles;
  tag: string;
}

interface ExamplePromptsProps {
  onSelect: (prompt: string) => void;
  disabled?: boolean;
}

const examples: ExamplePrompt[] = [
  {
    title: "AI Recruiting",
    description:
      "Candidate scoring, analytics and intelligent hiring workflows.",
    prompt:
      "Build a premium AI recruiting platform with candidate profiles, intelligent candidate scoring, recruiter dashboards, analytics, authentication, search, filtering, and an AI assistant that helps recruiters evaluate candidates.",
    icon: WandSparkles,
    tag: "AI + Analytics",
  },
  {
    title: "Developer Workspace",
    description:
      "A complete workspace for shipping and managing internal tools.",
    prompt:
      "Create a developer workspace for shipping internal tools with authentication, project management, team collaboration, billing, analytics, deployment status, and a clean professional dark interface.",
    icon: Layers3,
    tag: "SaaS",
  },
  {
    title: "AI Research Cockpit",
    description:
      "Knowledge, notebooks and AI-powered research workflows.",
    prompt:
      "Design a private AI research cockpit with knowledge graphs, research documents, AI-powered summaries, shared notebooks, project organization, search, collaboration, and a premium dark interface.",
    icon: Zap,
    tag: "Research",
  },
];

export default function ExamplePrompts({
  onSelect,
  disabled = false,
}: ExamplePromptsProps) {
  return (
    <section
      aria-labelledby="example-prompts-title"
      className="relative"
    >
      {/* Header */}
      <div className="mb-4 flex items-end justify-between gap-4">
        <div>
          <p
            className="
              text-[10px]
              font-semibold
              uppercase
              tracking-[0.18em]
              text-[#D4AF37]
            "
          >
            Need inspiration?
          </p>

          <h2
            id="example-prompts-title"
            className="
              mt-1
              text-lg
              font-semibold
              tracking-tight
              text-white
            "
          >
            Start with a blueprint
          </h2>

          <p className="mt-1 text-xs text-zinc-600">
            Choose an example and customize it for your idea.
          </p>
        </div>

        <div
          className="
            hidden
            items-center
            gap-2
            rounded-full
            border
            border-zinc-800
            bg-[#0D0D0F]
            px-3
            py-1.5
            sm:flex
          "
        >
          <Sparkles
            className="h-3 w-3 text-[#D4AF37]"
            aria-hidden="true"
          />

          <span className="text-[10px] text-zinc-600">
            One click to use
          </span>
        </div>
      </div>

      {/* Cards */}
      <div className="grid gap-3 md:grid-cols-3">
        {examples.map((example) => {
          const Icon = example.icon;

          return (
            <button
              key={example.title}
              type="button"
              disabled={disabled}
              onClick={() => onSelect(example.prompt)}
              className="
                group
                relative
                overflow-hidden
                rounded-2xl
                border
                border-zinc-800
                bg-[#111113]
                p-5
                text-left
                transition-all
                duration-200
                hover:-translate-y-0.5
                hover:border-[#D4AF37]/25
                hover:bg-[#141416]
                hover:shadow-[0_15px_40px_rgba(0,0,0,0.18)]
                focus:outline-none
                focus:ring-2
                focus:ring-[#D4AF37]/30
                disabled:cursor-not-allowed
                disabled:opacity-50
              "
            >
              {/* Hover glow */}
              <div
                aria-hidden="true"
                className="
                  pointer-events-none
                  absolute
                  -right-16
                  -top-16
                  h-32
                  w-32
                  rounded-full
                  bg-[#D4AF37]/[0.05]
                  opacity-0
                  blur-[50px]
                  transition-opacity
                  duration-300
                  group-hover:opacity-100
                "
              />

              <div className="relative">
                {/* Top row */}
                <div className="flex items-center justify-between">
                  <div
                    className="
                      flex
                      h-10
                      w-10
                      items-center
                      justify-center
                      rounded-xl
                      border
                      border-[#D4AF37]/15
                      bg-[#D4AF37]/[0.06]
                      transition-all
                      duration-200
                      group-hover:border-[#D4AF37]/25
                      group-hover:bg-[#D4AF37]/[0.09]
                    "
                  >
                    <Icon
                      className="h-4.5 w-4.5 text-[#D4AF37]"
                      strokeWidth={1.7}
                      aria-hidden="true"
                    />
                  </div>

                  <ArrowRight
                    className="
                      h-4
                      w-4
                      text-zinc-700
                      transition-all
                      duration-200
                      group-hover:translate-x-0.5
                      group-hover:text-[#D4AF37]
                    "
                    aria-hidden="true"
                  />
                </div>

                {/* Tag */}
                <div className="mt-5">
                  <span
                    className="
                      inline-flex
                      rounded-full
                      border
                      border-zinc-800
                      bg-[#0D0D0F]
                      px-2
                      py-1
                      text-[9px]
                      font-medium
                      uppercase
                      tracking-[0.08em]
                      text-zinc-600
                    "
                  >
                    {example.tag}
                  </span>
                </div>

                {/* Content */}
                <h3 className="mt-3 text-sm font-semibold text-white">
                  {example.title}
                </h3>

                <p className="mt-1.5 min-h-[40px] text-xs leading-5 text-zinc-500">
                  {example.description}
                </p>

                {/* Action */}
                <div
                  className="
                    mt-5
                    flex
                    items-center
                    gap-1.5
                    text-[10px]
                    font-medium
                    text-zinc-600
                    transition-colors
                    duration-200
                    group-hover:text-[#D4AF37]
                  "
                >
                  Use this blueprint
                  <ArrowRight
                    className="h-3 w-3"
                    aria-hidden="true"
                  />
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}