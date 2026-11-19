"use client";

import Link from "next/link";
import type { ComponentType } from "react";
import {
  BarChart3,
  Briefcase,
  Download,
  FileText,
  Folder,
  FolderGit2,
  LayoutGrid,
  Lightbulb,
  ListChecks,
  Menu,
  MessageSquare,
  MoreHorizontal,
  Music,
  Search,
  SquarePlus,
} from "lucide-react";

type RailIcon = {
  key: string;
  label: string;
  Icon: ComponentType<{ className?: string; strokeWidth?: number | string }>;
  /** Navigation destination. Absent = disabled "coming soon" icon. */
  href?: string;
  /** New-chat action (the "+" icon). */
  onClick?: () => void;
};

type IconRailProps = {
  /** Currently active section. Only "chat" exists in the AGI shell. */
  active?: "chat";
  onNewChat?: () => void;
};

/**
 * Left icon rail (~80 px, §2.2 of the AGI spec) — icons only, no labels,
 * in the same top-to-bottom order as the reference screenshot.
 *
 * Destinations: Chat → /agi, Generate → /generate, Workspace → /dashboard,
 * Settings → /settings, "+" → new chat. Every other icon has no ANVIX
 * destination yet, so it renders disabled/greyed with title "coming soon"
 * and never links anywhere (no dead `#` links).
 */
export default function IconRail({
  active = "chat",
  onNewChat,
}: IconRailProps) {
  const topIcons: RailIcon[] = [
    { key: "chat", label: "Chat", Icon: MessageSquare, href: "/agi" },
    { key: "search", label: "Search — coming soon", Icon: Search },
    { key: "notes", label: "Notes — coming soon", Icon: FileText },
    { key: "ideas", label: "Ideas — coming soon", Icon: Lightbulb },
    { key: "tasks", label: "Tasks — coming soon", Icon: ListChecks },
    { key: "generate", label: "Generate", Icon: LayoutGrid, href: "/generate" },
  ];

  const middleIcons: RailIcon[] = [
    { key: "stats", label: "Stats — coming soon", Icon: BarChart3 },
    { key: "music", label: "Music — coming soon", Icon: Music },
    { key: "workspace", label: "Workspace", Icon: Folder, href: "/dashboard" },
    { key: "folder", label: "Files — coming soon", Icon: Folder },
    { key: "work", label: "Work — coming soon", Icon: Briefcase },
    { key: "projects", label: "Projects — coming soon", Icon: FolderGit2 },
    {
      key: "new",
      label: "New chat",
      Icon: SquarePlus,
      onClick: onNewChat,
    },
  ];

  const bottomIcons: RailIcon[] = [
    { key: "download", label: "Downloads — coming soon", Icon: Download },
    { key: "settings", label: "Settings", Icon: Menu, href: "/settings" },
  ];

  const renderIcon = ({ key, label, Icon, href, onClick }: RailIcon) => {
    const isActive = key === active;
    const disabled = !href && !onClick;

    const className = `
      flex h-9 w-9 items-center justify-center rounded-full
      transition-colors
      ${
        isActive
          ? "bg-[#2A2A2C] text-[#EDEDED]"
          : disabled
            ? "cursor-not-allowed text-[#8A8A8A]/40"
            : "text-[#8A8A8A] hover:bg-white/[0.06] hover:text-[#EDEDED]"
      }
    `;

    const icon = <Icon className="h-5 w-5" strokeWidth={1.8} />;

    if (href) {
      return (
        <Link
          key={key}
          href={href}
          aria-label={label}
          aria-current={isActive ? "page" : undefined}
          title={label}
          className={className}
        >
          {icon}
        </Link>
      );
    }

    return (
      <button
        key={key}
        type="button"
        onClick={onClick}
        disabled={disabled}
        aria-label={label}
        title={label}
        className={className}
      >
        {icon}
      </button>
    );
  };

  return (
    <nav
      aria-label="AGI sections"
      className="flex h-full w-[80px] shrink-0 flex-col items-center overflow-y-auto bg-[#181819] py-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
    >
      <div className="flex flex-col items-center gap-4">
        {topIcons.map(renderIcon)}
      </div>

      <div
        aria-hidden="true"
        className="my-4 h-px w-8 bg-white/[0.08]"
      />

      <div className="flex flex-col items-center gap-4">
        {middleIcons.map(renderIcon)}
      </div>

      <div className="flex flex-col items-center gap-4 pt-4">
        <button
          type="button"
          disabled
          aria-label="More — coming soon"
          title="More — coming soon"
          className="flex h-9 w-9 cursor-not-allowed items-center justify-center rounded-full text-[#8A8A8A]/40"
        >
          <MoreHorizontal className="h-5 w-5" strokeWidth={1.8} />
        </button>
      </div>

      <div className="mt-auto flex flex-col items-center gap-4 pt-4">
        {bottomIcons.map(renderIcon)}
      </div>
    </nav>
  );
}
