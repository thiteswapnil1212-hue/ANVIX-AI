
"use client";

import { memo, useCallback } from "react";
import {
  ArrowRight,
  BrainCircuit,
  Layers3,
  Sparkles,
  WandSparkles,
  Check,
} from "lucide-react";

interface ExamplePrompt {
  id: string;
  title: string;
  description: string;
  prompt: string;
  icon: typeof WandSparkles;
  tag: string;
  accent: string;
}

interface ExamplePromptsProps {
  onSelect: (prompt: string) => void;
  disabled?: boolean;
}

const examples: ExamplePrompt[] = [
  {
    id: "recruiting",
    title: "AI Recruiting",
    description:
      "Build a hiring platform with candidate scoring, recruiter analytics, search, and AI-assisted evaluation.",
    prompt:
      "Build a production-style AI recruiting platform for modern hiring teams. Include recruiter authentication, candidate profiles, candidate search and filtering, job management, an applicant pipeline, AI-powered candidate scoring, recruiter dashboards, hiring analytics, and an AI assistant that helps recruiters evaluate candidates. Use a clean premium interface with responsive layouts, clear navigation, useful empty states, loading states, and realistic sample data.",
    icon: WandSparkles,
    tag: "AI + SaaS",
    accent: "from-amber-400/10",
  },
  {
    id: "developer-workspace",
    title: "Developer Workspace",
    description:
      "A complete workspace for teams to manage projects, deployments, analytics, and collaboration.",
    prompt:
      "Create a premium developer workspace for shipping and managing internal applications. Include authentication, a dashboard, project management, team members, activity history, deployment status, analytics, billing, notifications, and project settings. Add realistic sample data and useful states for empty projects, active deployments, failed deployments, and completed deployments. Use a professional dark interface with a fixed sidebar and responsive layouts.",
    icon: Layers3,
    tag: "SaaS",
    accent: "from-yellow-400/10",
  },
  {
    id: "research-hub",
    title: "AI Research Hub",
    description:
      "Organize research, documents, notes, and AI-powered insights in one workspace.",
    prompt:
      "Design an AI-powered research workspace for researchers and knowledge teams. Include projects, research documents, notes, searchable knowledge, document summaries, AI-generated insights, saved sources, tags, and collaboration features. Create a dashboard showing recent research activity and project progress. Use a premium dark interface with clear information hierarchy, realistic sample content, responsive layouts, and polished loading and empty states.",
    icon: BrainCircuit,
    tag: "AI + Research",
    accent: "from-orange-400/10",
  },
];

function ExamplePrompts({
  onSelect,
  disabled = false,
}: ExamplePromptsProps) {
  const handleSelect = useCallback(
    (prompt: string) => {
      if (disabled) return;
      onSelect(prompt);
    },
    [disabled, onSelect]
  );

  return (
    <section
      aria-labelledby="example-prompts-title"
      className="relative w-full"
    >
      {/* Section heading */}
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-lg border border-[#D4AF37]/20 bg-[#D4AF37]/[0.07]">
              <Sparkles
                className="h-3.5 w-3.5 text-[#D4AF37]"
                strokeWidth={1.8}
                aria-hidden="true"
              />
            </span>

            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#D4AF37]">
              Quick start
            </p>
          </div>

          <h2
            id="example-prompts-title"
            className="text-xl font-semibold tracking-tight text-white sm:text-2xl"
          >
            What are we building?
          </h2>

          <p className="mt-1.5 max-w-xl text-xs leading-5 text-zinc-500 sm:text-sm">
            Start with a blueprint. Customize it, then make it yours.
          </p>
        </div>

        <div className="inline-flex w-fit items-center gap-2 rounded-full border border-white/[0.07] bg-white/[0.025] px-3 py-1.5">
          <span className="relative flex h-1.5 w-1.5">
            <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400/40" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
          </span>
          <span className="text-[10px] text-zinc-500">
            {examples.length} starter blueprints
          </span>
        </div>
      </div>

      {/* Blueprint cards */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {examples.map((example, index) => {
          const Icon = example.icon;

          return (
            <button
              key={example.id}
              type="button"
              disabled={disabled}
              onClick={() => handleSelect(example.prompt)}
              aria-label={`Use ${example.title} prompt`}
              className="
                group/card relative flex min-w-0 flex-col
                overflow-hidden rounded-2xl border
                border-white/[0.08] bg-[#111113]
                p-4 text-left
                transition-all duration-200
                hover:-translate-y-0.5
                hover:border-[#D4AF37]/30
                hover:bg-[#151517]
                hover:shadow-[0_16px_40px_rgba(0,0,0,0.25)]
                focus-visible:outline-none
                focus-visible:ring-2
                focus-visible:ring-[#D4AF37]/60
                focus-visible:ring-offset-2
                focus-visible:ring-offset-[#0D0D0F]
                active:translate-y-0
                disabled:pointer-events-none
                disabled:opacity-50
                motion-reduce:transform-none
                motion-reduce:transition-none
                sm:p-5
              "
            >
              {/* Gold glow */}
              <div
                aria-hidden="true"
                className={`
                  pointer-events-none absolute -right-16 -top-20
                  h-44 w-44 rounded-full
                  bg-gradient-to-br ${example.accent}
                  to-transparent blur-3xl
                  opacity-40 transition-opacity duration-300
                  group-hover/card:opacity-100
                `}
              />

              {/* Top row */}
              <div className="relative flex w-full items-center justify-between">
                <div className="
                  flex h-11 w-11 items-center justify-center
                  rounded-xl border border-[#D4AF37]/15
                  bg-[#D4AF37]/[0.06]
                  transition-all duration-200
                  group-hover/card:border-[#D4AF37]/30
                  group-hover/card:bg-[#D4AF37]/[0.10]
                ">
                  <Icon
                    className="h-5 w-5 text-[#D4AF37] transition-transform duration-200 group-hover/card:scale-110"
                    strokeWidth={1.7}
                    aria-hidden="true"
                  />
                </div>

                <span className="
                  flex h-8 w-8 items-center justify-center
                  rounded-full border border-white/[0.07]
                  bg-[#0D0D0F] text-zinc-600
                  transition-all duration-200
                  group-hover/card:border-[#D4AF37]/25
                  group-hover/card:text-[#D4AF37]
                ">
                  <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover/card:translate-x-0.5" />
                </span>
              </div>

              {/* Category */}
              <div className="relative mt-5">
                <span className="
                  inline-flex items-center rounded-full
                  border border-white/[0.08]
                  bg-white/[0.025] px-2.5 py-1
                  text-[9px] font-semibold uppercase
                  tracking-[0.10em] text-zinc-500
                  transition-colors
                  group-hover/card:border-[#D4AF37]/20
                  group-hover/card:text-[#D4AF37]
                ">
                  {example.tag}
                </span>
              </div>

              {/* Copy */}
              <div className="relative mt-3 flex-1">
                <h3 className="text-sm font-semibold text-zinc-100 transition-colors group-hover/card:text-white sm:text-[15px]">
                  {example.title}
                </h3>

                <p className="mt-2 min-h-[60px] text-xs leading-5 text-zinc-500 sm:text-[13px]">
                  {example.description}
                </p>
              </div>

              {/* Footer */}
              <div className="
                relative mt-5 flex items-center
                justify-between border-t border-white/[0.06]
                pt-3
              ">
                <span className="text-[10px] font-medium text-zinc-500 transition-colors group-hover/card:text-[#D4AF37]">
                  Use blueprint
                </span>

                <span className="flex items-center gap-1 text-[10px] text-zinc-600">
                  <Sparkles className="h-3 w-3" />
                  Prompt {index + 1}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {disabled && (
        <p className="mt-3 text-xs text-zinc-500" role="status">
          Prompt selection is temporarily unavailable.
        </p>
      )}
    </section>
  );
}

export default memo(ExamplePrompts);