import type { ReactNode } from "react";
import Navbar from "@/components/layout/Navbar";

interface AppShellProps {
  children: ReactNode;
  title?: string;
  description?: string;
  action?: ReactNode;
}

export default function AppShell({ children, title, description, action }: AppShellProps) {
  return (
    <div className="min-h-screen bg-[#090909] text-white">
      <Navbar />

      <main className="mx-auto w-full max-w-7xl px-6 py-8 sm:px-8 lg:px-10">
        {(title || description || action) ? (
          <header className="mb-8 flex flex-col gap-4 rounded-3xl border border-zinc-800/80 bg-[#111111]/80 p-6 backdrop-blur-xl md:flex-row md:items-end md:justify-between">
            <div>
              {title ? <h1 className="text-2xl font-semibold text-white">{title}</h1> : null}
              {description ? <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-400">{description}</p> : null}
            </div>
            {action ? <div className="shrink-0">{action}</div> : null}
          </header>
        ) : null}

        {children}
      </main>
    </div>
  );
}
