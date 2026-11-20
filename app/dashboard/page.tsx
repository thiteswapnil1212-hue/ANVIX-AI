"use client";

import ProductShell from "@/components/layout/ProductShell";
import PageHeader from "@/components/layout/PageHeader";
import IconRail from "@/components/agi/IconRail";
import ProjectCard from "@/components/dashboard/ProjectCard";
import { formatRelativeTime } from "@/components/agi/ApprovalsHistory";
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
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { fetchProjects, type CloudProject } from "@/lib/supabase/cloud";

const slugifyProjectName = (name: string) =>
  name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

type StoredProject = {
  name?: string;
  framework?: string;
  files?: Array<{
    path: string;
    content: string;
    language: string;
  }>;
};

type RecentChat = {
  id: string;
  title: string;
  updatedAt: string;
};

/** The 3 most recent AGI conversations, from the same local store the
 * chat drawer reads — no new data source. */
const readRecentChats = (): RecentChat[] => {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const raw = window.localStorage.getItem("anvix-guest-chats");

    if (!raw) {
      return [];
    }

    const parsed: unknown = JSON.parse(raw);

    if (!parsed || typeof parsed !== "object") {
      return [];
    }

    const record = parsed as Record<string, unknown>;

    if (!Array.isArray(record.conversations)) {
      return [];
    }

    return record.conversations
      .filter(
        (conversation): conversation is Record<string, unknown> =>
          !!conversation && typeof conversation === "object"
      )
      .map((conversation) => ({
        id:
          typeof conversation.id === "string"
            ? conversation.id
            : "",
        title:
          typeof conversation.title === "string" &&
          conversation.title.trim()
            ? conversation.title
            : "New chat",
        updatedAt:
          typeof conversation.updatedAt === "string"
            ? conversation.updatedAt
            : "",
      }))
      .filter((chat) => chat.id !== "")
      .sort(
        (a, b) =>
          new Date(b.updatedAt).getTime() -
          new Date(a.updatedAt).getTime()
      )
      .slice(0, 3);
  } catch {
    return [];
  }
};

export default function DashboardPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [project, setProject] = useState<StoredProject | null>(null);
  const [cloudProjects, setCloudProjects] = useState<CloudProject[]>([]);
  const [recentChats, setRecentChats] = useState<RecentChat[]>([]);

  // Open a chat in AGI: store the thread id, ChatLayout picks it up
  // once on mount and clears the key.
  const openChat = (id: string) => {
    try {
      window.localStorage.setItem("anvix-open-thread", id);
    } catch {
      // Storage unavailable — AGI opens on the last-active thread.
    }

    router.push("/agi");
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- browser storage is an external system that only exists after mount; lazy init would break hydration
    setRecentChats(readRecentChats());
  }, []);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    void (async () => {
      const projects = await fetchProjects(user.id);
      if (!cancelled && projects) {
        setCloudProjects(projects);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user]);

  const openCloudProject = (cloudProject: CloudProject) => {
    try {
      localStorage.setItem(
        "anvix.generatedProject",
        JSON.stringify({
          id: cloudProject.id,
          name: cloudProject.name,
          framework: cloudProject.framework,
          files: cloudProject.files,
          createdAt: cloudProject.createdAt,
          updatedAt: cloudProject.updatedAt,
        })
      );
    } catch {
      // Storage unavailable — the workspace will show its empty state.
    }
    router.push(`/workspace/${slugifyProjectName(cloudProject.name)}`);
  };

  useEffect(() => {
    try {
      const stored =
        localStorage.getItem("anvix.generatedProject") ??
        sessionStorage.getItem("anvix.generatedProject");

      if (!stored) return;

      const parsed = JSON.parse(stored);

      if (parsed && typeof parsed === "object") {
        // eslint-disable-next-line react-hooks/set-state-in-effect -- browser storage is an external system that only exists after mount; lazy init would break hydration
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
    <ProductShell
      rail={<IconRail active="projects" />}
      center={
        <>
          <PageHeader
            title="Projects"
            actions={
              <Link
                href="/agi"
                className="inline-flex items-center gap-2 rounded-full bg-action px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-action-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-action"
              >
                Open AGI
              </Link>
            }
          />

          <main className="mx-auto w-full max-w-7xl flex-1 overflow-y-auto px-4 py-6 sm:px-6">
            {/* Header */}
            <div className="mb-8 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-[#D4AF37]">
                  ANVIX / Projects
                </p>

                <h1 className="text-3xl font-semibold tracking-tight text-white">
                  Welcome back
                </h1>

                <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-400">
                  Build, iterate, and ship software with ANVIX AI.
                </p>
              </div>

              <Link
                href="/generate"
                className="inline-flex w-fit items-center gap-2 rounded-xl bg-action px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-action-hover"
              >
                <Plus className="h-4 w-4" />
                New project
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>

        {/* Start Building */}
        <section className="relative mb-6 overflow-hidden rounded-3xl border border-border bg-surface-1 p-6 sm:p-8">
          <div className="relative">
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-surface-2">
                  <Bot className="h-5 w-5 text-ink-muted" />
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
              className="group flex min-h-[88px] w-full items-center justify-between rounded-2xl border border-border bg-app-bg px-5 py-4 transition hover:border-white/15"
            >
              <div className="flex items-center gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-surface-2">
                  <Sparkles className="h-4 w-4 text-ink-muted" />
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

              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-action text-white transition group-hover:translate-x-0.5 group-hover:bg-action-hover">
                <ArrowRight className="h-4 w-4" />
              </div>
            </Link>
          </div>
        </section>

        {/* Main Grid */}
        <div className="grid gap-6 lg:grid-cols-[1.55fr_0.85fr]">
          {/* Recent Projects */}
          <section className="rounded-3xl border border-border bg-surface-1 p-6 backdrop-blur-xl">
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

              {(project || cloudProjects.length > 0) && (
                <span className="hidden rounded-full border border-zinc-800 bg-zinc-900 px-3 py-1 text-xs text-zinc-500 sm:inline-flex">
                  {cloudProjects.length > 0
                    ? `${cloudProjects.length} saved project${cloudProjects.length === 1 ? "" : "s"}`
                    : `${projectFileCount} files`}
                </span>
              )}
            </div>

            {project || cloudProjects.length > 0 ? (
              <div className="grid gap-4">
                {project && (
                  <>
                <ProjectCard
                  title={projectName}
                  description="AI-generated project in your ANVIX workspace."
                  updatedAt="Available in workspace"
                  href={`/workspace/${slugifyProjectName(projectName)}`}
                  accent="Active"
                />

                <Link
                  href={`/workspace/${slugifyProjectName(projectName)}`}
                  className="group flex items-center justify-between rounded-2xl border border-border bg-app-bg px-4 py-3 transition hover:border-white/15"
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

                  <ArrowRight className="h-4 w-4 text-zinc-600 transition group-hover:translate-x-1 group-hover:text-action" />
                </Link>
                  </>
                )}

                {cloudProjects.map((cloudProject) => (
                  <button
                    key={cloudProject.id}
                    type="button"
                    onClick={() => openCloudProject(cloudProject)}
                    className="group flex items-center justify-between rounded-2xl border border-border bg-app-bg px-4 py-3 text-left transition hover:border-white/15"
                  >
                    <div className="flex items-center gap-3">
                      <Code2 className="h-4 w-4 text-zinc-500" />
                      <div>
                        <p className="text-sm font-medium text-zinc-200">
                          {cloudProject.name}
                        </p>
                        <p className="mt-0.5 text-xs text-zinc-600">
                          {cloudProject.framework} · {cloudProject.files.length}{" "}
                          files · Saved to your account
                        </p>
                      </div>
                    </div>

                    <ArrowRight className="h-4 w-4 text-zinc-600 transition group-hover:translate-x-1 group-hover:text-action" />
                  </button>
                ))}
              </div>
            ) : (
              <div className="flex min-h-[250px] flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-app-bg px-6 text-center">
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
          <aside className="rounded-3xl border border-border bg-surface-1 p-6 backdrop-blur-xl">
            <div className="mb-6">
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-surface-2">
                <Zap className="h-5 w-5 text-ink-muted" />
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
                    className="group flex gap-3 rounded-2xl border border-transparent p-3 transition hover:border-border hover:bg-app-bg"
                  >
                    <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-border bg-surface-2">
                      <Icon className="h-3.5 w-3.5 text-zinc-400 transition group-hover:text-action" />
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

            <div className="mt-5 border-t border-border pt-5">
              <Link
                href="/agi"
                className="flex items-center justify-between text-xs font-medium text-zinc-400 transition hover:text-white"
              >
                <span className="flex items-center gap-2">
                  <Terminal className="h-3.5 w-3.5" />
                  Start an agent session
                </span>

                <ArrowRight className="h-3.5 w-3.5 text-action" />
              </Link>
            </div>
          </aside>
        </div>

        {/* Recent chats — the bridge to AGI */}
        <section className="mt-6 rounded-3xl border border-border bg-surface-1 p-6 backdrop-blur-xl">
          <div className="mb-6 flex items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <Bot className="h-4 w-4 text-zinc-400" />
                <h2 className="text-lg font-semibold text-white">
                  Recent chats
                </h2>
              </div>

              <p className="mt-2 text-sm text-zinc-500">
                Pick up where you left off with AGI.
              </p>
            </div>

            <Link
              href="/agi"
              className="hidden items-center gap-1.5 text-xs font-medium text-zinc-400 transition hover:text-white sm:inline-flex"
            >
              Open AGI
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          {recentChats.length > 0 ? (
            <div className="grid gap-3">
              {recentChats.map((chat) => (
                <button
                  key={chat.id}
                  type="button"
                  onClick={() => openChat(chat.id)}
                  className="group flex items-center justify-between gap-3 rounded-2xl border border-border bg-app-bg px-4 py-3 text-left transition hover:border-white/15"
                >
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium text-zinc-200">
                      {chat.title}
                    </span>
                    <span className="mt-0.5 block text-xs text-zinc-600">
                      {chat.updatedAt
                        ? formatRelativeTime(chat.updatedAt)
                        : ""}
                    </span>
                  </span>

                  <ArrowRight className="h-4 w-4 shrink-0 text-zinc-600 transition group-hover:translate-x-1 group-hover:text-action" />
                </button>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-start gap-3 rounded-2xl border border-dashed border-border bg-app-bg px-5 py-6">
              <p className="text-sm text-zinc-400">
                No chats yet — ask AGI something.
              </p>

              <Link
                href="/agi"
                className="inline-flex items-center gap-2 rounded-lg border border-border bg-surface-2 px-3.5 py-2 text-xs font-medium text-zinc-200 transition hover:border-white/15 hover:text-white"
              >
                Open AGI
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          )}
        </section>
          </main>
        </>
      }
    />
  );
}