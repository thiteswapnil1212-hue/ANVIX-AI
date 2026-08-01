import { Sparkles, GitBranch } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Navbar() {
  return (
    <header className="sticky top-0 z-50 border-b border-zinc-800/80 bg-[#090909]/90 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">

        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#D4AF37] text-black">
            <Sparkles size={18} />
          </div>

          <div>
            <h1 className="text-lg font-semibold tracking-tight text-white">
              Anvix AI
            </h1>

            <p className="text-xs text-zinc-500">
              AI Software Engineering Platform
            </p>
          </div>
        </div>

        <nav className="hidden items-center gap-8 text-sm text-zinc-400 md:flex">
          <a href="#" className="transition hover:text-white">
            Workspace
          </a>

          <a href="#" className="transition hover:text-white">
            Templates
          </a>

          <a href="#" className="transition hover:text-white">
            Docs
          </a>
        </nav>

        <Button
          variant="outline"
          className="border-zinc-700 bg-transparent text-white hover:border-[#D4AF37] hover:bg-[#D4AF37] hover:text-black"
        >
          <GitBranch className="mr-2 h-4 w-4" />
          GitHub
        </Button>
      </div>
    </header>
  );
}