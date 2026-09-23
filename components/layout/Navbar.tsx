
"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LogIn,
  Menu,
  X,
  ChevronRight,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";

const links = [
  { href: "/generate", label: "Generate" },
  { href: "/chat", label: "Chat" },
  { href: "/dashboard", label: "Projects" },
  { href: "/pricing", label: "Pricing" },
];

export default function Navbar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const isAuthPage = pathname === "/auth";

  const closeMenu = useCallback(() => {
    setMobileOpen(false);
  }, []);

  const isActive = useCallback(
    (href: string) => {
      if (href === "/dashboard") {
        return (
          pathname === "/dashboard" ||
          pathname.startsWith("/dashboard/")
        );
      }

      return pathname === href;
    },
    [pathname]
  );

  // Close the mobile menu after route changes.
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  // Escape key closes the mobile menu.
  useEffect(() => {
    if (!mobileOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeMenu();
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [mobileOpen, closeMenu]);

  // Prevent background scrolling while the menu is open.
  useEffect(() => {
    if (!mobileOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [mobileOpen]);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-white/[0.08] bg-black/75 shadow-[0_8px_30px_rgba(0,0,0,0.18)] backdrop-blur-xl backdrop-saturate-150">
      <div className="mx-auto flex h-[68px] max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Brand */}
        <Link
          href="/"
          onClick={closeMenu}
          aria-label="ANVIX AI home"
          className="group flex shrink-0 items-center gap-2.5 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D4AF37]/70"
        >
          <Image
            src="/logo.png"
            alt=""
            width={40}
            height={40}
            priority
            className="h-9 w-9 object-contain transition-transform duration-200 group-hover:scale-105 sm:h-10 sm:w-10"
          />

          <span className="text-[16px] font-semibold tracking-tight text-white sm:text-[17px]">
            ANVIX <span className="text-[#D4AF37]">AI</span>
          </span>
        </Link>

        {/* Desktop Navigation */}
        <nav
          aria-label="Main navigation"
          className="absolute left-1/2 hidden -translate-x-1/2 md:block"
        >
          <div className="flex items-center gap-1 rounded-xl border border-white/[0.08] bg-white/[0.025] p-1">
            {links.map((link) => {
              const active = isActive(link.href);

              return (
                <Link
                  key={link.href}
                  href={link.href}
                  aria-current={active ? "page" : undefined}
                  className={`relative rounded-lg px-4 py-2 text-[13px] font-medium transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#D4AF37]/70 ${
                    active
                      ? "bg-white/[0.09] text-white"
                      : "text-zinc-400 hover:bg-white/[0.045] hover:text-white"
                  }`}
                >
                  {link.label}

                  {active && (
                    <span
                      aria-hidden="true"
                      className="absolute bottom-0 left-1/2 h-px w-5 -translate-x-1/2 bg-[#D4AF37]"
                    />
                  )}
                </Link>
              );
            })}
          </div>
        </nav>

        {/* Desktop Sign In */}
        <Link
          href="/auth"
          aria-current={isAuthPage ? "page" : undefined}
          className="hidden items-center gap-2 rounded-lg border border-[#D4AF37]/40 bg-[#D4AF37] px-4 py-2 text-[13px] font-semibold text-black transition-colors hover:bg-[#E5C65C] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D4AF37]/70 focus-visible:ring-offset-2 focus-visible:ring-offset-black md:flex"
        >
          <LogIn className="h-4 w-4" aria-hidden="true" strokeWidth={1.8} />
          <span>Sign In</span>
        </Link>

        {/* Mobile Menu Toggle */}
        <button
          type="button"
          onClick={() => setMobileOpen((open) => !open)}
          className="flex h-10 w-10 items-center justify-center rounded-lg border border-white/[0.10] bg-white/[0.035] text-zinc-300 transition-colors hover:border-white/[0.18] hover:bg-white/[0.07] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D4AF37]/70 md:hidden"
          aria-label={mobileOpen ? "Close navigation" : "Open navigation"}
          aria-expanded={mobileOpen}
          aria-controls="mobile-navigation"
        >
          {mobileOpen ? (
            <X className="h-5 w-5" aria-hidden="true" strokeWidth={1.8} />
          ) : (
            <Menu className="h-5 w-5" aria-hidden="true" strokeWidth={1.8} />
          )}
        </button>
      </div>

      {/* Mobile Navigation */}
      <div
        id="mobile-navigation"
        aria-hidden={!mobileOpen}
        className={`grid overflow-hidden border-t border-white/[0.07] bg-black/95 transition-[grid-template-rows,opacity] duration-200 motion-reduce:transition-none md:hidden ${
          mobileOpen
            ? "grid-rows-[1fr] opacity-100"
            : "pointer-events-none grid-rows-[0fr] opacity-0"
        }`}
      >
        <div className="min-h-0">
          <nav aria-label="Mobile navigation" className="px-4 py-3 sm:px-6">
            <div className="rounded-2xl border border-white/[0.09] bg-white/[0.02] p-2 shadow-[0_15px_40px_rgba(0,0,0,0.25)]">
              <div className="space-y-1">
                {links.map((link) => {
                  const active = isActive(link.href);

                  return (
                    <Link
                      key={link.href}
                      href={link.href}
                      aria-current={active ? "page" : undefined}
                      tabIndex={mobileOpen ? 0 : -1}
                      onClick={closeMenu}
                      className={`flex min-h-12 items-center justify-between rounded-xl px-4 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#D4AF37]/70 ${
                        active
                          ? "bg-white/[0.08] text-white"
                          : "text-zinc-400 hover:bg-white/[0.045] hover:text-white"
                      }`}
                    >
                      <span>{link.label}</span>

                      <span className="flex items-center gap-2">
                        {active && (
                          <span
                            aria-hidden="true"
                            className="h-1.5 w-1.5 rounded-full bg-[#D4AF37]"
                          />
                        )}

                        <ChevronRight
                          aria-hidden="true"
                          className={`h-4 w-4 transition-transform ${
                            active
                              ? "translate-x-0.5 text-[#D4AF37]"
                              : "text-zinc-600"
                          }`}
                          strokeWidth={1.8}
                        />
                      </span>
                    </Link>
                  );
                })}
              </div>

              {/* Mobile Sign In */}
              <div className="mt-2 border-t border-white/[0.07] pt-2">
                <Link
                  href="/auth"
                  aria-current={isAuthPage ? "page" : undefined}
                  tabIndex={mobileOpen ? 0 : -1}
                  onClick={closeMenu}
                  className="flex min-h-12 items-center justify-between rounded-xl bg-[#D4AF37]/10 px-4 text-sm font-semibold text-[#D4AF37] transition-colors hover:bg-[#D4AF37]/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#D4AF37]/70"
                >
                  <span className="flex items-center gap-2.5">
                    <LogIn
                      aria-hidden="true"
                      className="h-4 w-4"
                      strokeWidth={1.8}
                    />
                    Sign In
                  </span>

                  <ChevronRight
                    aria-hidden="true"
                    className="h-4 w-4 text-[#D4AF37]/70"
                    strokeWidth={1.8}
                  />
                </Link>
              </div>
            </div>
          </nav>
        </div>
      </div>

      {/* Backdrop: behind the header/menu, above page content */}
      {mobileOpen && (
        <button
          type="button"
          aria-label="Close navigation"
          tabIndex={-1}
          onClick={closeMenu}
          className="fixed inset-0 -z-10 bg-black/40 md:hidden"
        />
      )}
    </header>
  );
}