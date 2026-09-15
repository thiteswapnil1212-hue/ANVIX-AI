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
    <div className="relative flex min-h-screen w-full flex-col overflow-hidden bg-[#09090B] text-white">
      {/* Background video */}
      <video
        autoPlay
        loop
        muted
        playsInline
        preload="auto"
        className="
          pointer-events-none
          fixed
          inset-0
          z-0
          h-screen
          w-full
          object-cover
        "
      >
        <source src="/anvix-bg.mp4" type="video/mp4" />
      </video>

      {/* Background overlay */}
      <div
        className="
          pointer-events-none
          fixed
          inset-0
          z-0
          bg-black/[0.18]
        "
      />

      {/* Navbar */}
      <Navbar />

      {/* Page content */}
      <main className="relative z-10 flex min-h-0 flex-1 flex-col overflow-hidden">
        {children}
      </main>
    </div>
  );
}