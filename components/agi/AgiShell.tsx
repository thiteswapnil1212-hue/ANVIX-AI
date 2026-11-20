"use client";

import type { ReactNode } from "react";
import ProductShell from "@/components/layout/ProductShell";

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
 * The Muse-style 3-pane AGI shell (§2.1 of the AGI spec): ~80 px icon rail +
 * centre chat column + ~420 px right panel, on one `#181819` canvas.
 *
 * Thin wrapper around the shared ProductShell — the implementation lives
 * there so every product page shares one shell. Props and behaviour are
 * unchanged; ChatLayout needs no edits.
 */
export default function AgiShell(props: AgiShellProps) {
  return <ProductShell {...props} />;
}
