import type { GeneratedProject } from "./project-schema";

/**
 * Deterministic validation for AI-generated projects.
 *
 * This runs WITHOUT installing or executing anything: it catches the
 * mechanical mistakes models make most often (broken JSON, duplicate
 * paths, imports of files that were never generated) so the auto-fix
 * pass — or the user — gets a precise list instead of a vague failure.
 * It never claims the code is correct; it only proves it is not
 * mechanically broken in these specific ways.
 */

export interface ValidationIssue {
  severity: "error" | "warning";
  message: string;
}

const RESOLVABLE_EXTENSIONS = ["", ".ts", ".tsx", ".js", ".jsx", ".json"];

function isSafePath(path: string): boolean {
  if (!path || path.startsWith("/") || /^[A-Za-z]:/.test(path)) return false;
  return !path.split("/").includes("..");
}

function resolveRelativeImport(
  fromFile: string,
  importPath: string,
  filePaths: Set<string>
): boolean {
  const dir = fromFile.includes("/")
    ? fromFile.slice(0, fromFile.lastIndexOf("/"))
    : "";
  const base = dir ? `${dir}/${importPath}` : importPath;
  const normalized = base
    .split("/")
    .filter((part) => part !== ".")
    .join("/");

  for (const extension of RESOLVABLE_EXTENSIONS) {
    if (filePaths.has(`${normalized}${extension}`)) return true;
  }
  for (const extension of RESOLVABLE_EXTENSIONS) {
    if (filePaths.has(`${normalized}/index${extension}`)) return true;
  }
  return false;
}

export function validateGeneratedProjectFiles(
  project: GeneratedProject
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  if (!project.files || project.files.length === 0) {
    issues.push({ severity: "error", message: "The project has no files." });
    return issues;
  }

  const seen = new Set<string>();
  const filePaths = new Set<string>();

  for (const file of project.files) {
    if (typeof file.path !== "string" || !file.path.trim()) {
      issues.push({ severity: "error", message: "A file has no path." });
      continue;
    }
    if (!isSafePath(file.path)) {
      issues.push({
        severity: "error",
        message: `Unsafe file path: ${file.path}`,
      });
    }
    if (seen.has(file.path)) {
      issues.push({
        severity: "error",
        message: `Duplicate file path: ${file.path}`,
      });
    }
    seen.add(file.path);
    filePaths.add(file.path);

    if (typeof file.content !== "string") {
      issues.push({
        severity: "error",
        message: `File ${file.path} has no text content.`,
      });
      continue;
    }

    if (file.path.endsWith(".json")) {
      try {
        JSON.parse(file.content);
      } catch {
        issues.push({
          severity: "error",
          message: `File ${file.path} is not valid JSON.`,
        });
      }
    }
  }

  const packageJson = project.files.find(
    (file) => file.path === "package.json"
  );
  if (packageJson && typeof packageJson.content === "string") {
    try {
      const parsed = JSON.parse(packageJson.content) as Record<
        string,
        unknown
      >;
      if (typeof parsed.name !== "string" || !parsed.name.trim()) {
        issues.push({
          severity: "warning",
          message: "package.json has no name field.",
        });
      }
      if (
        !parsed.scripts ||
        typeof parsed.scripts !== "object" ||
        Object.keys(parsed.scripts).length === 0
      ) {
        issues.push({
          severity: "warning",
          message: "package.json has no scripts.",
        });
      }
    } catch {
      // Already reported as invalid JSON above.
    }
  }

  const importPattern =
    /(?:from\s+["'](\.{1,2}\/[^"']+)["']|import\(\s*["'](\.{1,2}\/[^"']+)["']\s*\))/g;

  for (const file of project.files) {
    if (typeof file.content !== "string") continue;
    if (!/\.(ts|tsx|js|jsx)$/.test(file.path)) continue;

    for (const match of file.content.matchAll(importPattern)) {
      const importPath = match[1] ?? match[2];
      if (!importPath) continue;
      if (!resolveRelativeImport(file.path, importPath, filePaths)) {
        issues.push({
          severity: "error",
          message: `File ${file.path} imports ${importPath}, which is not in the project.`,
        });
      }
    }
  }

  return issues;
}
