
"use client";

import {
  ChevronDown,
  ChevronRight,
  File,
  FileCode2,
  FileJson,
  FileText,
  Folder,
  FolderOpen,
  Globe,
  Image as ImageIcon,
  Package,
} from "lucide-react";
import {
  useCallback,
  useMemo,
  useState,
} from "react";

import type { ProjectFile } from "@/lib/project/project-schema";

type FileType =
  | "folder"
  | "tsx"
  | "ts"
  | "js"
  | "json"
  | "css"
  | "html"
  | "image"
  | "markdown"
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

const IMAGE_EXTENSIONS = new Set([
  "png",
  "jpg",
  "jpeg",
  "webp",
  "gif",
  "ico",
  "svg",
  "avif",
]);

const FILE_TYPE_BY_EXTENSION: Record<string, FileType> = {
  tsx: "tsx",
  ts: "ts",
  jsx: "js",
  js: "js",
  mjs: "js",
  cjs: "js",
  json: "json",
  css: "css",
  scss: "css",
  html: "html",
  htm: "html",
  md: "markdown",
  mdx: "markdown",
  txt: "text",
  env: "text",
  yml: "text",
  yaml: "text",
  py: "text",
  sql: "text",
};

function normalizePath(path: string): string {
  return path
    .replace(/\\/g, "/")
    .replace(/^\/+/, "")
    .replace(/\/+/g, "/")
    .replace(/\/+$/, "");
}

function getFileType(filePath: string): FileType {
  const normalizedPath = normalizePath(filePath);
  const fileName = normalizedPath.split("/").pop() ?? "";
  const extension = fileName.includes(".")
    ? fileName.split(".").pop()?.toLowerCase() ?? ""
    : "";

  if (IMAGE_EXTENSIONS.has(extension)) return "image";

  return FILE_TYPE_BY_EXTENSION[extension] ?? "text";
}

function sortTreeItems(items: TreeItem[]): TreeItem[] {
  return [...items]
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

      return a.name.localeCompare(b.name, undefined, {
        numeric: true,
        sensitivity: "base",
      });
    });
}

function buildFileTree(files: ProjectFile[]): TreeItem[] {
  const root: TreeItem[] = [];

  for (const file of files) {
    const normalizedPath = normalizePath(file.path);

    if (!normalizedPath) continue;

    const parts = normalizedPath.split("/");
    let currentLevel = root;
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
          type: isFile ? getFileType(normalizedPath) : "folder",
          children: isFile ? undefined : [],
        };

        currentLevel.push(item);
      }

      // A path may first appear as a file and later be used
      // as a parent folder. Promote it to a folder safely.
      if (!isFile) {
        item.type = "folder";
        item.children ??= [];
        currentLevel = item.children;
      }
    });
  }

  return sortTreeItems(root);
}

function FileIcon({
  type,
  isOpen = false,
}: {
  type: FileType;
  isOpen?: boolean;
}) {
  const iconClass = "h-3.5 w-3.5 shrink-0";
  const iconProps = {
    className: iconClass,
    strokeWidth: 1.7,
    "aria-hidden": true as const,
  };

  switch (type) {
    case "folder":
      return isOpen ? (
        <FolderOpen
          {...iconProps}
          className={`${iconClass} text-[#D4AF37]`}
        />
      ) : (
        <Folder
          {...iconProps}
          className={`${iconClass} text-[#D4AF37]`}
        />
      );

    case "tsx":
    case "ts":
    case "js":
      return (
        <FileCode2
          {...iconProps}
          className={`${iconClass} text-sky-400/80`}
        />
      );

    case "json":
      return (
        <FileJson
          {...iconProps}
          className={`${iconClass} text-amber-400/80`}
        />
      );

    case "css":
      return (
        <Globe
          {...iconProps}
          className={`${iconClass} text-purple-400/80`}
        />
      );

    case "image":
      return (
        <ImageIcon
          {...iconProps}
          className={`${iconClass} text-emerald-400/80`}
        />
      );

    case "markdown":
      return (
        <FileText
          {...iconProps}
          className={`${iconClass} text-blue-300/80`}
        />
      );

    case "html":
      return (
        <Globe
          {...iconProps}
          className={`${iconClass} text-orange-400/80`}
        />
      );

    default:
      return (
        <File
          {...iconProps}
          className={`${iconClass} text-zinc-500`}
        />
      );
  }
}

interface FileTreeItemProps {
  item: TreeItem;
  depth?: number;
  selectedFile?: string;
  onFileSelect?: (filePath: string) => void;
  expandedPaths: Set<string>;
  onToggleFolder: (path: string) => void;
}

function FileTreeItem({
  item,
  depth = 0,
  selectedFile,
  onFileSelect,
  expandedPaths,
  onToggleFolder,
}: FileTreeItemProps) {
  const isFolder = item.type === "folder";
  const isOpen = expandedPaths.has(item.path);
  const isSelected = selectedFile === item.path;

  const handleClick = () => {
    if (isFolder) {
      onToggleFolder(item.path);
      return;
    }

    onFileSelect?.(item.path);
  };

  return (
    <div>
      <button
        type="button"
        onClick={handleClick}
        aria-expanded={isFolder ? isOpen : undefined}
        aria-current={isSelected ? "true" : undefined}
        title={item.path || item.name}
        className={`
          group
          flex
          min-h-7
          w-full
          items-center
          gap-1.5
          rounded-md
          py-1.5
          pr-2
          text-left
          transition-colors
          focus-visible:outline-none
          focus-visible:ring-1
          focus-visible:ring-inset
          focus-visible:ring-[#D4AF37]/60
          ${
            isSelected
              ? "bg-[#D4AF37]/10 text-zinc-100"
              : "text-zinc-500 hover:bg-zinc-800/50 hover:text-zinc-300"
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
              aria-hidden="true"
            />
          ) : (
            <ChevronRight
              className="h-3 w-3 shrink-0 text-zinc-600"
              strokeWidth={1.8}
              aria-hidden="true"
            />
          )
        ) : (
          <span className="w-3 shrink-0" />
        )}

        <FileIcon type={item.type} isOpen={isOpen} />

        <span className="truncate text-[10px] font-medium">
          {item.name}
        </span>

        {isSelected && (
          <span
            className="ml-auto h-1 w-1 shrink-0 rounded-full bg-[#D4AF37]"
            aria-hidden="true"
          />
        )}
      </button>

      {isFolder && isOpen && item.children?.length ? (
        <div>
          {item.children.map((child) => (
            <FileTreeItem
              key={child.path}
              item={child}
              depth={depth + 1}
              selectedFile={selectedFile}
              onFileSelect={onFileSelect}
              expandedPaths={expandedPaths}
              onToggleFolder={onToggleFolder}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

export default function FileExplorer({
  files,
  projectName = "Generated Project",
  onFileSelect,
  selectedFile,
}: FileExplorerProps) {
  const fileTree = useMemo(() => buildFileTree(files), [files]);

  const [manuallyExpanded, setManuallyExpanded] = useState<
    Set<string>
  >(() => new Set());

  const [manuallyCollapsed, setManuallyCollapsed] = useState<
    Set<string>
  >(() => new Set());

  const normalizedSelectedFile = selectedFile
    ? normalizePath(selectedFile)
    : "";

  const selectedParentPaths = useMemo(() => {
    if (!normalizedSelectedFile) return [];

    const parts = normalizedSelectedFile.split("/");
    const paths: string[] = [];

    for (let index = 1; index < parts.length; index++) {
      paths.push(parts.slice(0, index).join("/"));
    }

    return paths;
  }, [normalizedSelectedFile]);

  const expandedPaths = useMemo(() => {
    const result = new Set<string>();

    function addInitiallyOpenFolders(items: TreeItem[]) {
      for (const item of items) {
        if (
          item.type === "folder" &&
          item.path.split("/").length === 1
        ) {
          result.add(item.path);
        }

        if (item.children) {
          addInitiallyOpenFolders(item.children);
        }
      }
    }

    addInitiallyOpenFolders(fileTree);

    for (const path of selectedParentPaths) {
      result.add(path);
    }

    for (const path of manuallyExpanded) {
      result.add(path);
    }

    for (const path of manuallyCollapsed) {
      result.delete(path);
    }

    return result;
  }, [
    fileTree,
    selectedParentPaths,
    manuallyExpanded,
    manuallyCollapsed,
  ]);

  const handleToggleFolder = useCallback((path: string) => {
    setManuallyExpanded((previous) => {
      const next = new Set(previous);

      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }

      return next;
    });

    setManuallyCollapsed((previous) => {
      const next = new Set(previous);

      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }

      return next;
    });
  }, []);

  const folderCount = useMemo(() => {
    let count = 0;

    function countFolders(items: TreeItem[]) {
      for (const item of items) {
        if (item.type === "folder") {
          count += 1;
          if (item.children) countFolders(item.children);
        }
      }
    }

    countFolders(fileTree);
    return count;
  }, [fileTree]);

  const fileCount = files.filter(
    (file) => normalizePath(file.path).length > 0
  ).length;

  return (
    <div className="flex h-full min-h-0 flex-col bg-[#0A0A0C]">
      {/* Project header */}
      <div className="flex shrink-0 items-center justify-between gap-2 border-b border-zinc-800/60 px-3 py-3">
        <div className="flex min-w-0 items-center gap-2">
          <Package
            className="h-3.5 w-3.5 shrink-0 text-[#D4AF37]/80"
            strokeWidth={1.7}
            aria-hidden="true"
          />

          <span className="text-[9px] font-semibold uppercase tracking-[0.12em] text-zinc-500">
            Project files
          </span>
        </div>

        <span className="max-w-[110px] truncate text-[9px] text-zinc-600">
          {projectName}
        </span>
      </div>

      {/* File tree */}
      <div
        className="min-h-0 flex-1 overflow-y-auto px-1.5 py-2 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-zinc-800"
        role="tree"
        aria-label={`${projectName} files`}
      >
        {fileTree.length === 0 ? (
          <div className="flex h-full min-h-[160px] flex-col items-center justify-center px-4 text-center">
            <Folder
              className="h-7 w-7 text-zinc-700"
              strokeWidth={1.4}
              aria-hidden="true"
            />

            <p className="mt-3 text-xs font-medium text-zinc-400">
              No project files
            </p>

            <p className="mt-1 text-[10px] leading-5 text-zinc-600">
              Generated files will appear here.
            </p>
          </div>
        ) : (
          <FileTreeItem
            item={{
              name: projectName,
              path: "",
              type: "folder",
              children: fileTree,
            }}
            selectedFile={normalizedSelectedFile}
            onFileSelect={onFileSelect}
            expandedPaths={expandedPaths}
            onToggleFolder={handleToggleFolder}
          />
        )}
      </div>

      {/* Bottom status */}
      <div className="shrink-0 border-t border-zinc-800/60 px-3 py-2.5">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[8px] text-zinc-600">
            {fileCount} {fileCount === 1 ? "file" : "files"}
            <span className="mx-1.5 text-zinc-800">·</span>
            {folderCount} {folderCount === 1 ? "folder" : "folders"}
          </span>

          <span className="flex items-center gap-1.5 text-[8px] text-zinc-500">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400/70" />
            Local files
          </span>
        </div>
      </div>
    </div>
  );
}