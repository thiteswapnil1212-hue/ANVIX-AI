import Image from "next/image";
import Link from "next/link";

const links = [
  { href: "/generate", label: "Generate" },
  { href: "/chat", label: "Chat" },
  { href: "/dashboard", label: "Projects" },
  { href: "/pricing", label: "Pricing" },
];

export default function Navbar() {
  return (
    <header className="sticky top-0 z-50 border-b border-zinc-800 bg-[#090909]">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
        {/* Left */}
        <Link href="/" className="flex items-center gap-3">
          <Image
            src="/logo.png"
            alt="ANVIX AI Logo"
            width={48}
            height={48}
            className="h-12 w-12 object-contain"
            priority
          />
          <span className="text-lg font-semibold tracking-tight text-white">
            ANVIX AI
          </span>
        </Link>

        {/* Center */}
        <nav className="hidden flex-1 justify-center md:flex">
          <div className="flex items-center gap-8">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-sm font-medium text-zinc-400 transition-colors hover:text-white"
              >
                {link.label}
              </Link>
            ))}
          </div>
        </nav>

        {/* Right */}
        <Link
          href="/settings"
          className="rounded-lg border border-zinc-700 px-4 py-2 text-sm font-medium text-white transition-colors hover:border-white"
        >
          Settings
        </Link>
      </div>
    </header>
  );
}