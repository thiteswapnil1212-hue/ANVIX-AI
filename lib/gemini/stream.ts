import type { GeneratedProject, ProjectFile } from "@/lib/project/project-schema";
import { validateGeneratedProject } from "@/lib/project/project-schema";
import { parseGeminiJson, type GeminiModelFactory } from "./fallback";

/**
 * Streaming project generation.
 *
 * The classic /api/build waits for the whole model response (often a
 * minute of silence) and then returns one JSON blob. This streams the
 * same model output through an incremental JSON scanner: as soon as a
 * file object inside the "files" array is complete in the growing text,
 * it is parsed and handed to the caller — so the UI can show files
 * arriving one by one instead of a blank progress screen.
 *
 * Safety rules:
 * - The model chain is the same as the classic path (flash → flash-lite
 *   → 2.0-flash). A model that fails BEFORE any file is emitted falls
 *   through to the next model; after files are emitted, restarting
 *   would duplicate output, so the error is surfaced instead.
 * - The final text is still validated with the same
 *   validateGeneratedProject as the classic path. If the full parse
 *   fails, the stream fails — partial files are shown but never
 *   presented as a complete project.
 * - File objects are only emitted when their JSON is complete and
 *   parses, so a truncated stream can never emit a half file.
 */

export interface StreamCallbacks {
  onModel?: (model: string) => void;
  onFile?: (file: ProjectFile) => void;
}

const STREAM_MODELS = [
  "gemini-2.5-flash",
  "gemini-2.5-flash-lite",
  "gemini-2.0-flash",
];

const STREAM_TIMEOUT_MS = 180000;

interface ScanResult {
  files: ProjectFile[];
  nextIndex: number;
}

function isProjectFile(value: unknown): value is ProjectFile {
  if (!value || typeof value !== "object") return false;
  const file = value as Record<string, unknown>;
  return (
    typeof file.path === "string" &&
    file.path.length > 0 &&
    typeof file.content === "string" &&
    typeof file.language === "string"
  );
}

/**
 * Scan accumulated text for complete file objects inside the "files"
 * array. Returns every newly completed file plus the index to resume
 * scanning from (the tail may hold a partial object — it stays).
 */
function scanCompleteFiles(text: string, startIndex: number): ScanResult {
  const filesKey = text.indexOf('"files"');
  if (filesKey === -1) return { files: [], nextIndex: startIndex };

  const arrayStart = text.indexOf("[", filesKey);
  if (arrayStart === -1) return { files: [], nextIndex: startIndex };

  const files: ProjectFile[] = [];
  let index = Math.max(startIndex, arrayStart + 1);

  while (index < text.length) {
    const char = text[index];

    if (char === " " || char === "\n" || char === "\r" || char === "\t" || char === ",") {
      index += 1;
      continue;
    }

    if (char === "]") {
      return { files, nextIndex: text.length };
    }

    if (char !== "{") {
      return { files, nextIndex: index };
    }

    // String-aware brace scan for one complete object.
    let depth = 0;
    let inString = false;
    let escaped = false;
    let cursor = index;
    let complete = false;

    while (cursor < text.length) {
      const current = text[cursor];
      if (inString) {
        if (escaped) {
          escaped = false;
        } else if (current === "\\") {
          escaped = true;
        } else if (current === '"') {
          inString = false;
        }
      } else if (current === '"') {
        inString = true;
      } else if (current === "{") {
        depth += 1;
      } else if (current === "}") {
        depth -= 1;
        if (depth === 0) {
          complete = true;
          cursor += 1;
          break;
        }
      }
      cursor += 1;
    }

    if (!complete) {
      return { files, nextIndex: index };
    }

    try {
      const parsed = JSON.parse(text.slice(index, cursor)) as unknown;
      if (isProjectFile(parsed)) {
        files.push(parsed);
      }
    } catch {
      // A complete-looking object that does not parse is skipped; the
      // final full-project validation still decides success.
    }

    index = cursor;
  }

  return { files, nextIndex: index };
}

export async function streamProjectWithFallback(
  apiKey: string,
  prompt: string,
  modelFactory: GeminiModelFactory,
  callbacks: StreamCallbacks = {}
): Promise<GeneratedProject> {
  let lastError: unknown;

  for (const modelName of STREAM_MODELS) {
    callbacks.onModel?.(modelName);
    let emittedCount = 0;

    try {
      const model = modelFactory(apiKey, modelName);
      const controller = new AbortController();
      const timeoutId = setTimeout(
        () => controller.abort(),
        STREAM_TIMEOUT_MS
      );

      try {
        const result = await model.generateContentStream(prompt, {
          signal: controller.signal,
        } as never);

        let accumulated = "";
        let scanIndex = 0;
        const emittedPaths = new Set<string>();

        for await (const chunk of result.stream) {
          const text = chunk.text();
          if (text) {
            accumulated += text;
            const scanned = scanCompleteFiles(accumulated, scanIndex);
            scanIndex = scanned.nextIndex;
            for (const file of scanned.files) {
              if (emittedPaths.has(file.path)) continue;
              emittedPaths.add(file.path);
              emittedCount += 1;
              callbacks.onFile?.(file);
            }
          }
        }

        const project = validateGeneratedProject(parseGeminiJson(accumulated));

        // Emit anything the scanner missed (e.g. the last file, if the
        // stream ended exactly at its closing brace).
        for (const file of project.files) {
          if (!emittedPaths.has(file.path)) {
            emittedPaths.add(file.path);
            callbacks.onFile?.(file);
          }
        }

        return project;
      } finally {
        clearTimeout(timeoutId);
      }
    } catch (error) {
      lastError = error;
      console.warn("[ANVIX BUILD STREAM] Model failed", {
        model: modelName,
        emittedFiles: emittedCount,
        reason: error instanceof Error ? error.message : "unknown",
      });

      // Once files have been emitted, restarting with another model
      // would duplicate or contradict output — surface the failure so
      // the client keeps the partial list and offers a retry.
      if (emittedCount > 0) {
        throw error;
      }
    }
  }

  throw lastError ?? new Error("Gemini request failed");
}
