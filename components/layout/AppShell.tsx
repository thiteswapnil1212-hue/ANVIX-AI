import type { ReactNode } from "react";
import Navbar from "@/components/layout/Navbar";

interface AppShellProps {
  children: ReactNode;
  title?: string;
  description?: string;
}

export default function AppShell({
  children,
}: AppShellProps) {
  return (
    <div className="relative flex h-screen w-full flex-col overflow-hidden bg-[#09090B] text-white">
      {/* Global background video */}
      <video
        autoPlay
        loop
        muted
        playsInline
        preload="auto"
        className="
          pointer-events-none
          absolute
          inset-0
          z-0
          h-full
          w-full
          object-cover
        "
      >
        <source src="/anvix-bg.mp4" type="video/mp4" />
      </video>

      {/* Very subtle readability layer */}
      <div
        className="
          pointer-events-none
          absolute
          inset-0
          z-0
          bg-black/[0.08]
        "
      />

      {/* Navbar sits above video */}
      <div className="relative z-50 shrink-0">
        <Navbar />
      </div>

      {/* Page content */}
      <main className="relative z-10 flex min-h-0 flex-1 overflow-hidden">
        {children}
      </main>
    </div>
  );
}