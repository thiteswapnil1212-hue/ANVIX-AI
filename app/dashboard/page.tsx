"use client";

import AppShell from "@/components/layout/AppShell";
import ProjectCard from "@/components/dashboard/ProjectCard";
import {
  ArrowRight,
  Bot,
  Code2,
  FolderGit2,
  GitBranch,
  Layers3,
  Plus,
  Sparkles,
  Terminal,
  Zap,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

type StoredProject = {
  name?: string;
  framework?: string;
  files?: Array<{
    path: string;
    content: string;
    language: string;
  }>;
};

export default function DashboardPage() {
  const [project, setProject] = useState<StoredProject | null>(null);

  useEffect(() => {
    try {
      const stored = sessionStorage.getItem("anvix.generatedProject");

      if (!stored) return;

      const parsed = JSON.parse(stored);

      if (parsed && typeof parsed === "object") {
        setProject(parsed);
      }
    } catch {
      setProject(null);
    }
  }, []);

  const projectFileCount = project?.files?.length ?? 0;
  const projectName = project?.name || "Your project";
  const framework = project?.framework || "Next.js";

  return (
    <AppShell>
      <main className="mx-auto w-full max-w-7xl">
        {/* Header */}
        <div className="mb-8 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-zinc-800 bg-zinc-900/70 px-3 py-1.5 text-xs font-medium text-zinc-400">
              <Sparkles className="h-3.5 w-3.5 text-[#D4AF37]" />
              AI Software Engineering Workspace
            </div>

            <h1 className="text-3xl font-semibold tracking-tight text-white">
              Welcome back
            </h1>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-400">
              Build, iterate, and ship software with ANVIX AI.
            </p>
          </div>

          <Link
            href="/generate"
            className="inline-flex w-fit items-center gap-2 rounded-xl bg-[#D4AF37] px-4 py-2.5 text-sm font-semibold text-black transition hover:bg-[#E2C259]"
          >
            <Plus className="h-4 w-4" />
            New project
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        {/* Start Building */}
        <section className="relative mb-6 overflow-hidden rounded-3xl border border-zinc-800/80 bg-[#111111] p-6 sm:p-8">
          <div className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-[#D4AF37]/5 blur-3xl" />

          <div className="relative">
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl border border-zinc-800 bg-[#0D0D0D]">
                  <Bot className="h-5 w-5 text-[#D4AF37]" />
                </div>

                <h2 className="text-xl font-semibold text-white">
                  Start building
                </h2>

                <p className="mt-2 max-w-xl text-sm leading-6 text-zinc-400">
                  Describe what you want to build and let ANVIX understand,
                  plan, and create your project.
                </p>
              </div>
            </div>

            <Link
              href="/generate"
              className="group flex min-h-[88px] w-full items-center justify-between rounded-2xl border border-zinc-800 bg-[#0D0D0D] px-5 py-4 transition hover:border-zinc-700 hover:bg-[#101010]"
            >
              <div className="flex items-center gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-zinc-800 bg-zinc-900">
                  <Sparkles className="h-4 w-4 text-[#D4AF37]" />
                </div>

                <div>
                  <p className="text-sm font-medium text-white">
                    What do you want to build?
                  </p>
                  <p className="mt-1 text-xs text-zinc-500">
                    Start with a natural-language idea
                  </p>
                </div>
              </div>

              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#D4AF37] text-black transition group-hover:translate-x-0.5">
                <ArrowRight className="h-4 w-4" />
              </div>
            </Link>
          </div>
        </section>

        {/* Main Grid */}
        <div className="grid gap-6 lg:grid-cols-[1.55fr_0.85fr]">
          {/* Recent Projects */}
          <section className="rounded-3xl border border-zinc-800/80 bg-[#111111]/80 p-6 backdrop-blur-xl">
            <div className="mb-6 flex items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <FolderGit2 className="h-4 w-4 text-zinc-400" />
                  <h2 className="text-lg font-semibold text-white">
                    Recent projects
                  </h2>
                </div>

                <p className="mt-2 text-sm text-zinc-500">
                  Continue where you left off.
                </p>
              </div>

              {project && (
                <span className="hidden rounded-full border border-zinc-800 bg-zinc-900 px-3 py-1 text-xs text-zinc-500 sm:inline-flex">
                  {projectFileCount} files
                </span>
              )}
            </div>

            {project ? (
              <div className="grid gap-4">
                <ProjectCard
                  title={projectName}
                  description="AI-generated project in your ANVIX workspace."
                  updatedAt="Available in workspace"
                  href={`/workspace/${projectName
                    .toLowerCase()
                    .replace(/[^a-z0-9]+/g, "-")
                    .replace(/(^-|-$)/g, "")}`}
                  accent="Active"
                />

                <Link
                  href={`/workspace/${projectName
                    .toLowerCase()
                    .replace(/[^a-z0-9]+/g, "-")
                    .replace(/(^-|-$)/g, "")}`}
                  className="group flex items-center justify-between rounded-2xl border border-zinc-800/70 bg-[#0D0D0D] px-4 py-3 transition hover:border-zinc-700"
                >
                  <div className="flex items-center gap-3">
                    <Code2 className="h-4 w-4 text-zinc-500" />
                    <div>
                      <p className="text-sm font-medium text-zinc-200">
                        {projectName}
                      </p>
                      <p className="mt-0.5 text-xs text-zinc-600">
                        {framework} · {projectFileCount} files
                      </p>
                    </div>
                  </div>

                  <ArrowRight className="h-4 w-4 text-zinc-600 transition group-hover:translate-x-1 group-hover:text-[#D4AF37]" />
                </Link>
              </div>
            ) : (
              <div className="flex min-h-[250px] flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-800 bg-[#0D0D0D] px-6 text-center">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl border border-zinc-800 bg-zinc-900">
                  <FolderGit2 className="h-5 w-5 text-zinc-500" />
                </div>

                <h3 className="text-sm font-medium text-white">
                  No projects yet
                </h3>

                <p className="mt-2 max-w-sm text-xs leading-5 text-zinc-500">
                  Your generated projects will appear here once you start
                  building with ANVIX.
                </p>

                <Link
                  href="/generate"
                  className="mt-5 inline-flex items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-900 px-3.5 py-2 text-xs font-medium text-zinc-200 transition hover:border-zinc-700 hover:text-white"
                >
                  Create your first project
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            )}
          </section>

          {/* ANVIX Agent */}
          <aside className="rounded-3xl border border-zinc-800/80 bg-[#111111]/80 p-6 backdrop-blur-xl">
            <div className="mb-6">
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl border border-zinc-800 bg-[#0D0D0D]">
                <Zap className="h-5 w-5 text-[#D4AF37]" />
              </div>

              <h2 className="text-lg font-semibold text-white">
                ANVIX Agent
              </h2>

              <p className="mt-2 text-sm leading-6 text-zinc-500">
                Your AI engineering agent for understanding and working across
                your project.
              </p>
            </div>

            <div className="space-y-2">
              {[
                {
                  icon: Sparkles,
                  title: "Understand",
                  description: "Turn your idea into clear requirements.",
                },
                {
                  icon: Layers3,
                  title: "Plan",
                  description: "Break complex work into focused steps.",
                },
                {
                  icon: Code2,
                  title: "Build",
                  description: "Create and update project files.",
                },
                {
                  icon: GitBranch,
                  title: "Iterate",
                  description: "Inspect existing code and improve it.",
                },
              ].map((item) => {
                const Icon = item.icon;

                return (
                  <div
                    key={item.title}
                    className="group flex gap-3 rounded-2xl border border-transparent p-3 transition hover:border-zinc-800 hover:bg-[#0D0D0D]"
                  >
                    <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-zinc-800 bg-zinc-900">
                      <Icon className="h-3.5 w-3.5 text-zinc-400 transition group-hover:text-[#D4AF37]" />
                    </div>

                    <div>
                      <p className="text-sm font-medium text-zinc-200">
                        {item.title}
                      </p>
                      <p className="mt-1 text-xs leading-5 text-zinc-600">
                        {item.description}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-5 border-t border-zinc-800/70 pt-5">
              <Link
                href="/generate"
                className="flex items-center justify-between text-xs font-medium text-zinc-400 transition hover:text-white"
              >
                <span className="flex items-center gap-2">
                  <Terminal className="h-3.5 w-3.5" />
                  Start an agent session
                </span>

                <ArrowRight className="h-3.5 w-3.5 text-[#D4AF37]" />
              </Link>
            </div>
          </aside>
        </div>
      </main>
    </AppShell>
  );
}