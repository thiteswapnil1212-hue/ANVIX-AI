import type { ReactNode } from "react";
import Navbar from "@/components/layout/Navbar";

interface AppShellProps {
  children: ReactNode;
}

export default function AppShell({ children }: AppShellProps) {
  return (
    <div className="flex min-h-screen flex-col bg-[#090909] text-white">
      <Navbar />

      <main className="flex-1 overflow-hidden">
        {children}
      </main>
    </div>
  );
}