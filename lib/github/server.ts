/**
 * GitHub API calls from server routes.
 *
 * Per-user token model: the user's own OAuth token is the only
 * credential ever used. It lives in an httpOnly cookie (never in
 * the database, never in a URL, never in localStorage) and is sent
 * to api.github.com only. The app holds no shared GitHub token.
 * No real GitHub OAuth app is registered by this code — the user
 * registers one and sets GITHUB_OAUTH_CLIENT_ID / SECRET (see
 * BUILD_LOG.md); without them the auth routes answer 503.
 */

import {
  checkImportCaps,
  isImportablePath,
  languageForPath,
  type ImportCandidate,
} from "./github.ts";

export const GITHUB_TOKEN_COOKIE = "anvix_github_token";
export const GITHUB_OAUTH_STATE_COOKIE = "anvix_github_oauth_state";
export const GITHUB_TOKEN_MAX_AGE_SECONDS = 90 * 24 * 60 * 60;

/** Read one cookie value from a Cookie header. */
export function readCookie(
  cookieHeader: string | null,
  name: string
): string | null {
  if (!cookieHeader) return null;
  for (const part of cookieHeader.split(";")) {
    const [key, ...rest] = part.trim().split("=");
    if (key === name) return decodeURIComponent(rest.join("=") ?? "");
  }
  return null;
}

export function getGitHubTokenFromRequest(req: Request): string | null {
  return readCookie(req.headers.get("cookie"), GITHUB_TOKEN_COOKIE);
}

interface GitHubErrorBody {
  message?: string;
  errors?: Array<{ message?: string; field?: string; code?: string }>;
}

async function githubApi(
  token: string | null,
  path: string,
  init: RequestInit = {}
): Promise<Response> {
  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "User-Agent": "ANVIX-AI",
    ...(init.headers as Record<string, string> | undefined),
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  return fetch(`https://api.github.com${path}`, { ...init, headers });
}

function githubErrorMessage(body: GitHubErrorBody, fallback: string): string {
  const detail = body.errors?.map((e) => e.message).filter(Boolean).join("; ");
  return body.message
    ? detail
      ? `${body.message} (${detail})`
      : body.message
    : fallback;
}

export interface CreatedRepo {
  owner: string;
  repo: string;
  fullName: string;
  htmlUrl: string;
}

/**
 * Create a repo under the user's account. On a name clash, retries
 * with -2 / -3 suffixes before giving up — the caller reports the
 * final name that was actually created.
 */
export async function createGitHubRepo(
  token: string,
  input: { name: string; description?: string; isPrivate: boolean }
): Promise<CreatedRepo> {
  let lastError = "Could not create the repo.";
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const name = attempt === 0 ? input.name : `${input.name}-${attempt + 1}`;
    const response = await githubApi(token, "/user/repos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        description: input.description ?? "",
        private: input.isPrivate,
        auto_init: false,
      }),
    });

    const body = (await response.json().catch(() => ({}))) as GitHubErrorBody & {
      full_name?: string;
      html_url?: string;
      owner?: { login?: string };
      name?: string;
    };

    if (response.ok && body.full_name && body.html_url) {
      return {
        owner: body.owner?.login ?? "",
        repo: body.name ?? name,
        fullName: body.full_name,
        htmlUrl: body.html_url,
      };
    }

    lastError = githubErrorMessage(body, lastError);
    const nameTaken =
      response.status === 422 &&
      /name already exists/i.test(`${body.message ?? ""} ${body.errors?.map((e) => e.message).join(" ") ?? ""}`);
    if (!nameTaken) throw new Error(lastError);
  }
  throw new Error(lastError);
}

export interface PushResult {
  pushed: string[];
  failed: Array<{ path: string; error: string }>;
}

/** Push files with the contents API, one request per file. */
export async function pushFilesToRepo(
  token: string,
  owner: string,
  repo: string,
  files: Array<{ path: string; content: string }>,
  message: string
): Promise<PushResult> {
  const pushed: string[] = [];
  const failed: Array<{ path: string; error: string }> = [];

  for (const file of files) {
    const content = Buffer.from(file.content, "utf-8").toString("base64");
    const encodedPath = file.path
      .split("/")
      .map((part) => encodeURIComponent(part))
      .join("/");

    const put = async (sha?: string) =>
      githubApi(token, `/repos/${owner}/${repo}/contents/${encodedPath}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message,
          content,
          ...(sha ? { sha } : {}),
        }),
      });

    try {
      let response = await put();

      if (response.status === 422) {
        // File already exists (e.g. re-push into the same repo):
        // fetch its sha and overwrite it.
        const existing = await githubApi(
          token,
          `/repos/${owner}/${repo}/contents/${encodedPath}`
        );
        const existingBody = (await existing
          .json()
          .catch(() => ({}))) as { sha?: string };
        if (existing.ok && existingBody.sha) {
          response = await put(existingBody.sha);
        }
      }

      if (response.ok) {
        pushed.push(file.path);
      } else {
        const body = (await response
          .json()
          .catch(() => ({}))) as GitHubErrorBody;
        failed.push({
          path: file.path,
          error: githubErrorMessage(body, `GitHub refused the file (${response.status}).`),
        });
      }
    } catch (error) {
      failed.push({
        path: file.path,
        error: error instanceof Error ? error.message : "Network error.",
      });
    }
  }

  return { pushed, failed };
}

export interface GitHubRepoSummary {
  fullName: string;
  name: string;
  owner: string;
  isPrivate: boolean;
  htmlUrl: string;
  updatedAt: string;
}

/** The user's own repos, most recently updated first. */
export async function listUserRepos(
  token: string
): Promise<GitHubRepoSummary[]> {
  const response = await githubApi(
    token,
    "/user/repos?per_page=100&sort=updated&affiliation=owner"
  );
  if (!response.ok) {
    const body = (await response
      .json()
      .catch(() => ({}))) as GitHubErrorBody;
    throw new Error(githubErrorMessage(body, "Could not list your repos."));
  }
  const repos = (await response.json()) as Array<{
    full_name: string;
    name: string;
    owner: { login: string };
    private: boolean;
    html_url: string;
    updated_at: string;
  }>;
  return repos.map((repo) => ({
    fullName: repo.full_name,
    name: repo.name,
    owner: repo.owner.login,
    isPrivate: repo.private,
    htmlUrl: repo.html_url,
    updatedAt: repo.updated_at,
  }));
}

export interface ImportedFile {
  path: string;
  content: string;
  language: string;
}

/**
 * Import a repo: read its tree, enforce the caps, then fetch the
 * importable text files. Works unauthenticated for public repos
 * (60 req/hour); a token lifts that to 5,000/hour and unlocks
 * private repos the user can see.
 */
export async function importGitHubRepo(
  token: string | null,
  owner: string,
  repo: string
): Promise<ImportedFile[]> {
  const treeResponse = await githubApi(
    token,
    `/repos/${owner}/${repo}/git/trees/HEAD?recursive=1`
  );
  if (!treeResponse.ok) {
    const body = (await treeResponse
      .json()
      .catch(() => ({}))) as GitHubErrorBody;
    throw new Error(
      treeResponse.status === 404
        ? "Repo not found — check the name, or connect GitHub to read a private repo."
        : githubErrorMessage(body, "Could not read the repo.")
    );
  }

  const tree = (await treeResponse.json()) as {
    tree?: Array<{ path: string; type: string; size?: number }>;
    truncated?: boolean;
  };
  if (tree.truncated) {
    throw new Error("This repo is too large to import (tree truncated).");
  }

  const candidates: ImportCandidate[] = (tree.tree ?? [])
    .filter((entry) => entry.type === "blob" && isImportablePath(entry.path))
    .map((entry) => ({ path: entry.path, size: entry.size ?? 0 }));

  const capsError = checkImportCaps(candidates);
  if (capsError) throw new Error(capsError);

  const files: ImportedFile[] = [];
  for (const candidate of candidates) {
    const encodedPath = candidate.path
      .split("/")
      .map((part) => encodeURIComponent(part))
      .join("/");
    const response = await githubApi(
      token,
      `/repos/${owner}/${repo}/contents/${encodedPath}`
    );
    if (!response.ok) continue;
    const body = (await response.json()) as {
      content?: string;
      encoding?: string;
    };
    if (body.encoding !== "base64" || typeof body.content !== "string") {
      continue;
    }
    const content = Buffer.from(body.content.replace(/\n/g, ""), "base64").toString("utf-8");
    files.push({
      path: candidate.path,
      content,
      language: languageForPath(candidate.path),
    });
  }

  if (files.length === 0) {
    throw new Error("No importable source files found in this repo.");
  }
  return files;
}

export type { ImportCandidate };
