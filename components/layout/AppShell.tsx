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
    <div className="relative min-h-screen w-full bg-[#09090B] text-white">
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
      <div className="relative z-50">
        <Navbar />
      </div>

      {/* Page content */}
      <main className="relative z-10 w-full">
        {children}
      </main>
    </div>
  );
}