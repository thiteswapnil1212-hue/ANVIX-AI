"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { GitBranch, Loader2 } from "lucide-react";

interface GitHubStatus {
  configured: boolean;
  connected: boolean;
  login: string | null;
}

interface RepoSummary {
  fullName: string;
  name: string;
  owner: string;
  isPrivate: boolean;
  htmlUrl: string;
  updatedAt: string;
}

function slugifyProjectName(name: string): string {
  return (
    name
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "project"
  );
}

/**
 * GitHub panel for Settings: connect / disconnect via the OAuth App
 * flow, and import a repo into the workspace (paste a URL, or pick
 * one of your own repos). Export lives on the workspace itself
 * ("Push to GitHub"); this panel is the connection + import home.
 */
export default function GitHubPanel() {
  const router = useRouter();
  // Read once on mount (no useSearchParams, so no Suspense boundary
  // is needed for the page that embeds this panel).
  const [githubParam] = useState<string | null>(() =>
    typeof window === "undefined"
      ? null
      : new URLSearchParams(window.location.search).get("github")
  );

  const [status, setStatus] = useState<GitHubStatus | null>(null);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [disconnecting, setDisconnecting] = useState(false);

  const [repoUrl, setRepoUrl] = useState("");
  const [importing, setImporting] = useState<string | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [imported, setImported] = useState<string | null>(null);

  const [repos, setRepos] = useState<RepoSummary[] | null>(null);
  const [loadingRepos, setLoadingRepos] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const response = await fetch("/api/github/status");
        const data = (await response.json()) as GitHubStatus;
        if (cancelled) return;
        setStatus(data);
        if (!data.connected) return;
        setLoadingRepos(true);
        try {
          const reposResponse = await fetch("/api/github/repos");
          const reposData =
            (await reposResponse.json()) as { repos?: RepoSummary[] };
          if (!cancelled) setRepos(reposData.repos ?? []);
        } catch {
          if (!cancelled) setRepos([]);
        } finally {
          if (!cancelled) setLoadingRepos(false);
        }
      } catch {
        if (!cancelled) setStatusError("Could not check the GitHub connection.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleDisconnect() {
    setDisconnecting(true);
    try {
      await fetch("/api/github/disconnect", { method: "POST" });
      setStatus((current) =>
        current ? { ...current, connected: false, login: null } : current
      );
      setRepos(null);
    } finally {
      setDisconnecting(false);
    }
  }

  async function handleImport(body: { repoUrl?: string; owner?: string; repo?: string }) {
    const label = body.repoUrl ?? `${body.owner}/${body.repo}`;
    setImporting(label);
    setImportError(null);
    setImported(null);

    try {
      const response = await fetch("/api/github/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = (await response.json()) as {
        owner?: string;
        repo?: string;
        files?: Array<{ path: string; content: string; language: string }>;
        message?: string;
      };
      if (!response.ok || !data.files) {
        setImportError(data.message ?? "Could not import that repo.");
        return;
      }
      const name = data.repo ?? "imported-repo";
      try {
        localStorage.setItem(
          "anvix.generatedProject",
          JSON.stringify({
            name,
            framework: "nextjs",
            files: data.files,
          })
        );
      } catch {
        setImportError("Browser storage is unavailable — the import cannot be opened.");
        return;
      }
      setImported(`${data.owner}/${name} (${data.files.length} files)`);
      router.push(`/workspace/${slugifyProjectName(name)}`);
    } catch {
      setImportError("Could not reach the server. Try again.");
    } finally {
      setImporting(null);
    }
  }

  return (
    <div className="rounded-2xl border border-white/[0.07] bg-[#111113] p-5 sm:p-6">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#D4AF37]/15 bg-[#D4AF37]/[0.07] text-[#D4AF37]">
          <GitBranch className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-white">GitHub</h3>
          <p className="mt-1 text-xs leading-5 text-zinc-400">
            Push generated apps to a repo under your own GitHub account,
            and import a repo back into the workspace to keep building on it.
          </p>
        </div>
      </div>

      {githubParam === "connected" && (
        <p className="mt-4 rounded-lg border border-emerald-900/60 bg-emerald-950/40 px-3 py-2 text-xs text-emerald-300">
          GitHub connected — you can now push from the workspace and import below.
        </p>
      )}
      {githubParam === "error" && (
        <p className="mt-4 rounded-lg border border-red-900/60 bg-red-950/40 px-3 py-2 text-xs text-red-300">
          GitHub connection failed. Try again — if it keeps failing, the OAuth App may not be set up on this deployment yet.
        </p>
      )}

      <div className="mt-4">
        {!status ? (
          <p className="text-xs text-zinc-500">
            {statusError ?? "Checking the GitHub connection…"}
          </p>
        ) : !status.configured ? (
          <p className="text-xs leading-5 text-zinc-400">
            GitHub export is not set up on this deployment yet — the owner needs to
            register a GitHub OAuth App and set GITHUB_OAUTH_CLIENT_ID and
            GITHUB_OAUTH_CLIENT_SECRET (see BUILD_LOG.md in the repo).
          </p>
        ) : status.connected ? (
          <div className="flex flex-wrap items-center gap-3">
            <p className="text-xs text-zinc-300">
              Connected as{" "}
              <span className="font-semibold text-white">{status.login ?? "GitHub user"}</span>
            </p>
            <button
              type="button"
              onClick={() => void handleDisconnect()}
              disabled={disconnecting}
              className="rounded-lg border border-zinc-800 px-3 py-1.5 text-[11px] font-medium text-zinc-300 transition hover:border-zinc-700 disabled:opacity-50"
            >
              {disconnecting ? "Disconnecting…" : "Disconnect"}
            </button>
          </div>
        ) : (
          <a
            href="/api/github/auth"
            className="inline-flex items-center gap-2 rounded-lg bg-[#D4AF37] px-4 py-2 text-xs font-semibold text-black transition hover:bg-[#E2C259]"
          >
            <GitBranch className="h-3.5 w-3.5" />
            Connect GitHub
          </a>
        )}
      </div>

      <div className="mt-6 border-t border-white/[0.06] pt-5">
        <h4 className="text-xs font-semibold text-zinc-200">
          Import a repo into the workspace
        </h4>
        <p className="mt-1 text-[11px] leading-5 text-zinc-500">
          Public repos import without connecting. Private repos need the connection
          above. Limited to 100 text files / 1 MB total — binaries are skipped.
        </p>

        <div className="mt-3 flex gap-2">
          <input
            type="text"
            value={repoUrl}
            onChange={(event) => setRepoUrl(event.target.value)}
            placeholder="github.com/owner/repo or owner/repo"
            className="min-w-0 flex-1 rounded-lg border border-zinc-800 bg-[#0B0B0D] px-3 py-2 text-xs text-zinc-200 outline-none placeholder:text-zinc-700"
          />
          <button
            type="button"
            onClick={() => void handleImport({ repoUrl: repoUrl.trim() })}
            disabled={!repoUrl.trim() || importing !== null}
            className="shrink-0 rounded-lg bg-[#D4AF37] px-4 py-2 text-[11px] font-semibold text-black transition hover:bg-[#E2C259] disabled:opacity-50"
          >
            {importing ? "Importing…" : "Import"}
          </button>
        </div>

        {importError && (
          <p className="mt-2 text-[11px] text-red-300">{importError}</p>
        )}
        {imported && (
          <p className="mt-2 text-[11px] text-emerald-400">
            Imported {imported} — opening in the workspace…
          </p>
        )}

        {status?.connected && (
          <div className="mt-4">
            <p className="text-[10px] uppercase tracking-[0.14em] text-zinc-600">
              Your repos
            </p>
            {loadingRepos ? (
              <p className="mt-2 flex items-center gap-2 text-xs text-zinc-500">
                <Loader2 className="h-3 w-3 animate-spin" />
                Loading repos…
              </p>
            ) : repos && repos.length > 0 ? (
              <ul className="mt-2 max-h-56 space-y-1.5 overflow-y-auto">
                {repos.map((repo) => (
                  <li
                    key={repo.fullName}
                    className="flex items-center justify-between gap-2 rounded-lg border border-zinc-800 bg-[#0B0B0D] px-3 py-2"
                  >
                    <span className="min-w-0 truncate text-xs text-zinc-300">
                      {repo.fullName}
                      {repo.isPrivate && (
                        <span className="ml-2 text-[10px] text-zinc-600">private</span>
                      )}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        void handleImport({ owner: repo.owner, repo: repo.name })
                      }
                      disabled={importing !== null}
                      className="shrink-0 rounded-md border border-zinc-800 px-2 py-1 text-[10px] font-medium text-zinc-300 transition hover:border-zinc-700 disabled:opacity-50"
                    >
                      {importing === `${repo.owner}/${repo.name}`
                        ? "Importing…"
                        : "Import"}
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-xs text-zinc-500">
                No repos found on your account yet.
              </p>
            )}
          </div>
        )}
      </div>

      <p className="mt-5 text-[10px] leading-4 text-zinc-600">
        ANVIX never stores your GitHub token — it lives in a browser cookie that
        only this app&apos;s GitHub routes can read, and you can disconnect any time.
        Pushed repos are created under your account, so the code is yours.
      </p>
    </div>
  );
}
