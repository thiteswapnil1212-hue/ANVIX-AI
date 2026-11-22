
"use client";

import type { ReactNode } from "react";
import Navbar from "@/components/layout/Navbar";

interface AppShellProps {
  children: ReactNode;
  title?: string;
  description?: string;
}

export default function AppShell({
  children,
  title,
  description,
}: AppShellProps) {
  return (
    <div className="relative isolate flex min-h-screen w-full flex-col overflow-x-clip bg-[#09090B] text-white">
      {/* Cinematic background (static glows — the autoplaying video
          was removed: it lagged the app and cost 11.9 MB per load). */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-[#09090B]"
      >
        {/* Contrast layer for readable content */}
        <div className="absolute inset-0 bg-black/45" />

        {/* Subtle gold atmosphere */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(212,175,55,0.08),transparent_55%)]" />
      </div>

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