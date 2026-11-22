"use client";

import { useEffect, useRef, useState } from "react";
import { Check, GitBranch, X } from "lucide-react";

import { slugifyRepoName } from "@/lib/github/github";
import type { GeneratedProject } from "@/lib/project/project-schema";

interface GitHubPushButtonProps {
  project: GeneratedProject;
}

/**
 * "Push to GitHub" for the workspace top bar.
 *
 * Creates a repo under the user's own GitHub account and pushes the
 * project's files (contents API, one request per file). The repo
 * name defaults to the project name; a clash auto-suffixes -2/-3
 * server-side and the link shown is the repo that was actually made.
 * Not connected → the panel says so and links to Settings.
 */
export default function GitHubPushButton({ project }: GitHubPushButtonProps) {
  const [open, setOpen] = useState(false);
  const [repoName, setRepoName] = useState(() => slugifyRepoName(project.name));
  const [prevProjectName, setPrevProjectName] = useState(project.name);
  const [isPrivate, setIsPrivate] = useState(false);
  const [pushing, setPushing] = useState(false);
  const [repoUrl, setRepoUrl] = useState<string | null>(null);
  const [pushedCount, setPushedCount] = useState(0);
  const [failedCount, setFailedCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);

  // A new project resets the form. Adjusting state during render is
  // the documented pattern for deriving state from a changed prop.
  if (prevProjectName !== project.name) {
    setPrevProjectName(project.name);
    setRepoName(slugifyRepoName(project.name));
    setRepoUrl(null);
    setError(null);
  }

  useEffect(() => {
    if (!open) return;
    function onClickOutside(event: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [open ]);

  async function handlePush() {
    setPushing(true);
    setError(null);
    setRepoUrl(null);

    try {
      const response = await fetch("/api/github/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: repoName.trim() || slugifyRepoName(project.name),
          description: `Generated with ANVIX AI: ${project.name}`,
          private: isPrivate,
          files: project.files.map((file) => ({
            path: file.path,
            content: file.content,
          })),
        }),
      });
      const data = (await response.json()) as {
        repo?: string;
        repo_url?: string;
        pushed?: string[];
        failed?: Array<{ path: string; error: string }>;
        error?: string;
        message?: string;
      };

      if (!response.ok) {
        setError(data.message ?? "Push failed.");
        return;
      }

      setRepoUrl(data.repo_url ?? null);
      setPushedCount(data.pushed?.length ?? 0);
      setFailedCount(data.failed?.length ?? 0);
    } catch {
      setError("Could not reach the server. Try again.");
    } finally {
      setPushing(false);
    }
  }

  return (
    <div ref={panelRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        title="Push this project to GitHub"
        className="flex items-center gap-1.5 rounded-lg border border-zinc-800 bg-[#0B0B0D] px-3 py-2 text-[10px] font-medium text-zinc-400 transition hover:border-zinc-700 hover:text-zinc-200"
      >
        <GitBranch className="h-3 w-3" />
        <span className="hidden sm:inline">GitHub</span>
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-2 w-80 rounded-xl border border-zinc-800 bg-[#0D0D0F] p-4 text-left shadow-2xl">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-xs font-semibold text-zinc-100">
                Push to GitHub
              </p>
              <p className="mt-1 text-[10px] leading-4 text-zinc-500">
                Creates a repo under your GitHub account with these{" "}
                {project.files.length} files.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close GitHub panel"
              className="rounded p-1 text-zinc-600 transition hover:text-zinc-300"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>

          <label className="mt-4 block">
            <span className="text-[9px] uppercase tracking-[0.14em] text-zinc-600">
              Repo name
            </span>
            <input
              type="text"
              value={repoName}
              onChange={(event) => setRepoName(event.target.value)}
              maxLength={100}
              className="mt-1 w-full rounded-lg border border-zinc-800 bg-[#0B0B0D] px-2 py-1.5 font-mono text-[11px] text-zinc-200 outline-none"
            />
          </label>

          <label className="mt-3 flex items-center gap-2 text-[11px] text-zinc-400">
            <input
              type="checkbox"
              checked={isPrivate}
              onChange={(event) => setIsPrivate(event.target.checked)}
              className="accent-[#D4AF37]"
            />
            Private repo
          </label>

          <button
            type="button"
            onClick={() => void handlePush()}
            disabled={pushing || !repoName.trim()}
            className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-lg bg-[#D4AF37] px-3 py-2 text-[11px] font-semibold text-black transition hover:bg-[#E2C259] disabled:opacity-50"
          >
            <GitBranch className="h-3 w-3" />
            {pushing ? "Pushing files…" : "Push to GitHub"}
          </button>

          {error && (
            <p className="mt-3 text-[11px] leading-4 text-red-300">
              {error}{" "}
              {error.includes("Connect your GitHub") && (
                <a href="/settings" className="text-[#D4AF37] underline">
                  Open Settings
                </a>
              )}
            </p>
          )}

          {repoUrl && (
            <p className="mt-3 flex items-start gap-1.5 text-[11px] leading-4 text-emerald-400">
              <Check className="mt-0.5 h-3 w-3 shrink-0" />
              <span>
                Pushed {pushedCount} file{pushedCount === 1 ? "" : "s"}
                {failedCount > 0 && ` (${failedCount} failed)`} to{" "}
                <a
                  href={repoUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="underline"
                >
                  {repoUrl.replace("https://github.com/", "")}
                </a>
              </span>
            </p>
          )}
        </div>
      )}
    </div>
  );
}
