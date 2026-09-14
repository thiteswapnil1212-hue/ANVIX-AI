"use client";

import {
  CheckCircle2,
  Code2,
  Copy,
  ExternalLink,
  FileCode2,
  Maximize2,
  Monitor,
  Play,
  RefreshCw,
  Smartphone,
  Sparkles,
  Tablet,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import type { ProjectFile } from "@/lib/project/project-schema";

interface CodePreviewProps {
  file?: ProjectFile | null;
  view?: "code" | "preview";
  isDirty?: boolean;
  onContentChange?: (content: string) => void;
  onSave?: () => void;
  onReset?: () => void;
}

const binaryExtensions = new Set([
  "png",
  "jpg",
  "jpeg",
  "webp",
  "gif",
  "ico",
]);

function getLanguage(file?: ProjectFile | null) {
  if (!file) return "Text";

  const language = file.language.trim();

  if (language) return language;

  if (file.path.endsWith(".tsx")) return "TypeScript React";
  if (file.path.endsWith(".ts")) return "TypeScript";
  if (file.path.endsWith(".css")) return "CSS";
  if (file.path.endsWith(".json")) return "JSON";
  if (file.path.endsWith(".md")) return "Markdown";
  return "Text";
}

function isBinaryFile(file?: ProjectFile | null) {
  if (!file) return false;

  const extension =
    file.path.split(".").pop()?.toLowerCase() ?? "";

  return (
    binaryExtensions.has(extension) ||
    ["image", "binary", "asset"].includes(
      file.language.toLowerCase()
    )
  );
}

export default function CodePreview({
  file,
  view = "code",
  isDirty = false,
  onContentChange,
  onSave,
  onReset,
}: CodePreviewProps) {
  const [device, setDevice] = useState<
    "desktop" | "tablet" | "mobile"
  >("desktop");

  const [copied, setCopied] = useState(false);

  const editorRef = useRef<HTMLTextAreaElement>(null);

  const fileName = file?.path ?? "No file selected";
  const content = file?.content ?? "";

  const lines = useMemo(
    () => content.split("\n"),
    [content]
  );

  const language = getLanguage(file);
  const isBinary = isBinaryFile(file);

  function handleChange(
    event: React.ChangeEvent<HTMLTextAreaElement>
  ) {
    onContentChange?.(event.target.value);
  }

  function handleSave() {
    if (!isDirty) return;
    onSave?.();
  }

  function handleCopy() {
    if (!navigator.clipboard || !file || isBinary) return;

    navigator.clipboard.writeText(content);

    setCopied(true);

    window.setTimeout(() => {
      setCopied(false);
    }, 1500);
  }

  function handleRefresh() {
    if (isDirty) {
      const confirmed = window.confirm(
        "Discard your unsaved changes?"
      );

      if (!confirmed) return;
    }

    onReset?.();
  }

  function handleKeyDown(
    event: React.KeyboardEvent<HTMLTextAreaElement>
  ) {
    if (
      event.key === "s" &&
      (event.ctrlKey || event.metaKey)
    ) {
      event.preventDefault();
      handleSave();
      return;
    }

    if (event.key === "Tab") {
      event.preventDefault();

      const textarea = event.currentTarget;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;

      const nextValue =
        content.substring(0, start) +
        "  " +
        content.substring(end);

      onContentChange?.(nextValue);

      requestAnimationFrame(() => {
        textarea.selectionStart = start + 2;
        textarea.selectionEnd = start + 2;
      });
    }
  }

  useEffect(() => {
    function handleGlobalSave(event: KeyboardEvent) {
      if (
        event.key === "s" &&
        (event.ctrlKey || event.metaKey)
      ) {
        event.preventDefault();
        handleSave();
      }
    }

    window.addEventListener("keydown", handleGlobalSave);

    return () => {
      window.removeEventListener(
        "keydown",
        handleGlobalSave
      );
    };
  }, [content, isDirty]);

  const deviceWidth =
    device === "desktop"
      ? "w-full"
      : device === "tablet"
        ? "w-[720px] max-w-[92%]"
        : "w-[390px] max-w-[88%]";

  return (
    <div className="flex h-full min-h-0 flex-col bg-[#0A0A0C]">
      {/* FILE HEADER */}
      <div className="flex h-10 shrink-0 items-center justify-between border-b border-zinc-800/70 bg-[#0D0D0F] px-3">
        <div className="flex min-w-0 items-center gap-2">
          <FileCode2
            className="h-3.5 w-3.5 shrink-0 text-sky-400/80"
            strokeWidth={1.7}
          />

          <span className="max-w-[220px] truncate text-[10px] font-medium text-zinc-400">
            {fileName}
          </span>

          {isDirty ? (
            <span
              title="Unsaved changes"
              className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#D4AF37]"
            />
          ) : (
            <>
              <span className="hidden text-[9px] text-zinc-700 sm:inline">
                -
              </span>

              <span className="hidden text-[9px] text-zinc-700 sm:inline">
                Saved
              </span>
            </>
          )}

          <span className="hidden text-[9px] text-zinc-700 md:inline">
            {language}
          </span>
        </div>

        <div className="flex items-center gap-1">
          {isDirty && (
            <button
              type="button"
              onClick={handleSave}
              className="flex h-7 items-center gap-1.5 rounded-md bg-[#D4AF37]/[0.08] px-2 text-[9px] font-medium text-[#D4AF37] transition hover:bg-[#D4AF37]/[0.14]"
            >
              <CheckCircle2 className="h-3 w-3" />
              <span className="hidden sm:inline">
                Save
              </span>
            </button>
          )}

          <button
            type="button"
            onClick={handleCopy}
            disabled={!file || isBinary}
            aria-label="Copy code"
            className="flex h-7 items-center gap-1.5 rounded-md px-2 text-[9px] text-zinc-600 transition hover:bg-zinc-800/60 hover:text-zinc-300 disabled:cursor-not-allowed disabled:opacity-30"
          >
            {copied ? (
              <>
                <CheckCircle2 className="h-3 w-3 text-emerald-400" />
                <span className="hidden sm:inline">
                  Copied
                </span>
              </>
            ) : (
              <>
                <Copy className="h-3 w-3" />
                <span className="hidden sm:inline">
                  Copy
                </span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={handleRefresh}
            disabled={!file}
            aria-label="Reset file"
            className="flex h-7 w-7 items-center justify-center rounded-md text-zinc-600 transition hover:bg-zinc-800/60 hover:text-zinc-300 disabled:cursor-not-allowed disabled:opacity-30"
          >
            <RefreshCw className="h-3 w-3" />
          </button>

          <button
            type="button"
            aria-label="Fullscreen"
            className="flex h-7 w-7 items-center justify-center rounded-md text-zinc-600 transition hover:bg-zinc-800/60 hover:text-zinc-300"
          >
            <Maximize2 className="h-3 w-3" />
          </button>
        </div>
      </div>

      {/* VIEW HEADER */}
      <div className="flex h-10 shrink-0 items-center justify-between border-b border-zinc-800/60 bg-[#0B0B0D] px-3">
        <div className="flex items-center gap-1 rounded-lg border border-zinc-800 bg-[#09090B] p-0.5">
          <div
            className={`flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[9px] font-medium ${
              view === "code"
                ? "bg-[#D4AF37]/[0.08] text-[#D4AF37]"
                : "text-zinc-600"
            }`}
          >
            <Code2 className="h-3 w-3" />
            Code
          </div>

          <div
            className={`flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[9px] font-medium ${
              view === "preview"
                ? "bg-[#D4AF37]/[0.08] text-[#D4AF37]"
                : "text-zinc-600"
            }`}
          >
            <Play className="h-3 w-3" />
            Preview
          </div>
        </div>

        {view === "preview" && (
          <div className="flex items-center gap-0.5 rounded-lg border border-zinc-800 bg-[#09090B] p-0.5">
            <button
              type="button"
              onClick={() => setDevice("desktop")}
              aria-label="Desktop preview"
              className={`flex h-6 w-7 items-center justify-center rounded-md transition ${
                device === "desktop"
                  ? "bg-zinc-800 text-zinc-200"
                  : "text-zinc-700 hover:text-zinc-400"
              }`}
            >
              <Monitor className="h-3 w-3" />
            </button>

            <button
              type="button"
              onClick={() => setDevice("tablet")}
              aria-label="Tablet preview"
              className={`flex h-6 w-7 items-center justify-center rounded-md transition ${
                device === "tablet"
                  ? "bg-zinc-800 text-zinc-200"
                  : "text-zinc-700 hover:text-zinc-400"
              }`}
            >
              <Tablet className="h-3 w-3" />
            </button>

            <button
              type="button"
              onClick={() => setDevice("mobile")}
              aria-label="Mobile preview"
              className={`flex h-6 w-7 items-center justify-center rounded-md transition ${
                device === "mobile"
                  ? "bg-zinc-800 text-zinc-200"
                  : "text-zinc-700 hover:text-zinc-400"
              }`}
            >
              <Smartphone className="h-3 w-3" />
            </button>
          </div>
        )}
      </div>

      {/* CODE */}
      {view === "code" && (
        <div className="relative min-h-0 flex-1 overflow-auto bg-[#09090B]">
          {!file ? (
            <div className="flex h-full items-center justify-center p-8">
              <div className="max-w-sm text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl border border-zinc-800 bg-[#0D0D0F]">
                  <FileCode2 className="h-5 w-5 text-zinc-600" />
                </div>

                <h3 className="mt-4 text-sm font-medium text-zinc-300">
                  No file selected
                </h3>

                <p className="mt-2 text-xs leading-5 text-zinc-600">
                  Select a generated project file from the explorer.
                </p>
              </div>
            </div>
          ) : isBinary ? (
            <div className="flex h-full items-center justify-center p-8">
              <div className="max-w-sm text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl border border-zinc-800 bg-[#0D0D0F]">
                  <FileCode2 className="h-5 w-5 text-zinc-600" />
                </div>

                <h3 className="mt-4 text-sm font-medium text-zinc-300">
                  Binary / asset file
                </h3>

                <p className="mt-2 text-xs leading-5 text-zinc-600">
                  This generated asset cannot be edited in the text
                  editor yet.
                </p>
              </div>
            </div>
          ) : (
            <div className="relative min-w-[720px] py-4 font-mono text-[11px] leading-6">
              {/* Line numbers */}
              <div className="pointer-events-none absolute left-0 top-4 w-12 select-none">
                {lines.map((_, index) => (
                  <div
                    key={`line-${index}`}
                    className="h-6 pr-4 text-right text-zinc-800"
                  >
                    {index + 1}
                  </div>
                ))}
              </div>

              {/* Editor */}
              <textarea
                ref={editorRef}
                value={content}
                onChange={handleChange}
                onKeyDown={handleKeyDown}
                spellCheck={false}
                wrap="off"
                aria-label={`Edit ${fileName}`}
                className="
                  block
                  min-h-[calc(100vh-250px)]
                  w-full
                  resize-none
                  overflow-hidden
                  bg-transparent
                  pl-14
                  pr-8
                  font-mono
                  text-[11px]
                  leading-6
                  text-zinc-400
                  outline-none
                  selection:bg-[#D4AF37]/15
                  selection:text-zinc-100
                "
              />
            </div>
          )}
        </div>
      )}

      {/* PREVIEW */}
      {view === "preview" && (
        <div className="relative min-h-0 flex-1 overflow-auto bg-[#161618] p-5">
          <div
            className={`
              mx-auto
              flex
              min-h-full
              flex-col
              overflow-hidden
              rounded-xl
              border
              border-zinc-800
              bg-[#0B0B0D]
              shadow-2xl
              transition-all
              duration-300
              ${deviceWidth}
            `}
          >
            {/* Browser */}
            <div className="flex h-9 shrink-0 items-center gap-2 border-b border-zinc-800 bg-[#111113] px-3">
              <div className="flex gap-1">
                <span className="h-2 w-2 rounded-full bg-zinc-700" />
                <span className="h-2 w-2 rounded-full bg-zinc-700" />
                <span className="h-2 w-2 rounded-full bg-zinc-700" />
              </div>

              <div className="mx-auto flex max-w-xs flex-1 items-center justify-center rounded-md border border-zinc-800 bg-[#0B0B0D] px-3 py-1">
                <span className="truncate text-[8px] text-zinc-700">
                  preview.anvix.ai
                </span>
              </div>

              <ExternalLink className="h-3 w-3 text-zinc-700" />
            </div>

            {/* Preview */}
            <div className="min-h-[520px] flex-1 overflow-auto bg-[#0B0B0D]">
              <nav className="flex items-center justify-between border-b border-zinc-800/70 px-6 py-4">
                <div className="flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#D4AF37]">
                    <Sparkles
                      className="h-3.5 w-3.5 text-black"
                      strokeWidth={2}
                    />
                  </div>

                  <span className="text-xs font-semibold text-white">
                    ANVIX
                  </span>
                </div>

                <div className="hidden items-center gap-5 text-[9px] text-zinc-500 sm:flex">
                  <span>Features</span>
                  <span>Pricing</span>
                  <span>About</span>
                </div>

                <button
                  type="button"
                  className="rounded-lg bg-[#D4AF37] px-3 py-1.5 text-[9px] font-semibold text-black"
                >
                  Get started
                </button>
              </nav>

              <section className="px-6 py-20 sm:px-12">
                <div className="mx-auto max-w-2xl text-center">
                  <div className="mx-auto flex w-fit items-center gap-2 rounded-full border border-[#D4AF37]/15 bg-[#D4AF37]/[0.05] px-3 py-1.5">
                    <Sparkles className="h-3 w-3 text-[#D4AF37]" />

                    <span className="text-[8px] text-[#D4AF37]">
                      Built with ANVIX AI
                    </span>
                  </div>

                  <h2 className="mt-6 text-3xl font-semibold tracking-tight text-white sm:text-5xl">
                    Build something{" "}
                    <span className="text-[#D4AF37]">
                      remarkable.
                    </span>
                  </h2>

                  <p className="mx-auto mt-5 max-w-lg text-xs leading-6 text-zinc-500 sm:text-sm">
                    Generated project preview will run here after
                    ANVIX connects to a project sandbox.
                  </p>

                  <button
                    type="button"
                    className="mt-7 inline-flex items-center gap-2 rounded-xl bg-[#D4AF37] px-5 py-3 text-[10px] font-semibold text-black"
                  >
                    Continue editing
                    <ExternalLink className="h-3 w-3" />
                  </button>
                </div>
              </section>

              <div className="mx-6 mb-8 rounded-xl border border-zinc-800 bg-[#111113] p-4">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400" />

                  <div>
                    <p className="text-[10px] font-medium text-zinc-300">
                      Preview placeholder
                    </p>

                    <p className="mt-0.5 text-[8px] text-zinc-700">
                      The generated project is not running yet.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
