"use client";

import { useParams } from "next/navigation";
import { useState } from "react";
import AppShell from "@/components/layout/AppShell";
import PanelCard from "@/components/common/PanelCard";
import {
  Activity,
  Bot,
  Check,
  CheckCircle2,
  Clipboard,
  Code2,
  FileCode2,
  FolderOpen,
  LayoutPanelTop,
  Loader2,
  MonitorPlay,
  MoreHorizontal,
  PanelRight,
  Play,
  Sparkles,
  Terminal,
  Zap,
} from "lucide-react";

const activity = [
  {
    title: "Planning the application architecture",
    description: "Analyzing structure and component dependencies",
    status: "complete",
  },
  {
    title: "Scaffolding the project shell",
    description: "Creating pages, components and shared modules",
    status: "complete",
  },
  {
    title: "Applying the premium UI system",
    description: "Tuning spacing, colors and interactions",
    status: "active",
  },
  {
    title: "Preparing preview and deployment assets",
    description: "Optimizing generated output for preview",
    status: "pending",
  },
] as const;

const files = [
  {
    label: "app/page.tsx",
    icon: LayoutPanelTop,
    type: "Page",
  },
  {
    label: "components/ui/button.tsx",
    icon: Code2,
    type: "Component",
  },
  {
    label: "lib/api/generate.ts",
    icon: Bot,
    type: "API",
  },
];

const modifications = [
  {
    title: "Add richer onboarding states",
    description:
      "Improve the first-use experience with clearer guidance and progress states.",
    priority: "Suggested",
  },
  {
    title: "Improve loading micro-interactions",
    description:
      "Use subtle feedback during generation and preview updates.",
    priority: "Recommended",
  },
  {
    title: "Tune dashboard metric cards",
    description:
      "Increase hierarchy and make usage trends easier to scan.",
    priority: "Suggested",
  },
];

const generatedCode = `export default function Workspace() {
  return (
    <div className="premium-shell">
      <Dashboard />
    </div>
  );
}`;

export default function WorkspacePage() {
  const params = useParams<{ projectId: string }>();

  const [selectedFile, setSelectedFile] =
    useState("app/page.tsx");

  const [copied, setCopied] = useState(false);

  const projectId =
    params.projectId ?? "project";

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(
        generatedCode
      );

      setCopied(true);

      setTimeout(() => {
        setCopied(false);
      }, 1600);
    } catch (error) {
      console.error(
        "Failed to copy generated code:",
        error
      );
    }
  };

  return (
    <AppShell
      title={`Workspace • ${projectId}`}
      description="Inspect generated code, monitor AI activity, and refine the live preview in one focused workspace."
    >
      <div className="space-y-6">
        {/* =================================
            WORKSPACE HEADER
        ================================= */}

        <div
          className="
            relative
            overflow-hidden
            rounded-3xl
            border
            border-zinc-800
            bg-[#111111]
            p-5
            shadow-[0_14px_40px_rgba(0,0,0,0.18)]
            sm:p-6
          "
        >
          <div
            className="
              pointer-events-none
              absolute
              -right-16
              -top-20
              h-56
              w-56
              rounded-full
              bg-[#D4AF37]/[0.045]
              blur-3xl
            "
          />

          <div className="relative z-10 flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <div
                  className="
                    flex
                    h-9
                    w-9
                    items-center
                    justify-center
                    rounded-xl
                    border
                    border-[#D4AF37]/15
                    bg-[#D4AF37]/[0.08]
                    text-[#D4AF37]
                  "
                >
                  <FolderOpen
                    className="h-4 w-4"
                    strokeWidth={1.8}
                  />
                </div>

                <div>
                  <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-zinc-600">
                    Workspace
                  </p>

                  <h2 className="mt-0.5 text-lg font-semibold text-white">
                    {projectId}
                  </h2>
                </div>
              </div>

              <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-500">
                Build, inspect and refine your AI-generated
                application from one workspace.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <span
                className="
                  inline-flex
                  items-center
                  gap-2
                  rounded-full
                  border
                  border-emerald-500/10
                  bg-emerald-500/[0.05]
                  px-3
                  py-1.5
                  text-xs
                  font-medium
                  text-emerald-400
                "
              >
                <span
                  className="
                    h-1.5
                    w-1.5
                    rounded-full
                    bg-emerald-400
                    shadow-[0_0_8px_rgba(52,211,153,0.65)]
                  "
                />
                AI Ready
              </span>

              <span
                className="
                  inline-flex
                  items-center
                  gap-2
                  rounded-full
                  border
                  border-zinc-800
                  bg-zinc-900/60
                  px-3
                  py-1.5
                  text-xs
                  text-zinc-500
                "
              >
                <Zap
                  className="h-3 w-3 text-[#D4AF37]"
                  strokeWidth={1.8}
                />
                3.2s generation
              </span>
            </div>
          </div>
        </div>

        {/* =================================
            MAIN WORKSPACE
        ================================= */}

        <div className="grid gap-6 xl:grid-cols-[0.8fr_1.35fr_0.95fr]">
          {/* =================================
              LEFT
          ================================= */}

          <div className="space-y-6">
            {/* FILES */}

            <PanelCard
              title="Files"
              description="Your scaffolded structure and editable modules."
              action={
                <button
                  type="button"
                  className="
                    rounded-lg
                    p-1.5
                    text-zinc-600
                    transition-colors
                    hover:bg-zinc-800
                    hover:text-zinc-300
                  "
                  aria-label="More file options"
                >
                  <MoreHorizontal className="h-4 w-4" />
                </button>
              }
              className="min-h-[280px]"
            >
              <div className="space-y-2">
                {files.map((file) => {
                  const Icon = file.icon;
                  const selected =
                    selectedFile === file.label;

                  return (
                    <button
                      key={file.label}
                      type="button"
                      onClick={() =>
                        setSelectedFile(file.label)
                      }
                      className={`
                        group
                        flex
                        w-full
                        items-center
                        justify-between
                        gap-3
                        rounded-2xl
                        border
                        px-3.5
                        py-3
                        text-left
                        transition-all
                        duration-200

                        ${
                          selected
                            ? `
                              border-[#D4AF37]/20
                              bg-[#D4AF37]/[0.055]
                            `
                            : `
                              border-zinc-800
                              bg-[#0D0D0D]
                              hover:border-zinc-700
                              hover:bg-[#101010]
                            `
                        }
                      `}
                    >
                      <div className="flex min-w-0 items-center gap-3">
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
                            transition-all
                            duration-200

                            ${
                              selected
                                ? `
                                  border-[#D4AF37]/15
                                  bg-[#D4AF37]/[0.09]
                                  text-[#D4AF37]
                                `
                                : `
                                  border-zinc-800
                                  bg-zinc-900/60
                                  text-zinc-600
                                `
                            }
                          `}
                        >
                          <Icon
                            className="h-3.5 w-3.5"
                            strokeWidth={1.8}
                          />
                        </div>

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
                            {file.label}
                          </p>

                          <p className="mt-0.5 text-[10px] text-zinc-600">
                            {file.type}
                          </p>
                        </div>
                      </div>

                      {selected && (
                        <span className="h-1.5 w-1.5 rounded-full bg-[#D4AF37] shadow-[0_0_8px_rgba(212,175,55,0.6)]" />
                      )}
                    </button>
                  );
                })}
              </div>

              <div className="mt-4 flex items-center gap-2 rounded-xl border border-dashed border-zinc-800 bg-zinc-900/20 px-3 py-2.5 text-xs text-zinc-600">
                <Terminal className="h-3.5 w-3.5" />
                <span>12 files generated</span>
              </div>
            </PanelCard>

            {/* ASSETS */}

            <PanelCard
              title="Assets"
              description="Core design and product assets ready for delivery."
            >
              <div className="grid grid-cols-2 gap-2">
                {[
                  "Brand system",
                  "Components",
                  "Illustrations",
                  "Motion presets",
                ].map((asset) => (
                  <div
                    key={asset}
                    className="
                      rounded-xl
                      border
                      border-zinc-800
                      bg-[#0D0D0D]
                      px-3
                      py-2.5
                      text-xs
                      text-zinc-400
                      transition-all
                      duration-200
                      hover:border-zinc-700
                      hover:text-zinc-300
                    "
                  >
                    {asset}
                  </div>
                ))}
              </div>
            </PanelCard>
          </div>

          {/* =================================
              CENTER
          ================================= */}

          <div className="space-y-6">
            {/* PROMPT + CODE */}

            <PanelCard
              title="Prompt & generated code"
              description="Review the AI-generated implementation and the latest adjustments."
            >
              <div className="space-y-4">
                {/* Prompt */}

                <div
                  className="
                    rounded-2xl
                    border
                    border-zinc-800
                    bg-[#0D0D0D]
                    p-4
                  "
                >
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#D4AF37]">
                      Prompt
                    </p>

                    <Sparkles
                      className="h-3.5 w-3.5 text-[#D4AF37]/50"
                      strokeWidth={1.8}
                    />
                  </div>

                  <p className="mt-3 text-sm leading-6 text-zinc-300">
                    Create a premium AI workspace with a
                    polished dashboard, intelligent chat,
                    and an elegant generation experience.
                  </p>
                </div>

                {/* Code */}

                <div
                  className="
                    overflow-hidden
                    rounded-2xl
                    border
                    border-zinc-800
                    bg-[#0B0B0B]
                  "
                >
                  <div
                    className="
                      flex
                      items-center
                      justify-between
                      border-b
                      border-zinc-800
                      px-4
                      py-3
                    "
                  >
                    <div className="flex items-center gap-2">
                      <FileCode2
                        className="h-4 w-4 text-[#D4AF37]"
                        strokeWidth={1.7}
                      />

                      <span className="text-xs font-medium text-zinc-400">
                        {selectedFile}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={handleCopy}
                      className="
                        flex
                        items-center
                        gap-1.5
                        rounded-lg
                        px-2
                        py-1.5
                        text-[10px]
                        text-zinc-600
                        transition-all
                        duration-200
                        hover:bg-zinc-800
                        hover:text-zinc-300
                      "
                    >
                      {copied ? (
                        <>
                          <Check className="h-3 w-3 text-emerald-400" />
                          Copied
                        </>
                      ) : (
                        <>
                          <Clipboard className="h-3 w-3" />
                          Copy
                        </>
                      )}
                    </button>
                  </div>

                  <pre
                    className="
                      overflow-x-auto
                      p-4
                      text-xs
                      leading-6
                      text-zinc-400
                    "
                  >
                    <code>{generatedCode}</code>
                  </pre>
                </div>
              </div>
            </PanelCard>

            {/* AI MODIFICATIONS */}

            <PanelCard
              title="AI modifications"
              description="Suggested refinement steps and next actions."
            >
              <div className="space-y-3">
                {modifications.map(
                  (modification, index) => (
                    <div
                      key={modification.title}
                      className="
                        group
                        rounded-2xl
                        border
                        border-zinc-800
                        bg-[#0D0D0D]
                        p-4
                        transition-all
                        duration-200
                        hover:-translate-y-0.5
                        hover:border-[#D4AF37]/15
                        hover:bg-[#101010]
                      "
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className="
                            flex
                            h-8
                            w-8
                            shrink-0
                            items-center
                            justify-center
                            rounded-lg
                            bg-[#D4AF37]/[0.07]
                            text-[#D4AF37]
                          "
                        >
                          <span className="text-[10px] font-semibold">
                            {String(index + 1).padStart(
                              2,
                              "0"
                            )}
                          </span>
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-sm font-medium text-zinc-200">
                              {modification.title}
                            </p>

                            <span
                              className="
                                rounded-full
                                border
                                border-zinc-800
                                px-2
                                py-0.5
                                text-[9px]
                                text-zinc-600
                              "
                            >
                              {modification.priority}
                            </span>
                          </div>

                          <p className="mt-1 text-xs leading-5 text-zinc-600">
                            {modification.description}
                          </p>
                        </div>

                        <button
                          type="button"
                          className="
                            rounded-lg
                            p-1.5
                            text-zinc-700
                            transition-colors
                            hover:bg-zinc-800
                            hover:text-[#D4AF37]
                          "
                          aria-label={`Apply ${modification.title}`}
                        >
                          <ArrowRightIcon />
                        </button>
                      </div>
                    </div>
                  )
                )}
              </div>
            </PanelCard>
          </div>

          {/* =================================
              RIGHT
          ================================= */}

          <div className="space-y-6">
            {/* LIVE PREVIEW */}

            <PanelCard
              title="Live preview"
              description="See the current state of your generated experience."
              action={
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    className="rounded-lg p-1.5 text-zinc-600 transition-colors hover:bg-zinc-800 hover:text-zinc-300"
                    aria-label="Preview settings"
                  >
                    <PanelRight className="h-4 w-4" />
                  </button>

                  <button
                    type="button"
                    className="rounded-lg p-1.5 text-zinc-600 transition-colors hover:bg-zinc-800 hover:text-zinc-300"
                    aria-label="Open preview"
                  >
                    <MonitorPlay className="h-4 w-4" />
                  </button>
                </div>
              }
            >
              <div
                className="
                  overflow-hidden
                  rounded-2xl
                  border
                  border-zinc-800
                  bg-[#090909]
                "
              >
                {/* Browser bar */}

                <div
                  className="
                    flex
                    items-center
                    gap-2
                    border-b
                    border-zinc-800
                    bg-[#111111]
                    px-3
                    py-2.5
                  "
                >
                  <span className="h-2 w-2 rounded-full bg-zinc-700" />
                  <span className="h-2 w-2 rounded-full bg-zinc-700" />
                  <span className="h-2 w-2 rounded-full bg-zinc-700" />

                  <div className="ml-2 min-w-0 flex-1 truncate rounded-md bg-zinc-900 px-2 py-1 text-[9px] text-zinc-600">
                    preview.anvix.ai
                  </div>
                </div>

                {/* Preview */}

                <div
                  className="
                    relative
                    flex
                    min-h-[245px]
                    items-center
                    justify-center
                    overflow-hidden
                    bg-[radial-gradient(circle_at_center,rgba(212,175,55,0.05),transparent_50%)]
                    p-5
                  "
                >
                  <div
                    className="
                      absolute
                      h-32
                      w-32
                      rounded-full
                      bg-[#D4AF37]/[0.05]
                      blur-3xl
                    "
                  />

                  <div className="relative text-center">
                    <div
                      className="
                        mx-auto
                        flex
                        h-16
                        w-16
                        items-center
                        justify-center
                        rounded-2xl
                        border
                        border-[#D4AF37]/15
                        bg-[#D4AF37]/[0.07]
                        text-[#D4AF37]
                        shadow-[0_0_30px_rgba(212,175,55,0.07)]
                      "
                    >
                      <Sparkles
                        className="h-7 w-7"
                        strokeWidth={1.5}
                      />
                    </div>

                    <p className="mt-4 text-sm font-medium text-zinc-300">
                      Preview ready
                    </p>

                    <p className="mt-1 text-xs text-zinc-600">
                      Your generated app is ready to inspect.
                    </p>

                    <button
                      type="button"
                      className="
                        mt-4
                        inline-flex
                        items-center
                        gap-2
                        rounded-lg
                        bg-[#D4AF37]
                        px-3
                        py-2
                        text-xs
                        font-semibold
                        text-black
                        transition-all
                        duration-200
                        hover:scale-[1.02]
                        hover:bg-[#E0BB4C]
                        active:scale-95
                      "
                    >
                      <Play
                        className="h-3 w-3 fill-current"
                        strokeWidth={1.8}
                      />
                      Run preview
                    </button>
                  </div>
                </div>
              </div>
            </PanelCard>

            {/* ACTIVITY */}

            <PanelCard
              title="AI activity timeline"
              description="Execution progress and generation checkpoints."
              action={
                <Activity
                  className="h-4 w-4 text-[#D4AF37]"
                  strokeWidth={1.8}
                />
              }
            >
              <div className="relative space-y-1">
                {/* Timeline line */}

                <div
                  className="
                    absolute
                    left-[7px]
                    top-3
                    bottom-3
                    w-px
                    bg-zinc-800
                  "
                />

                {activity.map((item, index) => {
                  const active =
                    item.status === "active";

                  const complete =
                    item.status === "complete";

                  return (
                    <div
                      key={item.title}
                      className="
                        relative
                        flex
                        gap-3
                        rounded-xl
                        p-2
                        transition-colors
                        duration-200
                        hover:bg-zinc-900/40
                      "
                    >
                      <div
                        className={`
                          relative
                          z-10
                          mt-1
                          flex
                          h-3.5
                          w-3.5
                          shrink-0
                          items-center
                          justify-center
                          rounded-full
                          border

                          ${
                            complete
                              ? `
                                border-[#D4AF37]/30
                                bg-[#D4AF37]/15
                                text-[#D4AF37]
                              `
                              : active
                                ? `
                                  border-[#D4AF37]/40
                                  bg-[#D4AF37]/10
                                  text-[#D4AF37]
                                `
                                : `
                                  border-zinc-700
                                  bg-[#111111]
                                  text-zinc-700
                                `
                          }
                        `}
                      >
                        {complete ? (
                          <CheckCircle2 className="h-2.5 w-2.5" />
                        ) : active ? (
                          <Loader2 className="h-2.5 w-2.5 animate-spin" />
                        ) : (
                          <span className="h-1 w-1 rounded-full bg-zinc-700" />
                        )}
                      </div>

                      <div className="min-w-0 pb-2">
                        <p
                          className={`
                            text-xs
                            font-medium

                            ${
                              active
                                ? "text-zinc-200"
                                : complete
                                  ? "text-zinc-400"
                                  : "text-zinc-600"
                            }
                          `}
                        >
                          {item.title}
                        </p>

                        <p className="mt-1 text-[10px] leading-4 text-zinc-700">
                          {item.description}
                        </p>

                        <p
                          className={`
                            mt-1.5
                            text-[9px]
                            uppercase
                            tracking-[0.08em]

                            ${
                              active
                                ? "text-[#D4AF37]"
                                : "text-zinc-700"
                            }
                          `}
                        >
                          {complete
                            ? "Completed"
                            : active
                              ? "In progress"
                              : `Step ${index + 1}`}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </PanelCard>
          </div>
        </div>
      </div>
    </AppShell>
  );
}

/*
 * Small local icon wrapper.
 * Keeps the modification card clean without
 * adding another dependency.
 */

function ArrowRightIcon() {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      className="h-3.5 w-3.5"
      aria-hidden="true"
    >
      <path
        d="M4 10h11M10 5l5 5-5 5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}