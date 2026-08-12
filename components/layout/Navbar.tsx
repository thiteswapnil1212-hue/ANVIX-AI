"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Settings, Menu, X } from "lucide-react";
import { useState } from "react";

const links = [
  { href: "/generate", label: "Generate" },
  { href: "/chat", label: "Chat" },
  { href: "/dashboard", label: "Projects" },
  { href: "/pricing", label: "Pricing" },
];

export default function Navbar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-white/[0.06] bg-[#090909]/90 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5 md:px-6">

        {/* Logo */}
        <Link
          href="/"
          className="flex items-center gap-2.5"
          onClick={() => setMobileOpen(false)}
        >
          <Image
            src="/logo.png"
            alt="ANVIX AI Logo"
            width={40}
            height={40}
            className="h-10 w-10 object-contain"
            priority
          />

          <span className="text-[17px] font-semibold tracking-tight text-white">
            ANVIX AI
          </span>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center">
          <div className="flex items-center gap-1 rounded-xl border border-white/[0.06] bg-white/[0.02] p-1">
            {links.map((link) => {
              const active = pathname === link.href;

              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`relative rounded-lg px-4 py-2 text-sm font-medium transition-all ${
                    active
                      ? "bg-white/[0.08] text-white"
                      : "text-zinc-400 hover:bg-white/[0.04] hover:text-white"
                  }`}
                >
                  {link.label}

                  {active && (
                    <span className="absolute inset-x-3 -bottom-[5px] h-px bg-white/70" />
                  )}
                </Link>
              );
            })}
          </div>
        </nav>

        {/* Desktop Settings */}
        <Link
          href="/settings"
          className={`hidden md:flex items-center gap-2 rounded-lg border px-3.5 py-2 text-sm font-medium transition-all ${
            pathname === "/settings"
              ? "border-white/20 bg-white/[0.08] text-white"
              : "border-white/[0.08] text-zinc-400 hover:border-white/20 hover:bg-white/[0.04] hover:text-white"
          }`}
        >
          <Settings className="h-4 w-4" />
          <span>Settings</span>
        </Link>

        {/* Mobile Menu Button */}
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="rounded-lg border border-white/[0.08] p-2 text-zinc-400 transition hover:bg-white/[0.05] hover:text-white md:hidden"
          aria-label="Toggle menu"
        >
          {mobileOpen ? (
            <X className="h-5 w-5" />
          ) : (
            <Menu className="h-5 w-5" />
          )}
        </button>
      </div>

      {/* Mobile Navigation */}
      {mobileOpen && (
        <div className="border-t border-white/[0.06] bg-[#090909] px-5 py-4 md:hidden">
          <nav className="flex flex-col gap-1">
            {links.map((link) => {
              const active = pathname === link.href;

              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileOpen(false)}
                  className={`rounded-lg px-4 py-3 text-sm font-medium transition ${
                    active
                      ? "bg-white/[0.08] text-white"
                      : "text-zinc-400 hover:bg-white/[0.04] hover:text-white"
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}

            <Link
              href="/settings"
              onClick={() => setMobileOpen(false)}
              className="mt-2 flex items-center gap-2 rounded-lg border border-white/[0.08] px-4 py-3 text-sm font-medium text-zinc-400 transition hover:bg-white/[0.04] hover:text-white"
            >
              <Settings className="h-4 w-4" />
              Settings
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
}