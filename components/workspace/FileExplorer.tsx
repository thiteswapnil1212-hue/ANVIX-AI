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
import { useState } from "react";

type FileType =
  | "folder"
  | "tsx"
  | "ts"
  | "json"
  | "css"
  | "md"
  | "image";

interface FileItem {
  name: string;
  type: FileType;
  children?: FileItem[];
}

const fileTree: FileItem[] = [
  {
    name: "app",
    type: "folder",
    children: [
      {
        name: "layout.tsx",
        type: "tsx",
      },
      {
        name: "page.tsx",
        type: "tsx",
      },
      {
        name: "globals.css",
        type: "css",
      },
    ],
  },
  {
    name: "components",
    type: "folder",
    children: [
      {
        name: "navbar.tsx",
        type: "tsx",
      },
      {
        name: "hero.tsx",
        type: "tsx",
      },
      {
        name: "footer.tsx",
        type: "tsx",
      },
    ],
  },
  {
    name: "public",
    type: "folder",
    children: [
      {
        name: "logo.png",
        type: "image",
      },
    ],
  },
  {
    name: "package.json",
    type: "json",
  },
  {
    name: "README.md",
    type: "md",
  },
];

interface FileExplorerProps {
  onFileSelect?: (fileName: string) => void;
  selectedFile?: string;
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
  item: FileItem;
  depth?: number;
  selectedFile?: string;
  onFileSelect?: (fileName: string) => void;
}) {
  const [isOpen, setIsOpen] = useState(depth < 1);

  const isFolder = item.type === "folder";
  const isSelected = selectedFile === item.name;

  function handleClick() {
    if (isFolder) {
      setIsOpen((current) => !current);
      return;
    }

    onFileSelect?.(item.name);
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
              key={`${item.name}/${child.name}`}
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
  onFileSelect,
  selectedFile,
}: FileExplorerProps) {
  const [activeFile, setActiveFile] = useState(
    selectedFile ?? "page.tsx"
  );

  function handleFileSelect(fileName: string) {
    setActiveFile(fileName);
    onFileSelect?.(fileName);
  }

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
        {fileTree.map((item) => (
          <FileTreeItem
            key={item.name}
            item={item}
            selectedFile={activeFile}
            onFileSelect={handleFileSelect}
          />
        ))}
      </div>

      {/* Bottom status */}
      <div className="shrink-0 border-t border-zinc-800/60 px-3 py-2.5">
        <div className="flex items-center justify-between">
          <span className="text-[8px] text-zinc-700">
            10 files
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