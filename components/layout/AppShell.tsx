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
      {/* Background video */}
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

      {/* Subtle video overlay */}
      <div
        className="
          pointer-events-none
          absolute
          inset-0
          z-0
          bg-black/[0.18]
        "
      />

      {/* Navbar */}
      <div className="relative z-50 shrink-0">
        <Navbar />
      </div>

      {/* Scrollable Content */}
      <main
        className="
          relative
          z-10
          min-h-0
          flex-1
          overflow-y-auto
          overflow-x-hidden
        "
      >
        {children}
      </main>
    </div>
  );
}