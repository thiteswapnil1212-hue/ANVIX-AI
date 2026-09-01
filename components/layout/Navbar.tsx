"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Settings,
  Menu,
  X,
  ChevronRight,
} from "lucide-react";
import { useEffect, useState } from "react";

const links = [
  { href: "/generate", label: "Generate" },
  { href: "/chat", label: "Chat" },
  { href: "/dashboard", label: "Projects" },
  { href: "/pricing", label: "Pricing" },
];

export default function Navbar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!mobileOpen) return;

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMobileOpen(false);
      }
    };

    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener(
        "keydown",
        handleEscape
      );
    };
  }, [mobileOpen]);

  useEffect(() => {
    if (!mobileOpen) return;

    const originalOverflow =
      document.body.style.overflow;

    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow =
        originalOverflow;
    };
  }, [mobileOpen]);

  const isActive = (href: string) => {
    if (href === "/dashboard") {
      return (
        pathname === "/dashboard" ||
        pathname.startsWith("/dashboard/")
      );
    }

    return pathname === href;
  };

  return (
    <>
      <header
        className="
          sticky
          top-0
          z-50
          w-full
          border-b
          border-white/[0.08]
          bg-transparent
        "
      >
        <div
          className="
            mx-auto
            flex
            h-[68px]
            max-w-7xl
            items-center
            justify-between
            px-4
            sm:px-6
            lg:px-8
          "
        >
          {/* Logo */}

          <Link
            href="/"
            className="
              flex
              shrink-0
              items-center
              gap-2.5
              rounded-lg
              outline-none
              focus-visible:ring-2
              focus-visible:ring-[#D4AF37]/50
            "
            aria-label="ANVIX AI home"
          >
            <Image
              src="/logo.png"
              alt="ANVIX AI Logo"
              width={40}
              height={40}
              className="h-9 w-9 object-contain sm:h-10 sm:w-10"
              priority
            />

            <span className="text-[16px] font-semibold tracking-tight text-white sm:text-[17px]">
              ANVIX AI
            </span>
          </Link>

          {/* Desktop Navigation */}

          <nav
            className="
              absolute
              left-1/2
              hidden
              -translate-x-1/2
              md:block
            "
            aria-label="Main navigation"
          >
            <div
              className="
                flex
                items-center
                gap-1
                rounded-xl
                border
                border-white/[0.08]
                bg-transparent
                p-1
              "
            >
              {links.map((link) => {
                const active = isActive(link.href);

                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    aria-current={
                      active ? "page" : undefined
                    }
                    className={`
                      relative
                      rounded-lg
                      px-4
                      py-2
                      text-[13px]
                      font-medium
                      transition-colors
                      duration-200
                      ${
                        active
                          ? "bg-white/[0.08] text-white"
                          : "text-zinc-400 hover:bg-white/[0.035] hover:text-white"
                      }
                    `}
                  >
                    {link.label}

                    {active && (
                      <span
                        className="
                          absolute
                          bottom-0
                          left-1/2
                          h-px
                          w-5
                          -translate-x-1/2
                          bg-[#D4AF37]
                        "
                      />
                    )}
                  </Link>
                );
              })}
            </div>
          </nav>

          {/* Desktop Settings */}

          <Link
            href="/settings"
            className={`
              hidden
              items-center
              gap-2
              rounded-lg
              border
              px-3.5
              py-2
              text-[13px]
              font-medium
              transition-colors
              duration-200
              md:flex
              ${
                pathname === "/settings"
                  ? "border-white/[0.14] bg-white/[0.07] text-white"
                  : "border-white/[0.08] bg-transparent text-zinc-400 hover:bg-white/[0.035] hover:text-white"
              }
            `}
          >
            <Settings
              className="h-4 w-4"
              strokeWidth={1.8}
            />

            <span>Settings</span>
          </Link>

          {/* Mobile Button */}

          <button
            type="button"
            onClick={() =>
              setMobileOpen((open) => !open)
            }
            className="
              flex
              h-10
              w-10
              items-center
              justify-center
              rounded-lg
              border
              border-white/[0.10]
              bg-white/[0.025]
              text-zinc-300
              transition-colors
              hover:bg-white/[0.06]
              hover:text-white
              md:hidden
            "
            aria-label={
              mobileOpen
                ? "Close navigation"
                : "Open navigation"
            }
            aria-expanded={mobileOpen}
          >
            {mobileOpen ? (
              <X className="h-5 w-5" strokeWidth={1.8} />
            ) : (
              <Menu className="h-5 w-5" strokeWidth={1.8} />
            )}
          </button>
        </div>

        {/* Mobile Navigation */}

        <div
          className={`
            overflow-hidden
            border-t
            border-white/[0.07]
            bg-transparent
            transition-[max-height,opacity]
            duration-200
            md:hidden
            ${
              mobileOpen
                ? "max-h-[420px] opacity-100"
                : "max-h-0 opacity-0"
            }
          `}
        >
          <nav className="px-4 py-3 sm:px-6">
            <div className="rounded-2xl border border-white/[0.08] bg-black/[0.20] p-2 backdrop-blur-sm">
              <div className="space-y-1">
                {links.map((link) => {
                  const active = isActive(link.href);

                  return (
                    <Link
                      key={link.href}
                      href={link.href}
                      className={`
                        flex
                        min-h-12
                        items-center
                        justify-between
                        rounded-xl
                        px-4
                        text-sm
                        font-medium
                        transition-colors
                        ${
                          active
                            ? "bg-white/[0.08] text-white"
                            : "text-zinc-400 hover:bg-white/[0.04] hover:text-white"
                        }
                      `}
                    >
                      <span>{link.label}</span>

                      <span className="flex items-center gap-2">
                        {active && (
                          <span className="h-1.5 w-1.5 rounded-full bg-[#D4AF37]" />
                        )}

                        <ChevronRight
                          className="h-4 w-4 text-zinc-600"
                          strokeWidth={1.8}
                        />
                      </span>
                    </Link>
                  );
                })}
              </div>

              <div className="mt-2 border-t border-white/[0.07] pt-2">
                <Link
                  href="/settings"
                  className="
                    flex
                    min-h-12
                    items-center
                    justify-between
                    rounded-xl
                    px-4
                    text-sm
                    font-medium
                    text-zinc-400
                    transition-colors
                    hover:bg-white/[0.04]
                    hover:text-white
                  "
                >
                  <span className="flex items-center gap-2.5">
                    <Settings
                      className="h-4 w-4"
                      strokeWidth={1.8}
                    />
                    Settings
                  </span>

                  <ChevronRight
                    className="h-4 w-4 text-zinc-600"
                    strokeWidth={1.8}
                  />
                </Link>
              </div>
            </div>
          </nav>
        </div>
      </header>

      {/* Mobile backdrop */}

      {mobileOpen && (
        <button
          type="button"
          aria-label="Close navigation"
          onClick={() => setMobileOpen(false)}
          className="
            fixed
            inset-0
            z-40
            bg-black/[0.08]
            md:hidden
          "
        />
      )}
    </>
  );
}