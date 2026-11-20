"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowLeft } from "lucide-react";

type PageHeaderProps = {
  /** Section title shown in the pill (e.g. "Generate", "Projects"). */
  title: string;
  /** Optional muted subtitle next to the title (hidden on small screens). */
  subtitle?: string;
  /** Back destination for the "← ANVIX" pill. Defaults to home. */
  backHref?: string;
  /** Contextual actions on the right (buttons, toggles). */
  actions?: ReactNode;
};

/**
 * The shared 56 px product header (§4.2 of the design-system spec):
 * back/home pill + section title pill (blue dot) on the left, contextual
 * actions on the right. Same header on every product page — Generate,
 * Projects, Workspace, Dashboard, Settings — so moving between sections
 * changes content, never the chrome.
 */
export default function PageHeader({
  title,
  subtitle,
  backHref = "/",
  actions,
}: PageHeaderProps) {
  return (
    <header className="flex h-14 shrink-0 items-center justify-between gap-3 border-b border-border bg-app-bg px-3 sm:px-4">
      <div className="flex min-w-0 items-center gap-2">
        {/* Back / home pill — the standard home control. */}
        <Link
          href={backHref}
          aria-label="Back to ANVIX home"
          className="flex shrink-0 items-center gap-1.5 rounded-full bg-surface-2 px-3 py-1.5 text-sm font-medium text-ink transition-colors hover:bg-surface-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-action"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" strokeWidth={2} />
          <span>ANVIX</span>
        </Link>

        {/* Section title pill. */}
        <div className="flex min-w-0 items-center gap-2 rounded-full bg-surface-2 px-3 py-1.5">
          <span
            aria-hidden="true"
            className="h-2 w-2 shrink-0 rounded-full bg-action"
          />
          <span className="truncate text-sm font-medium text-ink">
            {title}
          </span>
        </div>

        {subtitle && (
          <span className="hidden truncate text-sm text-ink-muted lg:block">
            {subtitle}
          </span>
        )}
      </div>

      {actions && (
        <div className="flex shrink-0 items-center gap-2">{actions}</div>
      )}
    </header>
  );
}
