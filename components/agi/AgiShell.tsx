"use client";

import type { ReactNode } from "react";
import { useEffect } from "react";

type AgiShellProps = {
  /** Left icon rail (§2.2). Hidden below the md breakpoint. */
  rail: ReactNode;
  /** Centre column: header + messages + input (owned by ChatLayout). */
  center: ReactNode;
  /** Right panel content (ApprovalsPanel). */
  panel: ReactNode;
  /** Thread-list drawer content (ChatSidebar). */
  drawer: ReactNode;
  /** Right panel visibility on desktop. Closed by default — the header
   * toggle opens it — so the chat column is not squeezed. */
  panelOpen: boolean;
  /** Right panel visibility on mobile (slide-over, opened by its toggle). */
  mobilePanelOpen: boolean;
  /** Thread drawer visibility (slide-over from the left, D5). */
  drawerOpen: boolean;
  onClosePanel: () => void;
  onCloseDrawer: () => void;
};

/**
 * The Muse-style 3-pane AGI shell (§2.1 of the spec): ~80 px icon rail +
 * centre chat column + ~420 px right panel, on one `#181819` canvas.
 *
 * Responsive rules: below md the rail is hidden (the header pill opens the
 * thread drawer instead); below lg the right panel is hidden behind its
 * toggle and opens as a right slide-over. The three panes are never
 * squeezed onto a phone at once.
 */
export default function AgiShell({
  rail,
  center,
  panel,
  drawer,
  panelOpen,
  mobilePanelOpen,
  drawerOpen,
  onClosePanel,
  onCloseDrawer,
}: AgiShellProps) {
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
        onCloseDrawer();
      } else {
        onClosePanel();
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [drawerOpen, panelOpen, mobilePanelOpen, onCloseDrawer, onClosePanel]);

  return (
    <div className="agi flex h-dvh w-full overflow-hidden bg-[#181819] text-[#EDEDED]">
      {/* LEFT ICON RAIL — hidden on mobile */}
      <div className="hidden shrink-0 border-r border-white/[0.07] md:block">
        {rail}
      </div>

      {/* CENTRE COLUMN */}
      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        {center}
      </div>

      {/* RIGHT PANEL — desktop */}
      {panelOpen && (
        <aside className="hidden w-[340px] shrink-0 border-l border-white/[0.07] lg:block xl:w-[420px]">
          {panel}
        </aside>
      )}

      {/* RIGHT PANEL — mobile slide-over (only when explicitly opened) */}
      {mobilePanelOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-black/50"
            onClick={onClosePanel}
          />

          <aside className="absolute inset-y-0 right-0 w-[min(420px,92vw)] border-l border-white/10 bg-[#181819] shadow-[-16px_0_45px_rgba(0,0,0,0.5)] animate-in slide-in-from-right duration-200">
            {panel}
          </aside>
        </div>
      )}

      {/* THREAD DRAWER — slide-over from the left */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50">
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-black/50"
            onClick={onCloseDrawer}
          />

          <aside className="absolute inset-y-0 left-0 w-[320px] max-w-[85vw] border-r border-white/10 bg-[#181819] shadow-[16px_0_45px_rgba(0,0,0,0.5)] animate-in slide-in-from-left duration-200">
            {drawer}
          </aside>
        </div>
      )}
    </div>
  );
}
