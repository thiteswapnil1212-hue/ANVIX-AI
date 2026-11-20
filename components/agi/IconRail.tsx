"use client";

import Link from "next/link";
import type { ComponentType, ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import {
  Folder,
  FolderGit2,
  FolderOpen,
  LayoutGrid,
  MessageSquare,
  Search,
  Settings,
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
  /** Currently active section. */
  active?: "chat" | "generate" | "workspace" | "projects" | "settings";
  onNewChat?: () => void;
};

const GENERATED_PROJECT_STORAGE_KEY = "anvix.generatedProject";

/**
 * Slug for a stored project name — mirrors `createProjectSlug` in
 * `app/generate/page.tsx`, which is what produced the workspace route
 * at generation time.
 */
function createProjectSlug(projectName: string) {
  const slug = projectName
    .normalize("NFKD")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80)
    .replace(/-+$/g, "");

  return slug || "anvix-generated";
}

/**
 * Left icon rail (~80 px, §2.2 of the AGI spec) — icons only, no labels.
 * Hybrid rail (§4.1 of the AGI/dashboard spec): 8 icons — the live
 * sections plus two honest placeholders (Search, Files) for real
 * near-term features. Dead icons with no destination and no roadmap
 * date are hidden, not disabled; they return when the feature ships.
 * Hovering (or focusing) an icon shows a visible tooltip with its name,
 * next to the native `title` tooltip.
 *
 * Destinations: Chat → /agi, Generate → /generate, Projects →
 * /dashboard, Workspace → the last opened workspace
 * (`/workspace/<slug>` from `anvix.generatedProject`, else
 * `/dashboard`; disabled "coming soon" only when no project was ever
 * generated), Settings → /settings, "+" → new chat. Search and Files
 * have no destination yet, so they render disabled/greyed with title
 * "coming soon" and never link anywhere (no dead `#` links).
 */
export default function IconRail({
  active = "chat",
  onNewChat,
}: IconRailProps) {
  // Visible hover tooltip: a single bubble rendered as a sibling of the
  // rail (not inside it — the rail scrolls, which would clip a tooltip
  // positioned inside it). Positioned at the hovered icon's centre.
  const wrapRef = useRef<HTMLDivElement>(null);
  const [tooltip, setTooltip] = useState<{
    label: string;
    top: number;
  } | null>(null);

  // Last opened workspace. Defaults to the Projects list until storage
  // has been read; becomes null (disabled "coming soon") only when no
  // project was ever generated.
  const [workspaceHref, setWorkspaceHref] = useState<string | null>(
    "/dashboard"
  );

  useEffect(() => {
    try {
      const stored = localStorage.getItem(
        GENERATED_PROJECT_STORAGE_KEY
      );

      // No stored project at all — the Workspace slot stays disabled.
      if (!stored) {
        // eslint-disable-next-line react-hooks/set-state-in-effect -- browser storage is an external system that only exists after mount; lazy init would break hydration
        setWorkspaceHref(null);
        return;
      }

      const parsed: unknown = JSON.parse(stored);
      const name =
        parsed && typeof parsed === "object"
          ? (parsed as { name?: unknown }).name
          : undefined;

      // Stored project without a usable name — fall back to Projects.
      if (typeof name !== "string" || !name.trim()) {
        setWorkspaceHref("/dashboard");
        return;
      }

      setWorkspaceHref(`/workspace/${createProjectSlug(name)}`);
    } catch {
      // Storage unavailable or unreadable — fall back to Projects.
      setWorkspaceHref("/dashboard");
    }
  }, []);

  const showTooltip =
    (label: string) =>
    (event: { currentTarget: Element }) => {
      const wrap = wrapRef.current;
      if (!wrap) return;
      const wrapRect = wrap.getBoundingClientRect();
      const iconRect = event.currentTarget.getBoundingClientRect();
      setTooltip({
        label,
        top: iconRect.top - wrapRect.top + iconRect.height / 2,
      });
    };

  const hideTooltip = () => setTooltip(null);
  const topIcons: RailIcon[] = [
    { key: "chat", label: "Chat", Icon: MessageSquare, href: "/agi" },
    { key: "search", label: "Search — coming soon", Icon: Search },
    { key: "generate", label: "Generate", Icon: LayoutGrid, href: "/generate" },
  ];

  const middleIcons: RailIcon[] = [
    { key: "projects", label: "Projects", Icon: FolderGit2, href: "/dashboard" },
    {
      key: "workspace",
      label:
        workspaceHref === null
          ? "Workspace — coming soon"
          : "Workspace",
      Icon: FolderOpen,
      ...(workspaceHref ? { href: workspaceHref } : {}),
    },
    { key: "folder", label: "Files — coming soon", Icon: Folder },
    {
      key: "new",
      label: "New chat",
      Icon: SquarePlus,
      onClick: onNewChat,
    },
  ];

  const bottomIcons: RailIcon[] = [
    { key: "settings", label: "Settings", Icon: Settings, href: "/settings" },
  ];

  const renderIcon = ({ key, label, Icon, href, onClick }: RailIcon) => {
    const isActive = key === active;
    const disabled = !href && !onClick;

    const className = `
      flex h-9 w-9 items-center justify-center rounded-full
      transition-colors
      ${
        isActive
          ? "bg-surface-active text-ink"
          : disabled
            ? "cursor-not-allowed text-icon/25 opacity-50"
            : "text-icon hover:bg-white/[0.06] hover:text-ink"
      }
    `;

    const icon = <Icon className="h-5 w-5" strokeWidth={1.8} />;

    // Hover handlers live on this wrapper, not on the link/button:
    // disabled buttons never fire mouse events, so a tooltip attached
    // to a disabled "coming soon" icon would never appear.
    const wrap = (inner: ReactNode) => (
      <span
        key={key}
        onMouseEnter={showTooltip(label)}
        onMouseLeave={hideTooltip}
        onFocus={showTooltip(label)}
        onBlur={hideTooltip}
        className="block"
      >
        {inner}
      </span>
    );

    if (href) {
      return wrap(
        <Link
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

    return wrap(
      <button
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
    <div ref={wrapRef} className="relative h-full">
      <nav
        aria-label="AGI sections"
        className="flex h-full w-[80px] shrink-0 flex-col items-center overflow-y-auto bg-app-bg py-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
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

      <div className="mt-auto flex flex-col items-center gap-4 pt-4">
        {bottomIcons.map(renderIcon)}
      </div>
      </nav>

      {/* Visible hover tooltip — sits to the right of the rail. */}
      {tooltip && (
        <div
          aria-hidden="true"
          style={{ top: tooltip.top }}
          className="pointer-events-none absolute left-[calc(100%+10px)] z-50 -translate-y-1/2 whitespace-nowrap rounded-lg border border-white/10 bg-surface-active px-2.5 py-1.5 text-xs text-ink shadow-lg"
        >
          {tooltip.label}
        </div>
      )}
    </div>
  );
}
