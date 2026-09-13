"use client";

import {
  ArrowRight,
  BrainCircuit,
  Layers3,
  Sparkles,
  WandSparkles,
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
      "Build a hiring platform with candidate scoring, recruiter analytics, search, and AI-assisted evaluation.",
    prompt:
      "Build a production-style AI recruiting platform for modern hiring teams. Include recruiter authentication, candidate profiles, candidate search and filtering, job management, an applicant pipeline, AI-powered candidate scoring, recruiter dashboards, hiring analytics, and an AI assistant that helps recruiters evaluate candidates. Use a clean premium interface with responsive layouts, clear navigation, useful empty states, loading states, and realistic sample data.",
    icon: WandSparkles,
    tag: "AI + SaaS",
  },
  {
    title: "Developer Workspace",
    description:
      "A complete workspace for teams to manage projects, deployments, analytics, and collaboration.",
    prompt:
      "Create a premium developer workspace for shipping and managing internal applications. Include authentication, a dashboard, project management, team members, activity history, deployment status, analytics, billing, notifications, and project settings. Add realistic sample data and useful states for empty projects, active deployments, failed deployments, and completed deployments. Use a professional dark interface with a fixed sidebar and responsive layouts.",
    icon: Layers3,
    tag: "SaaS",
  },
  {
    title: "AI Research Hub",
    description:
      "Organize research, documents, notes, and AI-powered insights in one workspace.",
    prompt:
      "Design an AI-powered research workspace for researchers and knowledge teams. Include projects, research documents, notes, searchable knowledge, document summaries, AI-generated insights, saved sources, tags, and collaboration features. Create a dashboard showing recent research activity and project progress. Use a premium dark interface with clear information hierarchy, realistic sample content, responsive layouts, and polished loading and empty states.",
    icon: BrainCircuit,
    tag: "AI + Research",
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
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Sparkles
              className="h-3.5 w-3.5 text-[#D4AF37]"
              strokeWidth={1.8}
              aria-hidden="true"
            />

            <p
              className="
                text-[10px]
                font-semibold
                uppercase
                tracking-[0.18em]
                text-[#D4AF37]
              "
            >
              Quick start
            </p>
          </div>

          <h2
            id="example-prompts-title"
            className="
              mt-1.5
              text-lg
              font-semibold
              tracking-tight
              text-white
            "
          >
            Start with an example
          </h2>

          <p className="mt-1 text-xs leading-5 text-zinc-600">
            Pick a blueprint, then customize the prompt for your
            application.
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
            sm:inline-flex
          "
        >
          <span className="h-1.5 w-1.5 rounded-full bg-[#D4AF37]/70" />

          <span className="text-[10px] text-zinc-600">
            Ready-to-use prompts
          </span>
        </div>
      </div>

      {/* Example cards */}
      <div className="grid gap-3 md:grid-cols-3">
        {examples.map((example) => {
          const Icon = example.icon;

          return (
            <button
              key={example.title}
              type="button"
              disabled={disabled}
              onClick={() => onSelect(example.prompt)}
              aria-label={`Use ${example.title} example`}
              className="
                group
                relative
                min-w-0
                overflow-hidden
                rounded-2xl
                border
                border-zinc-800
                bg-[#111113]
                p-5
                text-left
                outline-none
                transition-all
                duration-200
                hover:-translate-y-0.5
                hover:border-[#D4AF37]/25
                hover:bg-[#141416]
                hover:shadow-[0_18px_45px_rgba(0,0,0,0.2)]
                focus-visible:ring-2
                focus-visible:ring-[#D4AF37]/35
                focus-visible:ring-offset-2
                focus-visible:ring-offset-[#0D0D0F]
                active:translate-y-0
                disabled:cursor-not-allowed
                disabled:opacity-50
              "
            >
              {/* Background glow */}
              <div
                aria-hidden="true"
                className="
                  pointer-events-none
                  absolute
                  -right-20
                  -top-20
                  h-40
                  w-40
                  rounded-full
                  bg-[#D4AF37]/[0.055]
                  opacity-0
                  blur-[55px]
                  transition-opacity
                  duration-300
                  group-hover:opacity-100
                "
              />

              <div className="relative">
                {/* Card top */}
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
                      className="
                        h-4.5
                        w-4.5
                        text-[#D4AF37]
                        transition-transform
                        duration-200
                        group-hover:scale-105
                      "
                      strokeWidth={1.7}
                      aria-hidden="true"
                    />
                  </div>

                  <div
                    className="
                      flex
                      h-7
                      w-7
                      items-center
                      justify-center
                      rounded-full
                      border
                      border-zinc-800
                      bg-[#0D0D0F]
                      transition-all
                      duration-200
                      group-hover:border-[#D4AF37]/20
                    "
                  >
                    <ArrowRight
                      className="
                        h-3.5
                        w-3.5
                        text-zinc-700
                        transition-all
                        duration-200
                        group-hover:translate-x-0.5
                        group-hover:text-[#D4AF37]
                      "
                      aria-hidden="true"
                    />
                  </div>
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
                      transition-colors
                      duration-200
                      group-hover:border-zinc-700
                      group-hover:text-zinc-500
                    "
                  >
                    {example.tag}
                  </span>
                </div>

                {/* Title */}
                <h3
                  className="
                    mt-3
                    text-sm
                    font-semibold
                    text-white
                  "
                >
                  {example.title}
                </h3>

                {/* Description */}
                <p
                  className="
                    mt-1.5
                    min-h-[60px]
                    text-xs
                    leading-5
                    text-zinc-500
                  "
                >
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
                  Use example

                  <ArrowRight
                    className="
                      h-3 w-3
                      transition-transform
                      duration-200
                      group-hover:translate-x-0.5
                    "
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