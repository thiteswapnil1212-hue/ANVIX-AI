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
    <div className="flex min-h-screen flex-col bg-[#09090B] text-white">
      <Navbar />

      <main className="flex min-h-0 flex-1 overflow-hidden">
        {children}
      </main>
    </div>
  );
}