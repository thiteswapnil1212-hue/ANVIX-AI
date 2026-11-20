"use client";

import type { ReactNode } from "react";
import { useEffect } from "react";

type ProductShellProps = {
  /** Left icon rail (80 px, hidden below md). */
  rail: ReactNode;
  /** Centre column: header + content (owned by the page). */
  center: ReactNode;
  /** Right panel content. Absent on pages without a panel. */
  panel?: ReactNode | null;
  /** Left drawer content. Absent on pages without a drawer. */
  drawer?: ReactNode | null;
  /** Right panel visibility on desktop. Closed by default. */
  panelOpen?: boolean;
  /** Right panel visibility on mobile (slide-over, opened by its toggle). */
  mobilePanelOpen?: boolean;
  /** Drawer visibility (slide-over from the left). */
  drawerOpen?: boolean;
  onClosePanel?: () => void;
  onCloseDrawer?: () => void;
};

/**
 * The single product shell (§4 of the design-system spec): ~80 px icon
 * rail + centre column + optional right panel + optional left drawer, on
 * one #181819 canvas with the unified product tokens.
 *
 * Responsive rules: below md the rail is hidden; below lg the right panel
 * is hidden behind its toggle and opens as a right slide-over. The panes
 * are never squeezed onto a phone at once.
 *
 * AGI uses all four slots (via AgiShell, a thin wrapper around this);
 * Generate / Projects use rail + centre; Workspace uses rail + centre.
 */
export default function ProductShell({
  rail,
  center,
  panel = null,
  drawer = null,
  panelOpen = false,
  mobilePanelOpen = false,
  drawerOpen = false,
  onClosePanel,
  onCloseDrawer,
}: ProductShellProps) {
  // Escape closes the topmost overlay.
  useEffect(() => {
    if (!drawerOpen && !panelOpen && !mobilePanelOpen) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") {
        return;
      }

      if (drawerOpen) {
        onCloseDrawer?.();
      } else {
        onClosePanel?.();
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [drawerOpen, panelOpen, mobilePanelOpen, onCloseDrawer, onClosePanel]);

  return (
    <div className="flex h-dvh w-full overflow-hidden bg-app-bg text-ink">
      {/* LEFT ICON RAIL — hidden on mobile */}
      <div className="hidden shrink-0 border-r border-border md:block">
        {rail}
      </div>

      {/* CENTRE COLUMN */}
      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        {center}
      </div>

      {/* RIGHT PANEL — desktop */}
      {panel && panelOpen && (
        <aside className="hidden w-[340px] shrink-0 border-l border-border lg:block xl:w-[420px]">
          {panel}
        </aside>
      )}

      {/* RIGHT PANEL — mobile slide-over (only when explicitly opened) */}
      {panel && mobilePanelOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-black/50"
            onClick={onClosePanel}
          />

          <aside className="absolute inset-y-0 right-0 w-[min(420px,92vw)] border-l border-white/10 bg-app-bg shadow-[-16px_0_45px_rgba(0,0,0,0.5)] animate-in slide-in-from-right duration-200">
            {panel}
          </aside>
        </div>
      )}

      {/* DRAWER — slide-over from the left */}
      {drawer && drawerOpen && (
        <div className="fixed inset-0 z-50">
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-black/50"
            onClick={onCloseDrawer}
          />

          <aside className="absolute inset-y-0 left-0 w-[320px] max-w-[85vw] border-r border-white/10 bg-app-bg shadow-[16px_0_45px_rgba(0,0,0,0.5)] animate-in slide-in-from-left duration-200">
            {drawer}
          </aside>
        </div>
      )}
    </div>
  );
}
