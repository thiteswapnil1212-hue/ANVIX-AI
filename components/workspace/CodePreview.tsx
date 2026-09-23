
"use client";

import {
  Check,
  CheckCircle2,
  Code2,
  Copy,
  ExternalLink,
  FileCode2,
  Maximize2,
  Minimize2,
  Monitor,
  Play,
  RefreshCw,
  Smartphone,
  Sparkles,
  Tablet,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import type { ProjectFile } from "@/lib/project/project-schema";

interface CodePreviewProps {
  file?: ProjectFile | null;
  view?: "code" | "preview";
  isDirty?: boolean;
  onContentChange?: (content: string) => void;
  onSave?: () => void;
  onReset?: () => void;
}

type Device = "desktop" | "tablet" | "mobile";

const BINARY_EXTENSIONS = new Set([
  "png",
  "jpg",
  "jpeg",
  "webp",
  "gif",
  "ico",
  "svg",
  "woff",
  "woff2",
  "ttf",
  "otf",
  "mp4",
  "webm",
  "pdf",
  "zip",
]);

function getLanguage(file?: ProjectFile | null) {
  if (!file) return "Text";

  const declaredLanguage = file.language?.trim();

  if (declaredLanguage) return declaredLanguage;

  const extension = file.path.split(".").pop()?.toLowerCase();

  const languages: Record<string, string> = {
    tsx: "TypeScript React",
    jsx: "JavaScript React",
    ts: "TypeScript",
    js: "JavaScript",
    mjs: "JavaScript",
    cjs: "JavaScript",
    css: "CSS",
    scss: "SCSS",
    html: "HTML",
    json: "JSON",
    md: "Markdown",
    mdx: "MDX",
    py: "Python",
    sql: "SQL",
    yml: "YAML",
    yaml: "YAML",
    xml: "XML",
    sh: "Shell",
  };

  return languages[extension ?? ""] ?? "Text";
}

function isBinaryFile(file?: ProjectFile | null) {
  if (!file) return false;

  const extension = file.path.split(".").pop()?.toLowerCase();

  return (
    BINARY_EXTENSIONS.has(extension ?? "") ||
    ["image", "binary", "asset"].includes(
      file.language?.toLowerCase() ?? ""
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
  const [device, setDevice] = useState<Device>("desktop");
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<HTMLTextAreaElement>(null);
  const copyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null
  );

  const fileName = file?.path ?? "No file selected";
  const content = file?.content ?? "";
  const language = getLanguage(file);
  const isBinary = isBinaryFile(file);

  const lines = useMemo(() => content.split("\n"), [content]);

  const lineCount = lines.length;
  const maxLineNumberWidth = Math.max(2, String(lineCount).length);

  const deviceWidth = {
    desktop: "w-full",
    tablet: "w-[720px] max-w-[92%]",
    mobile: "w-[390px] max-w-[88%]",
  }[device];

  const handleSave = useCallback(() => {
    if (!file || isBinary || !isDirty) return;
    onSave?.();
  }, [file, isBinary, isDirty, onSave]);

  const handleCopy = useCallback(async () => {
    if (!file || isBinary) return;

    setCopyError(false);

    try {
      if (!navigator.clipboard?.writeText) {
        throw new Error("Clipboard API unavailable");
      }

      await navigator.clipboard.writeText(content);
      setCopied(true);

      if (copyTimeoutRef.current) {
        clearTimeout(copyTimeoutRef.current);
      }

      copyTimeoutRef.current = setTimeout(() => {
        setCopied(false);
      }, 1500);
    } catch {
      setCopyError(true);
    }
  }, [file, isBinary, content]);

  const handleReset = useCallback(() => {
    if (!file || !onReset) return;

    if (isDirty) {
      const confirmed = window.confirm(
        "Discard your unsaved changes and reset this file?"
      );

      if (!confirmed) return;
    }

    onReset();
  }, [file, isDirty, onReset]);

  const handleFullscreen = useCallback(async () => {
    const element = containerRef.current;

    if (!element) return;

    try {
      if (document.fullscreenElement === element) {
        await document.exitFullscreen();
      } else if (!document.fullscreenElement) {
        await element.requestFullscreen();
      }
    } catch {
      // Fullscreen may be blocked by the browser or environment.
    }
  }, []);

  useEffect(() => {
    const syncFullscreen = () => {
      setIsFullscreen(
        document.fullscreenElement === containerRef.current
      );
    };

    document.addEventListener("fullscreenchange", syncFullscreen);

    return () => {
      document.removeEventListener(
        "fullscreenchange",
        syncFullscreen
      );
    };
  }, []);

  useEffect(() => {
    return () => {
      if (copyTimeoutRef.current) {
        clearTimeout(copyTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    function handleGlobalSave(event: KeyboardEvent) {
      const isSaveShortcut =
        (event.ctrlKey || event.metaKey) &&
        event.key.toLowerCase() === "s";

      if (!isSaveShortcut || !isDirty || !file) return;

      event.preventDefault();
      handleSave();
    }

    window.addEventListener("keydown", handleGlobalSave);

    return () => {
      window.removeEventListener("keydown", handleGlobalSave);
    };
  }, [file, isDirty, handleSave]);

  const handleChange = (
    event: React.ChangeEvent<HTMLTextAreaElement>
  ) => {
    onContentChange?.(event.currentTarget.value);
  };

  const handleKeyDown = (
    event: React.KeyboardEvent<HTMLTextAreaElement>
  ) => {
    if (
      event.key === "s" &&
      (event.ctrlKey || event.metaKey)
    ) {
      event.preventDefault();
      handleSave();
      return;
    }

    if (event.key !== "Tab") return;

    event.preventDefault();

    const textarea = event.currentTarget;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;

    const nextValue =
      content.slice(0, start) + "  " + content.slice(end);

    onContentChange?.(nextValue);

    requestAnimationFrame(() => {
      if (!editorRef.current) return;

      editorRef.current.selectionStart = start + 2;
      editorRef.current.selectionEnd = start + 2;
    });
  };

  const buttonClass =
    "inline-flex h-7 items-center justify-center gap-1.5 rounded-md px-2 text-[10px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D4AF37]/60 disabled:cursor-not-allowed disabled:opacity-35";

  return (
    <div
      ref={containerRef}
      className={`flex h-full min-h-0 flex-col bg-[#0A0A0C] ${
        isFullscreen ? "h-screen w-screen" : ""
      }`}
    >
      {/* FILE HEADER */}
      <header className="flex h-10 shrink-0 items-center justify-between gap-2 border-b border-zinc-800/70 bg-[#0D0D0F] px-3">
        <div className="flex min-w-0 items-center gap-2">
          <FileCode2
            className="h-3.5 w-3.5 shrink-0 text-sky-400/80"
            strokeWidth={1.7}
            aria-hidden="true"
          />

          <span
            className="max-w-[220px] truncate text-[10px] font-medium text-zinc-400"
            title={fileName}
          >
            {fileName}
          </span>

          {isDirty ? (
            <span
              className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#D4AF37]"
              title="Unsaved changes"
              aria-label="Unsaved changes"
            />
          ) : file ? (
            <span className="hidden text-[9px] text-zinc-600 sm:inline">
              Saved
            </span>
          ) : null}

          <span className="hidden text-[9px] text-zinc-600 md:inline">
            {language}
          </span>
        </div>

        <div className="flex shrink-0 items-center gap-1">
          {isDirty && (
            <button
              type="button"
              onClick={handleSave}
              disabled={!file || isBinary}
              className={`${buttonClass} bg-[#D4AF37]/10 font-medium text-[#D4AF37] hover:bg-[#D4AF37]/20`}
              title="Save changes (Ctrl/Cmd + S)"
            >
              <CheckCircle2 className="h-3 w-3" />
              <span className="hidden sm:inline">Save</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleCopy}
            disabled={!file || isBinary}
            aria-label={copied ? "Code copied" : "Copy code"}
            title={copyError ? "Clipboard access failed" : "Copy code"}
            className={`${buttonClass} text-zinc-500 hover:bg-zinc-800/60 hover:text-zinc-200`}
          >
            {copied ? (
              <Check className="h-3 w-3 text-emerald-400" />
            ) : (
              <Copy className="h-3 w-3" />
            )}
            <span className="hidden sm:inline">
              {copied ? "Copied" : "Copy"}
            </span>
          </button>

          <button
            type="button"
            onClick={handleReset}
            disabled={!file || !onReset}
            aria-label="Reset file"
            title="Reset file"
            className={`${buttonClass} w-7 px-0 text-zinc-500 hover:bg-zinc-800/60 hover:text-zinc-200`}
          >
            <RefreshCw className="h-3 w-3" />
          </button>

          <button
            type="button"
            onClick={handleFullscreen}
            aria-label={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
            title={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
            className={`${buttonClass} w-7 px-0 text-zinc-500 hover:bg-zinc-800/60 hover:text-zinc-200`}
          >
            {isFullscreen ? (
              <Minimize2 className="h-3 w-3" />
            ) : (
              <Maximize2 className="h-3 w-3" />
            )}
          </button>
        </div>
      </header>

      {/* VIEW HEADER */}
      <div className="flex h-10 shrink-0 items-center justify-between border-b border-zinc-800/60 bg-[#0B0B0D] px-3">
        <div
          className="flex items-center gap-1 rounded-lg border border-zinc-800 bg-[#09090B] p-0.5"
          aria-label="Current view"
        >
          <div
            className={`flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[9px] font-medium ${
              view === "code"
                ? "bg-[#D4AF37]/10 text-[#D4AF37]"
                : "text-zinc-600"
            }`}
            aria-current={view === "code" ? "page" : undefined}
          >
            <Code2 className="h-3 w-3" />
            Code
          </div>

          <div
            className={`flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[9px] font-medium ${
              view === "preview"
                ? "bg-[#D4AF37]/10 text-[#D4AF37]"
                : "text-zinc-600"
            }`}
            aria-current={view === "preview" ? "page" : undefined}
          >
            <Play className="h-3 w-3" />
            Preview
          </div>
        </div>

        {view === "preview" && (
          <div
            className="flex items-center gap-0.5 rounded-lg border border-zinc-800 bg-[#09090B] p-0.5"
            aria-label="Preview device size"
          >
            {(
              [
                ["desktop", Monitor, "Desktop preview"],
                ["tablet", Tablet, "Tablet preview"],
                ["mobile", Smartphone, "Mobile preview"],
              ] as const
            ).map(([value, Icon, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setDevice(value)}
                aria-label={label}
                aria-pressed={device === value}
                className={`flex h-6 w-7 items-center justify-center rounded-md transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D4AF37]/60 ${
                  device === value
                    ? "bg-zinc-800 text-zinc-100"
                    : "text-zinc-600 hover:text-zinc-300"
                }`}
              >
                <Icon className="h-3 w-3" />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* CODE VIEW */}
      {view === "code" && (
        <div className="relative min-h-0 flex-1 overflow-auto bg-[#09090B]">
          {!file ? (
            <EmptyState
              title="No file selected"
              description="Select a generated project file from the explorer."
            />
          ) : isBinary ? (
            <EmptyState
              title="Binary / asset file"
              description="This asset cannot be edited in the text editor yet."
            />
          ) : (
            <div className="relative min-w-[720px] py-4 font-mono text-[11px] leading-6">
              {/* Line numbers */}
              <div
                className="pointer-events-none absolute left-0 top-4 w-12 select-none"
                aria-hidden="true"
              >
                {lines.map((_, index) => (
                  <div
                    key={index}
                    className="h-6 pr-4 text-right text-zinc-700"
                    style={{
                      minWidth: `${maxLineNumberWidth}ch`,
                    }}
                  >
                    {index + 1}
                  </div>
                ))}
              </div>

              {/* Text editor */}
              <textarea
                ref={editorRef}
                value={content}
                onChange={handleChange}
                onKeyDown={handleKeyDown}
                spellCheck={false}
                autoCapitalize="off"
                autoCorrect="off"
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
                  text-zinc-300
                  caret-[#D4AF37]
                  outline-none
                  selection:bg-[#D4AF37]/20
                  selection:text-white
                  focus-visible:ring-1
                  focus-visible:ring-inset
                  focus-visible:ring-[#D4AF37]/30
                "
              />
            </div>
          )}
        </div>
      )}

      {/* PREVIEW VIEW */}
      {view === "preview" && (
        <div className="relative min-h-0 flex-1 overflow-auto bg-[#161618] p-5">
          <div
            className={`mx-auto flex min-h-full flex-col overflow-hidden rounded-xl border border-zinc-800 bg-[#0B0B0D] shadow-2xl transition-[width] duration-300 ${deviceWidth}`}
          >
            {/* Browser chrome */}
            <div className="flex h-9 shrink-0 items-center gap-2 border-b border-zinc-800 bg-[#111113] px-3">
              <div className="flex gap-1" aria-hidden="true">
                <span className="h-2 w-2 rounded-full bg-zinc-700" />
                <span className="h-2 w-2 rounded-full bg-zinc-700" />
                <span className="h-2 w-2 rounded-full bg-zinc-700" />
              </div>

              <div className="mx-auto flex max-w-xs flex-1 items-center justify-center rounded-md border border-zinc-800 bg-[#0B0B0D] px-3 py-1">
                <span className="truncate text-[8px] text-zinc-500">
                  preview.anvix.ai
                </span>
              </div>

              <ExternalLink
                className="h-3 w-3 text-zinc-600"
                aria-hidden="true"
              />
            </div>

            {/* Placeholder content */}
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

                <span className="rounded-lg bg-[#D4AF37] px-3 py-1.5 text-[9px] font-semibold text-black">
                  Get started
                </span>
              </nav>

              <section className="px-6 py-20 sm:px-12">
                <div className="mx-auto max-w-2xl text-center">
                  <div className="mx-auto flex w-fit items-center gap-2 rounded-full border border-[#D4AF37]/15 bg-[#D4AF37]/5 px-3 py-1.5">
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
                    Your generated project will appear here once
                    ANVIX connects to a running preview sandbox.
                  </p>

                  <div className="mt-7 inline-flex items-center gap-2 rounded-xl border border-zinc-800 bg-[#111113] px-5 py-3 text-[10px] font-medium text-zinc-400">
                    <Play className="h-3 w-3 text-[#D4AF37]" />
                    Preview environment pending
                  </div>
                </div>
              </section>

              <div className="mx-6 mb-8 rounded-xl border border-zinc-800 bg-[#111113] p-4">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400" />

                  <div>
                    <p className="text-[10px] font-medium text-zinc-300">
                      Preview placeholder
                    </p>

                    <p className="mt-0.5 text-[8px] text-zinc-600">
                      The generated project is not running yet.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="sr-only" role="status" aria-live="polite">
        {copied ? "Code copied to clipboard." : ""}
        {copyError ? "Could not copy code. Check clipboard permissions." : ""}
      </div>
    </div>
  );
}

function EmptyState({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="flex h-full min-h-[240px] items-center justify-center p-8">
      <div className="max-w-sm text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl border border-zinc-800 bg-[#0D0D0F]">
          <FileCode2 className="h-5 w-5 text-zinc-600" />
        </div>

        <h3 className="mt-4 text-sm font-medium text-zinc-300">
          {title}
        </h3>

        <p className="mt-2 text-xs leading-5 text-zinc-600">
          {description}
        </p>
      </div>
    </div>
  );
}