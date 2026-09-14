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

interface CodePreviewProps {
  fileName?: string;
  view?: "code" | "preview";
}

const initialFileContents: Record<string, string> = {
  "page.tsx": `import { ArrowRight, Sparkles } from "lucide-react";

export default function Home() {
  return (
    <main className="min-h-screen bg-[#0B0B0D]">
      <section className="mx-auto max-w-6xl px-6 py-24">
        <div className="max-w-3xl">
          <p className="text-sm text-[#D4AF37]">
            Built with ANVIX AI
          </p>

          <h1 className="mt-5 text-5xl font-semibold text-white">
            Build something remarkable.
          </h1>

          <p className="mt-6 text-lg text-zinc-400">
            Turn your idea into a working application
            with natural language.
          </p>

          <button className="mt-8 rounded-xl bg-[#D4AF37] px-5 py-3">
            Start building
            <ArrowRight className="ml-2 inline h-4 w-4" />
          </button>
        </div>
      </section>
    </main>
  );
}`,

  "layout.tsx": `import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ANVIX Generated App",
  description: "Generated with ANVIX AI",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}`,

  "globals.css": `@import "tailwindcss";

:root {
  --background: #0B0B0D;
  --foreground: #ffffff;
  --accent: #D4AF37;
}

* {
  box-sizing: border-box;
}

html,
body {
  margin: 0;
  padding: 0;
  min-height: 100%;
  background: var(--background);
  color: var(--foreground);
}`,

  "navbar.tsx": `"use client";

import Link from "next/link";
import { Sparkles } from "lucide-react";

export default function Navbar() {
  return (
    <nav className="flex items-center justify-between border-b border-zinc-800 px-6 py-4">
      <Link href="/" className="flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-[#D4AF37]" />
        <span className="font-semibold text-white">
          ANVIX
        </span>
      </Link>

      <div className="flex items-center gap-5 text-sm text-zinc-500">
        <Link href="#features">Features</Link>
        <Link href="#pricing">Pricing</Link>
        <Link href="#about">About</Link>
      </div>
    </nav>
  );
}`,

  "hero.tsx": `import { ArrowRight, Sparkles } from "lucide-react";

export default function Hero() {
  return (
    <section className="px-6 py-24">
      <div className="mx-auto max-w-3xl text-center">
        <Sparkles className="mx-auto text-[#D4AF37]" />

        <h1 className="mt-6 text-5xl font-semibold text-white">
          Build something remarkable.
        </h1>

        <p className="mt-5 text-zinc-500">
          Turn your idea into a working application
          with natural language.
        </p>

        <button className="mt-8 rounded-xl bg-[#D4AF37] px-5 py-3 text-black">
          Start building
          <ArrowRight className="ml-2 inline h-4 w-4" />
        </button>
      </div>
    </section>
  );
}`,

  "footer.tsx": `export default function Footer() {
  return (
    <footer className="border-t border-zinc-800 px-6 py-8">
      <p className="text-sm text-zinc-600">
        Built with ANVIX AI
      </p>
    </footer>
  );
}`,

  "package.json": `{
  "name": "anvix-generated-app",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start"
  },
  "dependencies": {
    "next": "16.3.1",
    "react": "19.2.8",
    "lucide-react": "latest"
  }
}`,

  "README.md": `# ANVIX Generated Application

This project was generated using ANVIX AI.

## Getting Started

Install dependencies:

npm install

Start the development server:

npm run dev`,

  "logo.png": `[Binary image file]

Preview is not available for binary files.`,
};

function getInitialContent(fileName: string) {
  return (
    initialFileContents[fileName] ??
    `// ${fileName}

// This file is ready for generated content.
`
  );
}

function getLanguage(fileName: string) {
  if (fileName.endsWith(".tsx")) return "TypeScript React";
  if (fileName.endsWith(".ts")) return "TypeScript";
  if (fileName.endsWith(".css")) return "CSS";
  if (fileName.endsWith(".json")) return "JSON";
  if (fileName.endsWith(".md")) return "Markdown";
  if (fileName.endsWith(".png")) return "Binary";
  return "Text";
}

export default function CodePreview({
  fileName = "page.tsx",
  view = "code",
}: CodePreviewProps) {
  const [device, setDevice] = useState<
    "desktop" | "tablet" | "mobile"
  >("desktop");

  const [copied, setCopied] = useState(false);

  const [fileContents, setFileContents] =
    useState<Record<string, string>>(initialFileContents);

  const [savedContents, setSavedContents] =
    useState<Record<string, string>>(initialFileContents);

  const editorRef = useRef<HTMLTextAreaElement>(null);

  const content =
    fileContents[fileName] ?? getInitialContent(fileName);

  const savedContent =
    savedContents[fileName] ?? getInitialContent(fileName);

  const isDirty = content !== savedContent;

  const lines = useMemo(
    () => content.split("\n"),
    [content]
  );

  const language = getLanguage(fileName);

  const isBinary = language === "Binary";

  function handleChange(
    event: React.ChangeEvent<HTMLTextAreaElement>
  ) {
    const nextValue = event.target.value;

    setFileContents((current) => ({
      ...current,
      [fileName]: nextValue,
    }));
  }

  function handleSave() {
    if (!isDirty) return;

    setSavedContents((current) => ({
      ...current,
      [fileName]: content,
    }));
  }

  function handleCopy() {
    if (!navigator.clipboard) return;

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

    setFileContents((current) => ({
      ...current,
      [fileName]:
        savedContents[fileName] ??
        getInitialContent(fileName),
    }));
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

      setFileContents((current) => ({
        ...current,
        [fileName]: nextValue,
      }));

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
  }, [content, fileName, isDirty]);

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
                •
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
            aria-label="Copy code"
            className="flex h-7 items-center gap-1.5 rounded-md px-2 text-[9px] text-zinc-600 transition hover:bg-zinc-800/60 hover:text-zinc-300"
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
            aria-label="Reset file"
            className="flex h-7 w-7 items-center justify-center rounded-md text-zinc-600 transition hover:bg-zinc-800/60 hover:text-zinc-300"
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
          {isBinary ? (
            <div className="flex h-full items-center justify-center p-8">
              <div className="max-w-sm text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl border border-zinc-800 bg-[#0D0D0F]">
                  <FileCode2 className="h-5 w-5 text-zinc-600" />
                </div>

                <h3 className="mt-4 text-sm font-medium text-zinc-300">
                  Binary file
                </h3>

                <p className="mt-2 text-xs leading-5 text-zinc-600">
                  This file cannot be edited in the text editor.
                  A real asset preview will be available when
                  ANVIX connects to the project sandbox.
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
                    A working application generated from your
                    natural-language requirements.
                  </p>

                  <button
                    type="button"
                    className="mt-7 inline-flex items-center gap-2 rounded-xl bg-[#D4AF37] px-5 py-3 text-[10px] font-semibold text-black"
                  >
                    Start building
                    <ExternalLink className="h-3 w-3" />
                  </button>
                </div>
              </section>

              <div className="mx-6 mb-8 rounded-xl border border-zinc-800 bg-[#111113] p-4">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400" />

                  <div>
                    <p className="text-[10px] font-medium text-zinc-300">
                      Preview ready
                    </p>

                    <p className="mt-0.5 text-[8px] text-zinc-700">
                      Live sandbox preview will connect here.
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