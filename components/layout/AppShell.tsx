"use client";

import type { ReactNode } from "react";
import Navbar from "@/components/layout/Navbar";

interface AppShellProps {
  children: ReactNode;
  title?: string;
  description?: string;
}

/**
 * The marketing shell: flat #181819 canvas + Navbar, no video, no gold
 * glow (§5 of the design-system spec). Used by Home, Pricing and the
 * legal pages. Product pages use ProductShell (rail + header) instead.
 */
export default function AppShell({
  children,
  title,
  description,
}: AppShellProps) {
  return (
    <div className="relative isolate flex min-h-screen w-full flex-col overflow-x-clip bg-app-bg text-ink">
      {/* Site navigation */}
      <Navbar />

      {/* Main page */}
      <main className="relative z-0 flex w-full flex-1 flex-col">
        {(title || description) && (
          <div className="sr-only">
            {title && <h1>{title}</h1>}
            {description && <p>{description}</p>}
          </div>
        )}

        {children}
      </main>
    </div>
  );
}
