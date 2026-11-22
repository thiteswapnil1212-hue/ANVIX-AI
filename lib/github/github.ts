/**
 * GitHub export / import — pure helpers (no network, no secrets).
 *
 * Export pushes a generated app into a repo under the user's own
 * GitHub account via the contents API, one file per request.
 * Import reads a repo back through the git tree / contents APIs.
 * Both directions are capped: a generated app is at most a few
 * dozen files, and an arbitrary repo can be huge, binary, or hostile
 * — so import refuses anything over the caps instead of trying.
 */

export const MAX_EXPORT_FILES = 100;
export const MAX_EXPORT_TOTAL_BYTES = 1_000_000;
export const MAX_IMPORT_FILES = 100;
export const MAX_IMPORT_TOTAL_BYTES = 1_000_000;
export const MAX_IMPORT_FILE_BYTES = 200_000;

/** Extensions import skips: binary or generated, never source text. */
const IMPORT_BLOCKED_EXTENSIONS = new Set([
  ".png", ".jpg", ".jpeg", ".gif", ".webp", ".ico", ".bmp", ".avif",
  ".pdf", ".zip", ".tar", ".gz", ".7z", ".rar",
  ".mp3", ".mp4", ".mov", ".wav", ".webm",
  ".woff", ".woff2", ".ttf", ".eot", ".otf",
  ".exe", ".dll", ".so", ".dylib", ".bin", ".dat",
  ".DS_Store",
]);

const OWNER_PATTERN = /^[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?$/;
const REPO_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;
const REPO_NAME_PATTERN = /^[a-zA-Z0-9][a-zA-Z0-9._-]{0,99}$/;

/** A relative path with no escapes, no empties, no drive letters. */
export function isSafeRepoPath(path: string): boolean {
  if (!path || path.startsWith("/") || /^[A-Za-z]:/.test(path)) return false;
  if (path.includes("\\") || path.includes("\0")) return false;
  return !path
    .split("/")
    .some((part) => part === "" || part === "." || part === "..");
}

/**
 * Parse a GitHub repo reference: a full URL
 * (https://github.com/owner/repo, optional .git / trailing slash /
 * query), a bare github.com/owner/repo, or plain owner/repo.
 */
export function parseGitHubRepoUrl(
  input: string
): { owner: string; repo: string } | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  let rest = trimmed;
  const urlMatch = /^(?:https?:\/\/)?(?:www\.)?github\.com\//i.exec(trimmed);
  if (urlMatch) {
    rest = trimmed.slice(urlMatch[0].length);
  }

  // Anything after the repo (tree/..., issues, ?query, #hash) is not a repo.
  rest = rest.split(/[?#]/)[0].replace(/\/+$/, "");
  if (rest.endsWith(".git")) rest = rest.slice(0, -".git".length);

  const parts = rest.split("/");
  if (parts.length !== 2) return null;

  const [owner, repo] = parts;
  if (!OWNER_PATTERN.test(owner) || !REPO_PATTERN.test(repo)) return null;
  if (repo === "." || repo === "..") return null;
  return { owner, repo };
}

/** Plain-words error for a repo name, or null when it is acceptable. */
export function validateRepoName(name: unknown): string | null {
  if (typeof name !== "string" || !name.trim()) {
    return "Give the repo a name.";
  }
  if (!REPO_NAME_PATTERN.test(name.trim())) {
    return "Repo names use letters, numbers, dashes, dots and underscores, up to 100 characters.";
  }
  return null;
}

/** A project name turned into a valid repo name. */
export function slugifyRepoName(projectName: string): string {
  const slug = projectName
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 100);
  return slug || "anvix-app";
}

/** True when a tree entry is a text source file import may read. */
export function isImportablePath(path: string): boolean {
  if (!isSafeRepoPath(path)) return false;
  const lower = path.toLowerCase();
  const dotIndex = lower.lastIndexOf(".");
  if (dotIndex === -1) return true;
  const extension = lower.slice(dotIndex);
  if (IMPORT_BLOCKED_EXTENSIONS.has(extension)) return false;
  if (lower.endsWith(".ds_store")) return false;
  return true;
}

export interface ImportCandidate {
  path: string;
  size: number;
}

/**
 * Enforce the import caps on tree entries before any content is
 * fetched. Returns a plain-words error, or null when the selection
 * is within the caps.
 */
export function checkImportCaps(
  candidates: ImportCandidate[]
): string | null {
  const importable = candidates.filter((candidate) =>
    isImportablePath(candidate.path)
  );

  if (importable.length === 0) {
    return "No importable source files found in this repo.";
  }
  if (importable.length > MAX_IMPORT_FILES) {
    return `This repo has ${importable.length} importable files — import is limited to ${MAX_IMPORT_FILES} files.`;
  }
  const oversized = importable.find(
    (candidate) => candidate.size > MAX_IMPORT_FILE_BYTES
  );
  if (oversized) {
    return `File ${oversized.path} is too large to import (over ${MAX_IMPORT_FILE_BYTES / 1000} KB).`;
  }
  const total = importable.reduce((sum, candidate) => sum + candidate.size, 0);
  if (total > MAX_IMPORT_TOTAL_BYTES) {
    return "This repo is too large to import (over 1 MB of source files).";
  }
  return null;
}

/**
 * Enforce the export caps on the files about to be pushed.
 * Returns a plain-words error, or null when the selection is fine.
 */
export function checkExportCaps(
  files: Array<{ path: string; content: string }>
): string | null {
  if (files.length === 0) return "There are no files to push.";
  if (files.length > MAX_EXPORT_FILES) {
    return `This project has ${files.length} files — export is limited to ${MAX_EXPORT_FILES} files.`;
  }
  for (const file of files) {
    if (!isSafeRepoPath(file.path)) {
      return `Unsafe file path for export: ${file.path}`;
    }
  }
  const total = files.reduce(
    (sum, file) => sum + new TextEncoder().encode(file.content).length,
    0
  );
  if (total > MAX_EXPORT_TOTAL_BYTES) {
    return "This project is too large to push (over 1 MB of files).";
  }
  return null;
}

const LANGUAGE_BY_EXTENSION: Record<string, string> = {
  ts: "typescript",
  tsx: "typescript",
  mts: "typescript",
  cts: "typescript",
  js: "javascript",
  jsx: "javascript",
  mjs: "javascript",
  cjs: "javascript",
  json: "json",
  css: "css",
  md: "markdown",
  mdx: "markdown",
  html: "html",
  xml: "xml",
  yml: "yaml",
  yaml: "yaml",
  toml: "toml",
  txt: "text",
};

/** Best-effort language label for an imported file path. */
export function languageForPath(path: string): string {
  const dotIndex = path.lastIndexOf(".");
  if (dotIndex === -1) return "text";
  return LANGUAGE_BY_EXTENSION[path.slice(dotIndex + 1).toLowerCase()] ?? "text";
}
