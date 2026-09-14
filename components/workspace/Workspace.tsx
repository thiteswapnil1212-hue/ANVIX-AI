"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Bot,
  CheckCircle2,
  ChevronDown,
  Code2,
  Eye,
  Folder,
  GitBranch,
  Loader2,
  MoreHorizontal,
  Play,
  Rocket,
  Sparkles,
  Terminal,
} from "lucide-react";

import {
  isGeneratedProject,
  type GeneratedProject,
} from "@/lib/project/project-schema";

import FileExplorer from "./FileExplorer";
import CodePreview from "./CodePreview";

interface WorkspaceProps {
  projectName?: string;
}

const GENERATED_PROJECT_STORAGE_KEY = "anvix.generatedProject";

function cloneProject(project: GeneratedProject) {
  return JSON.parse(JSON.stringify(project)) as GeneratedProject;
}

function readStoredProject(): GeneratedProject | null {
  if (typeof window === "undefined") {
    return null;
  }

  const rawProject = window.sessionStorage.getItem(
    GENERATED_PROJECT_STORAGE_KEY
  );

  if (!rawProject) {
    return null;
  }

  try {
    const parsed = JSON.parse(rawProject) as unknown;
    const normalizedProject = isGeneratedProject(parsed)
      ? {
          name: parsed.name.trim(),
          framework: "nextjs" as const,
          files: parsed.files.map((file) => ({
            path: file.path.trim(),
            content: file.content,
            language: file.language.trim(),
          })),
        }
      : null;

    if (!normalizedProject || normalizedProject.files.length === 0) {
      return null;
    }

    return normalizedProject;
  } catch {
    return null;
  }
}

function getFirstFilePath(files: GeneratedProject["files"]) {
  return files.find((file) => file.path.trim().length > 0)?.path ?? null;
}

export default function Workspace({
  projectName = "Untitled Project",
}: WorkspaceProps) {
  const router = useRouter();
  const [project, setProject] = useState<GeneratedProject | null>(null);
  const [savedProject, setSavedProject] = useState<GeneratedProject | null>(null);
  const [selectedFilePath, setSelectedFilePath] = useState<string | null>(null);
  const [activeView, setActiveView] = useState<"code" | "preview">("code");

  const [aiPrompt, setAiPrompt] = useState("");
  const [isRunning, setIsRunning] = useState(false);

  useEffect(() => {
    const storedProject = readStoredProject();

    if (!storedProject || storedProject.files.length === 0) {
      setProject(null);
      setSavedProject(null);
      setSelectedFilePath(null);
      return;
    }

    const nextProject = cloneProject(storedProject);
    setProject(nextProject);
    setSavedProject(cloneProject(nextProject));
    setSelectedFilePath(getFirstFilePath(nextProject.files));
  }, []);

  const selectedFile = useMemo(() => {
    if (!project || !selectedFilePath) {
      return null;
    }

    return (
      project.files.find((file) => file.path === selectedFilePath) ?? null
    );
  }, [project, selectedFilePath]);

  const isDirty = useMemo(() => {
    if (!project || !savedProject) {
      return false;
    }

    return JSON.stringify(project) !== JSON.stringify(savedProject);
  }, [project, savedProject]);

  function handleRun() {
    if (isRunning) return;

    setIsRunning(true);

    window.setTimeout(() => {
      setIsRunning(false);
    }, 1200);
  }

  function handleAiSubmit() {
    const prompt = aiPrompt.trim();

    if (!prompt) return;

    console.log("ANVIX request:", prompt);

    setAiPrompt("");
  }

  function handleAiKeyDown(
    event: React.KeyboardEvent<HTMLTextAreaElement>
  ) {
    if (
      event.key === "Enter" &&
      (event.ctrlKey || event.metaKey)
    ) {
      event.preventDefault();
      handleAiSubmit();
    }
  }

  function handleFileSelect(filePath: string) {
    setSelectedFilePath(filePath);
  }

  function handleContentChange(nextContent: string) {
    if (!project || !selectedFilePath) return;

    setProject((currentProject) => {
      if (!currentProject) {
        return currentProject;
      }

      return {
        ...currentProject,
        files: currentProject.files.map((file) =>
          file.path === selectedFilePath
            ? { ...file, content: nextContent }
            : file
        ),
      };
    });
  }

  function handleSave() {
    if (!project) return;

    const serializedProject = JSON.stringify(project);
    window.sessionStorage.setItem(
      GENERATED_PROJECT_STORAGE_KEY,
      serializedProject
    );
    setSavedProject(cloneProject(project));
  }

  function handleReset() {
    if (!project || !savedProject || !selectedFilePath) return;

    const savedFile = savedProject.files.find(
      (file) => file.path === selectedFilePath
    );

    if (!savedFile) return;

    setProject((currentProject) => {
      if (!currentProject) {
        return currentProject;
      }

      return {
        ...currentProject,
        files: currentProject.files.map((file) =>
          file.path === selectedFilePath
            ? { ...file, content: savedFile.content }
            : file
        ),
      };
    });
  }

  if (!project || !project.files.length) {
    return (
      <div className="flex h-[calc(100vh-64px)] min-h-0 w-full items-center justify-center overflow-hidden bg-[#0B0B0D] px-6 text-white">
        <div className="max-w-md rounded-2xl border border-zinc-800 bg-[#0D0D0F] p-8 text-center shadow-2xl">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl border border-[#D4AF37]/15 bg-[#D4AF37]/[0.06]">
            <Sparkles className="h-5 w-5 text-[#D4AF37]" strokeWidth={1.8} />
          </div>

          <h2 className="mt-5 text-lg font-semibold text-zinc-100">
            No generated project found.
          </h2>

          <p className="mt-3 text-sm leading-6 text-zinc-500">
            Go back to Generate and create a project first.
          </p>

          <button
            type="button"
            onClick={() => router.push("/generate")}
            className="mt-6 inline-flex items-center justify-center rounded-lg bg-[#D4AF37] px-4 py-2 text-xs font-semibold text-black transition hover:bg-[#E2C259]"
          >
            Go to Generate
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="
        flex
        h-[calc(100vh-64px)]
        min-h-0
        w-full
        flex-col
        overflow-hidden
        bg-[#0B0B0D]
        text-white
      "
    >
      {/* TOP BAR */}
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-zinc-800/80 bg-[#0F0F11] px-4">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex min-w-0 items-center gap-2">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[#D4AF37]/15 bg-[#D4AF37]/[0.06]">
              <Sparkles
                className="h-4 w-4 text-[#D4AF37]"
                strokeWidth={1.8}
              />
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <h1 className="max-w-[260px] truncate text-xs font-semibold text-zinc-200">
                  {projectName}
                </h1>

                <ChevronDown className="h-3 w-3 shrink-0 text-zinc-600" />
              </div>

              <p className="text-[9px] text-zinc-600">
                ANVIX Workspace
              </p>
            </div>
          </div>

          <div className="hidden h-5 w-px bg-zinc-800 sm:block" />

          <div className="hidden items-center gap-2 rounded-full border border-zinc-800 bg-[#0B0B0D] px-2.5 py-1 sm:flex">
            {isRunning ? (
              <>
                <Loader2 className="h-3 w-3 animate-spin text-[#D4AF37]" />
                <span className="text-[9px] font-medium text-zinc-500">
                  Building
                </span>
              </>
            ) : (
              <>
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                <span className="text-[9px] font-medium text-zinc-500">
                  {isDirty ? "Unsaved" : "Ready"}
                </span>
              </>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            className="hidden items-center gap-1.5 rounded-lg border border-zinc-800 bg-[#0B0B0D] px-3 py-2 text-[10px] font-medium text-zinc-400 transition hover:border-zinc-700 hover:text-zinc-200 sm:flex"
          >
            <GitBranch className="h-3 w-3" />
            main
          </button>

          <button
            type="button"
            onClick={handleRun}
            disabled={isRunning}
            className="flex items-center gap-1.5 rounded-lg border border-zinc-800 bg-[#0B0B0D] px-3 py-2 text-[10px] font-medium text-zinc-400 transition hover:border-zinc-700 hover:text-zinc-200 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isRunning ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <Play className="h-3 w-3" />
            )}

            <span className="hidden sm:inline">
              {isRunning ? "Running" : "Run"}
            </span>
          </button>

          <button
            type="button"
            onClick={handleSave}
            className="flex items-center gap-1.5 rounded-lg bg-[#D4AF37] px-3 py-2 text-[10px] font-semibold text-black transition hover:bg-[#E2C259] disabled:cursor-not-allowed disabled:opacity-50"
            disabled={!isDirty}
          >
            <CheckCircle2 className="h-3 w-3" />

            <span className="hidden sm:inline">
              Save
            </span>
          </button>

          <button
            type="button"
            className="flex items-center gap-1.5 rounded-lg border border-zinc-800 bg-[#0B0B0D] px-3 py-2 text-[10px] font-medium text-zinc-400 transition hover:border-zinc-700 hover:text-zinc-200 disabled:cursor-not-allowed disabled:opacity-50"
            onClick={handleReset}
            disabled={!isDirty || !selectedFilePath}
          >
            <span className="hidden sm:inline">Reset</span>
          </button>

          <button
            type="button"
            className="flex items-center gap-1.5 rounded-lg bg-[#D4AF37] px-3 py-2 text-[10px] font-semibold text-black transition hover:bg-[#E2C259]"
          >
            <Rocket className="h-3 w-3" />

            <span className="hidden sm:inline">
              Deploy
            </span>
          </button>

          <button
            type="button"
            aria-label="More options"
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-800 text-zinc-500 transition hover:border-zinc-700 hover:text-zinc-300"
          >
            <MoreHorizontal className="h-4 w-4" />
          </button>
        </div>
      </header>

      {/* BODY */}
      <div className="flex min-h-0 flex-1 overflow-hidden">
        {/* SIDEBAR */}
        <aside className="hidden min-h-0 w-[220px] shrink-0 flex-col overflow-hidden border-r border-zinc-800/80 bg-[#0D0D0F] lg:flex">
          <div className="flex h-11 shrink-0 items-center justify-between border-b border-zinc-800/60 px-3">
            <div className="flex items-center gap-2">
              <Folder className="h-3.5 w-3.5 text-zinc-500" />

              <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
                Explorer
              </span>
            </div>

            <button
              type="button"
              aria-label="Explorer options"
              className="rounded p-1 text-zinc-600 transition hover:text-zinc-300"
            >
              <MoreHorizontal className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="min-h-0 flex-1 overflow-hidden">
            <FileExplorer
              files={project.files}
              projectName={project.name}
              selectedFile={selectedFilePath ?? undefined}
              onFileSelect={handleFileSelect}
            />
          </div>

          <div className="shrink-0 border-t border-zinc-800/60 p-3">
            <div className="flex items-center gap-2 rounded-lg border border-zinc-800/70 bg-[#0B0B0D] px-2.5 py-2">
              <Code2 className="h-3.5 w-3.5 text-[#D4AF37]" />

              <div className="min-w-0">
                <p className="truncate text-[9px] font-medium text-zinc-400">
                  {project.framework === "nextjs" ? "Next.js" : project.framework}
                </p>

                <p className="text-[8px] text-zinc-700">
                  Application
                </p>
              </div>
            </div>
          </div>
        </aside>

        {/* MAIN */}
        <main className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          {/* TOOLBAR */}
          <div className="flex h-11 shrink-0 items-center justify-between border-b border-zinc-800/70 bg-[#0F0F11] px-3">
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setActiveView("code")}
                className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-[10px] font-medium transition ${
                  activeView === "code"
                    ? "bg-[#D4AF37]/[0.08] text-[#D4AF37]"
                    : "text-zinc-600 hover:text-zinc-300"
                }`}
              >
                <Code2 className="h-3 w-3" />
                Code
              </button>

              <button
                type="button"
                onClick={() => setActiveView("preview")}
                className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-[10px] font-medium transition ${
                  activeView === "preview"
                    ? "bg-[#D4AF37]/[0.08] text-[#D4AF37]"
                    : "text-zinc-600 hover:text-zinc-300"
                }`}
              >
                <Eye className="h-3 w-3" />
                Preview
              </button>
            </div>

            <div className="hidden items-center gap-3 sm:flex">
              <div className="flex items-center gap-1.5 text-[9px] text-zinc-600">
                <Terminal className="h-3 w-3" />
                Console
              </div>

              <div className="h-3 w-px bg-zinc-800" />

              <div className="flex items-center gap-1.5 text-[9px] text-zinc-600">
                <CheckCircle2 className="h-3 w-3 text-emerald-400/70" />
                {isDirty ? "Unsaved" : "Ready"}
              </div>
            </div>
          </div>

          {/* EDITOR / PREVIEW */}
          <div className="min-h-0 flex-1 overflow-hidden">
            <CodePreview
              file={selectedFile}
              view={activeView}
              isDirty={isDirty}
              onContentChange={handleContentChange}
              onSave={handleSave}
              onReset={handleReset}
            />
          </div>

          {/* AI BAR */}
          <div className="shrink-0 border-t border-zinc-800/80 bg-[#0D0D0F] p-3">
            <div className="rounded-xl border border-zinc-800 bg-[#0B0B0D] transition focus-within:border-[#D4AF37]/25">
              <div className="flex items-end gap-2 px-3 py-2.5">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-[#D4AF37]/15 bg-[#D4AF37]/[0.06]">
                  <Bot
                    className="h-3.5 w-3.5 text-[#D4AF37]"
                    strokeWidth={1.8}
                  />
                </div>

                <textarea
                  value={aiPrompt}
                  onChange={(event) =>
                    setAiPrompt(event.target.value)
                  }
                  onKeyDown={handleAiKeyDown}
                  rows={1}
                  placeholder="Ask ANVIX to change or improve your app..."
                  className="max-h-28 min-h-7 flex-1 resize-none bg-transparent py-1 text-[11px] leading-5 text-zinc-200 outline-none placeholder:text-zinc-700"
                />

                <button
                  type="button"
                  onClick={handleAiSubmit}
                  disabled={!aiPrompt.trim()}
                  aria-label="Send AI request"
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#D4AF37] text-black transition hover:bg-[#E2C259] disabled:cursor-not-allowed disabled:opacity-30"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                </button>
              </div>

              <div className="flex items-center justify-between border-t border-zinc-800/60 px-3 py-1.5">
                <span className="text-[8px] text-zinc-700">
                  Describe a change in natural language
                </span>

                <div className="hidden items-center gap-1.5 sm:flex">
                  <kbd className="rounded border border-zinc-800 px-1.5 py-0.5 text-[8px] text-zinc-700">
                    Ctrl
                  </kbd>

                  <span className="text-[8px] text-zinc-800">
                    +
                  </span>

                  <kbd className="rounded border border-zinc-800 px-1.5 py-0.5 text-[8px] text-zinc-700">
                    Enter
                  </kbd>

                  <span className="text-[8px] text-zinc-800">
                    to send
                  </span>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}