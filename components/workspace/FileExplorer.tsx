"use client";

import {
  ChevronDown,
  ChevronRight,
  FileCode2,
  FileJson,
  FileText,
  Folder,
  FolderOpen,
  Globe,
  Image,
  Package,
} from "lucide-react";
import { useMemo, useState } from "react";

import type { ProjectFile } from "@/lib/project/project-schema";

type FileType =
  | "folder"
  | "tsx"
  | "ts"
  | "json"
  | "css"
  | "md"
  | "image"
  | "text";

interface TreeItem {
  name: string;
  path: string;
  type: FileType;
  children?: TreeItem[];
}

interface FileExplorerProps {
  files: ProjectFile[];
  projectName?: string;
  onFileSelect?: (filePath: string) => void;
  selectedFile?: string;
}

const imageExtensions = new Set([
  "png",
  "jpg",
  "jpeg",
  "webp",
  "gif",
  "ico",
]);

function getFileType(filePath: string): FileType {
  const extension =
    filePath.split(".").pop()?.toLowerCase() ?? "";

  if (imageExtensions.has(extension)) return "image";
  if (extension === "tsx") return "tsx";
  if (extension === "ts") return "ts";
  if (extension === "json") return "json";
  if (extension === "css") return "css";
  if (extension === "md") return "md";
  return "text";
}

function sortTreeItems(items: TreeItem[]): TreeItem[] {
  return items
    .map((item) => ({
      ...item,
      children: item.children
        ? sortTreeItems(item.children)
        : undefined,
    }))
    .sort((a, b) => {
      const aIsFolder = a.type === "folder";
      const bIsFolder = b.type === "folder";

      if (aIsFolder !== bIsFolder) {
        return aIsFolder ? -1 : 1;
      }

      return a.name.localeCompare(b.name);
    });
}

function buildFileTree(files: ProjectFile[]) {
  const rootItems: TreeItem[] = [];

  for (const file of files) {
    const parts = file.path.split("/").filter(Boolean);
    let currentLevel = rootItems;
    let currentPath = "";

    parts.forEach((part, index) => {
      currentPath = currentPath
        ? `${currentPath}/${part}`
        : part;

      const isFile = index === parts.length - 1;
      let item = currentLevel.find(
        (candidate) => candidate.name === part
      );

      if (!item) {
        item = {
          name: part,
          path: currentPath,
          type: isFile ? getFileType(file.path) : "folder",
          children: isFile ? undefined : [],
        };

        currentLevel.push(item);
      }

      if (!isFile) {
        item.children ??= [];
        currentLevel = item.children;
      }
    });
  }

  return sortTreeItems(rootItems);
}

function FileIcon({ type }: { type: FileType }) {
  if (type === "folder") {
    return (
      <Folder
        className="h-3.5 w-3.5 text-[#D4AF37]"
        strokeWidth={1.7}
      />
    );
  }

  if (type === "tsx" || type === "ts") {
    return (
      <FileCode2
        className="h-3.5 w-3.5 text-sky-400/80"
        strokeWidth={1.7}
      />
    );
  }

  if (type === "json") {
    return (
      <FileJson
        className="h-3.5 w-3.5 text-amber-400/80"
        strokeWidth={1.7}
      />
    );
  }

  if (type === "css") {
    return (
      <Globe
        className="h-3.5 w-3.5 text-purple-400/80"
        strokeWidth={1.7}
      />
    );
  }

  if (type === "image") {
    return (
      <Image
        className="h-3.5 w-3.5 text-emerald-400/80"
        strokeWidth={1.7}
      />
    );
  }

  return (
    <FileText
      className="h-3.5 w-3.5 text-zinc-500"
      strokeWidth={1.7}
    />
  );
}

function FileTreeItem({
  item,
  depth = 0,
  selectedFile,
  onFileSelect,
}: {
  item: TreeItem;
  depth?: number;
  selectedFile?: string;
  onFileSelect?: (filePath: string) => void;
}) {
  const [isOpen, setIsOpen] = useState(depth < 1);

  const isFolder = item.type === "folder";
  const isSelected = selectedFile === item.path;

  function handleClick() {
    if (isFolder) {
      setIsOpen((current) => !current);
      return;
    }

    onFileSelect?.(item.path);
  }

  return (
    <div>
      <button
        type="button"
        onClick={handleClick}
        className={`
          group
          flex
          w-full
          items-center
          gap-1.5
          rounded-md
          px-2
          py-1.5
          text-left
          transition-colors
          ${
            isSelected
              ? "bg-[#D4AF37]/[0.08] text-zinc-100"
              : "text-zinc-500 hover:bg-zinc-800/40 hover:text-zinc-300"
          }
        `}
        style={{
          paddingLeft: `${10 + depth * 14}px`,
        }}
      >
        {isFolder ? (
          isOpen ? (
            <ChevronDown
              className="h-3 w-3 shrink-0 text-zinc-600"
              strokeWidth={1.8}
            />
          ) : (
            <ChevronRight
              className="h-3 w-3 shrink-0 text-zinc-600"
              strokeWidth={1.8}
            />
          )
        ) : (
          <span className="w-3 shrink-0" />
        )}

        {isFolder && isOpen ? (
          <FolderOpen
            className="h-3.5 w-3.5 shrink-0 text-[#D4AF37]"
            strokeWidth={1.7}
          />
        ) : (
          <FileIcon type={item.type} />
        )}

        <span className="truncate text-[10px] font-medium">
          {item.name}
        </span>
      </button>

      {isFolder && isOpen && item.children && (
        <div>
          {item.children.map((child) => (
            <FileTreeItem
              key={child.path}
              item={child}
              depth={depth + 1}
              selectedFile={selectedFile}
              onFileSelect={onFileSelect}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function FileExplorer({
  files,
  projectName = "Generated Project",
  onFileSelect,
  selectedFile,
}: FileExplorerProps) {
  const fileTree = useMemo(
    () => buildFileTree(files),
    [files]
  );

  return (
    <div className="flex h-full min-h-0 flex-col">

      {/* Project header */}
      <div className="flex shrink-0 items-center gap-2 px-3 py-3">
        <Package
          className="h-3.5 w-3.5 text-zinc-600"
          strokeWidth={1.7}
        />

        <span className="text-[9px] font-semibold uppercase tracking-[0.12em] text-zinc-600">
          Project files
        </span>
      </div>

      {/* Tree */}
      <div className="min-h-0 flex-1 overflow-y-auto px-1.5 pb-4 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-zinc-800">
        <FileTreeItem
          item={{
            name: `${projectName}/`,
            path: "",
            type: "folder",
            children: fileTree,
          }}
          selectedFile={selectedFile}
          onFileSelect={onFileSelect}
        />
      </div>

      {/* Bottom status */}
      <div className="shrink-0 border-t border-zinc-800/60 px-3 py-2.5">
        <div className="flex items-center justify-between">
          <span className="text-[8px] text-zinc-700">
            {files.length} {files.length === 1 ? "file" : "files"}
          </span>

          <span className="flex items-center gap-1.5 text-[8px] text-emerald-400/60">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400/70" />
            Synced
          </span>
        </div>
      </div>
    </div>
  );
}
