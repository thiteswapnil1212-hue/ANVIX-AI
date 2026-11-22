import test from "node:test";
import assert from "node:assert/strict";

import {
  checkExportCaps,
  checkImportCaps,
  isImportablePath,
  isSafeRepoPath,
  languageForPath,
  parseGitHubRepoUrl,
  slugifyRepoName,
  validateRepoName,
} from "./github.ts";

test("parseGitHubRepoUrl accepts URLs, bare hosts and owner/repo", () => {
  assert.deepEqual(parseGitHubRepoUrl("https://github.com/acme/my-app"), {
    owner: "acme",
    repo: "my-app",
  });
  assert.deepEqual(parseGitHubRepoUrl("https://github.com/acme/my-app.git"), {
    owner: "acme",
    repo: "my-app",
  });
  assert.deepEqual(parseGitHubRepoUrl("github.com/acme/my-app/"), {
    owner: "acme",
    repo: "my-app",
  });
  assert.deepEqual(parseGitHubRepoUrl("acme/my-app"), {
    owner: "acme",
    repo: "my-app",
  });
  assert.deepEqual(
    parseGitHubRepoUrl("https://github.com/acme/my-app?tab=readme"),
    { owner: "acme", repo: "my-app" }
  );
});

test("parseGitHubRepoUrl rejects non-repo references", () => {
  assert.equal(parseGitHubRepoUrl(""), null);
  assert.equal(parseGitHubRepoUrl("https://github.com/acme"), null);
  assert.equal(parseGitHubRepoUrl("https://github.com/acme/a/b"), null);
  assert.equal(parseGitHubRepoUrl("https://github.com/acme/a/tree/main"), null);
  assert.equal(parseGitHubRepoUrl("https://gitlab.com/acme/a"), null);
  assert.equal(parseGitHubRepoUrl("acme"), null);
  assert.equal(parseGitHubRepoUrl("../evil/repo"), null);
  assert.equal(parseGitHubRepoUrl("acme/repo with space"), null);
});

test("isSafeRepoPath rejects escapes and absolute paths", () => {
  assert.equal(isSafeRepoPath("app/page.tsx"), true);
  assert.equal(isSafeRepoPath("package.json"), true);
  assert.equal(isSafeRepoPath("../secret"), false);
  assert.equal(isSafeRepoPath("a/../../b"), false);
  assert.equal(isSafeRepoPath("/etc/passwd"), false);
  assert.equal(isSafeRepoPath("C:\\Windows\\x"), false);
  assert.equal(isSafeRepoPath("a//b"), false);
  assert.equal(isSafeRepoPath(""), false);
});

test("validateRepoName and slugifyRepoName", () => {
  assert.equal(validateRepoName("my-app_1.0"), null);
  assert.equal(validateRepoName(""), "Give the repo a name.");
  assert.equal(validateRepoName("-bad"), "Repo names use letters, numbers, dashes, dots and underscores, up to 100 characters.");
  assert.equal(validateRepoName("a".repeat(101)), "Repo names use letters, numbers, dashes, dots and underscores, up to 100 characters.");
  assert.equal(slugifyRepoName("My Cool App!"), "my-cool-app");
  assert.equal(slugifyRepoName("!!!"), "anvix-app");
});

test("isImportablePath skips binaries and keeps source", () => {
  assert.equal(isImportablePath("src/index.ts"), true);
  assert.equal(isImportablePath("README.md"), true);
  assert.equal(isImportablePath("package.json"), true);
  assert.equal(isImportablePath("logo.png"), false);
  assert.equal(isImportablePath("font.woff2"), false);
  assert.equal(isImportablePath("archive.zip"), false);
  assert.equal(isImportablePath("../escape.ts"), false);
});

test("checkImportCaps enforces count, size and total limits", () => {
  assert.equal(checkImportCaps([]), "No importable source files found in this repo.");
  assert.equal(
    checkImportCaps([{ path: "a.ts", size: 10 }]),
    null
  );
  assert.equal(
    checkImportCaps(
      Array.from({ length: 101 }, (_, i) => ({ path: `f${i}.ts`, size: 10 }))
    ),
    "This repo has 101 importable files — import is limited to 100 files."
  );
  assert.equal(
    checkImportCaps([{ path: "big.ts", size: 200_001 }]),
    "File big.ts is too large to import (over 200 KB)."
  );
  assert.equal(
    checkImportCaps(
      Array.from({ length: 6 }, (_, i) => ({ path: `f${i}.ts`, size: 180_000 }))
    ),
    "This repo is too large to import (over 1 MB of source files)."
  );
});

test("checkExportCaps enforces count, paths and total size", () => {
  assert.equal(checkExportCaps([]), "There are no files to push.");
  assert.equal(
    checkExportCaps([{ path: "a.ts", content: "x" }]),
    null
  );
  assert.equal(
    checkExportCaps([{ path: "../evil.ts", content: "x" }]),
    "Unsafe file path for export: ../evil.ts"
  );
  assert.equal(
    checkExportCaps([{ path: "a.ts", content: "x".repeat(1_000_001) }]),
    "This project is too large to push (over 1 MB of files)."
  );
});

test("languageForPath maps common extensions", () => {
  assert.equal(languageForPath("a.tsx"), "typescript");
  assert.equal(languageForPath("a.js"), "javascript");
  assert.equal(languageForPath("a.json"), "json");
  assert.equal(languageForPath("a.css"), "css");
  assert.equal(languageForPath("README.md"), "markdown");
  assert.equal(languageForPath("noext"), "text");
  assert.equal(languageForPath("a.weird"), "text");
});
