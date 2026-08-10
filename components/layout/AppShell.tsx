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
    <div className="flex min-h-screen bg-[#09090B] text-white">
      <Navbar />

      <main className="flex-1 overflow-hidden">
        {children}
      </main>
    </div>
  );
}