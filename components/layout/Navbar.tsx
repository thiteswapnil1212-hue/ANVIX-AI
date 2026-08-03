import Link from "next/link";
import { Sparkles, Orbit } from "lucide-react";

const links = [
  { href: "/generate", label: "Generate App" },
  { href: "/chat", label: "AI Chat" },
  { href: "/dashboard", label: "Dashboard" },
  { href: "/pricing", label: "Pricing" },
  { href: "/settings", label: "Settings" },
];

export default function Navbar() {
  return (
    <header className="sticky top-0 z-50 border-b border-zinc-800/80 bg-[#090909]/90 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
        <Link href="/" className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#D4AF37] text-black">
            <Sparkles size={18} />
          </div>

          <div>
            <h1 className="text-lg font-semibold tracking-tight text-white">Anvix AI</h1>
            <p className="text-xs text-zinc-500">AI Software Engineering Platform</p>
          </div>
        </Link>

        <nav className="hidden items-center gap-6 text-sm text-zinc-400 md:flex">
          {links.map((link) => (
            <Link key={link.href} href={link.href} className="transition hover:text-white">
              {link.label}
            </Link>
          ))}
        </nav>

        <Link href="/dashboard" className="inline-flex items-center gap-2 rounded-full border border-zinc-700 bg-transparent px-4 py-2 text-sm text-white transition hover:border-[#D4AF37] hover:bg-[#D4AF37] hover:text-black">
          <Orbit className="h-4 w-4" />
          Profile
        </Link>
      </div>
    </header>
  );
}