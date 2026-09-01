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

  /* Close menu when route changes */
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  /* Close menu with Escape */
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

  /* Prevent page scroll while mobile menu is open */
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
      {/* =====================================================
          NAVBAR
      ===================================================== */}

      <header
        className="
          sticky
          top-0
          z-50
          w-full
          border-b
          border-white/[0.08]
          bg-black/[0.28]
          backdrop-blur-md
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
          {/* =================================================
              LOGO
          ================================================= */}

          <Link
            href="/"
            onClick={() => setMobileOpen(false)}
            className="
              group
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
              className="
                h-9
                w-9
                object-contain
                transition-transform
                duration-200
                group-hover:scale-[1.03]
                sm:h-10
                sm:w-10
              "
              priority
            />

            <span
              className="
                text-[16px]
                font-semibold
                tracking-tight
                text-white
                sm:text-[17px]
              "
            >
              ANVIX AI
            </span>
          </Link>

          {/* =================================================
              DESKTOP NAVIGATION
          ================================================= */}

          <nav
            className="
              absolute
              left-1/2
              hidden
              -translate-x-1/2
              items-center
              md:flex
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
                border-white/[0.09]
                bg-white/[0.035]
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
                          ? "bg-white/[0.09] text-white"
                          : "text-zinc-400 hover:bg-white/[0.045] hover:text-zinc-100"
                      }
                    `}
                  >
                    {link.label}

                    {active && (
                      <span
                        className="
                          absolute
                          bottom-[-1px]
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

          {/* =================================================
              DESKTOP SETTINGS
          ================================================= */}

          <Link
            href="/settings"
            aria-current={
              pathname === "/settings"
                ? "page"
                : undefined
            }
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
                  ? "border-white/[0.16] bg-white/[0.08] text-white"
                  : "border-white/[0.08] bg-white/[0.015] text-zinc-400 hover:border-white/[0.16] hover:bg-white/[0.045] hover:text-white"
              }
            `}
          >
            <Settings
              className="h-4 w-4"
              strokeWidth={1.8}
            />

            <span>Settings</span>
          </Link>

          {/* =================================================
              MOBILE MENU BUTTON
          ================================================= */}

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
              bg-white/[0.035]
              text-zinc-300
              transition-colors
              duration-200
              hover:border-white/[0.18]
              hover:bg-white/[0.06]
              hover:text-white
              focus-visible:outline-none
              focus-visible:ring-2
              focus-visible:ring-[#D4AF37]/50
              md:hidden
            "
            aria-label={
              mobileOpen
                ? "Close navigation"
                : "Open navigation"
            }
            aria-expanded={mobileOpen}
            aria-controls="mobile-navigation"
          >
            {mobileOpen ? (
              <X
                className="h-[19px] w-[19px]"
                strokeWidth={1.8}
              />
            ) : (
              <Menu
                className="h-[19px] w-[19px]"
                strokeWidth={1.8}
              />
            )}
          </button>
        </div>

        {/* ===================================================
            MOBILE MENU
        =================================================== */}

        <div
          id="mobile-navigation"
          className={`
            overflow-hidden
            border-t
            border-white/[0.07]
            bg-black/[0.32]
            backdrop-blur-md
            transition-[max-height,opacity]
            duration-200
            ease-out
            md:hidden
            ${
              mobileOpen
                ? "max-h-[420px] opacity-100"
                : "max-h-0 opacity-0"
            }
          `}
        >
          <nav
            className="
              mx-auto
              max-w-7xl
              px-4
              py-3
              sm:px-6
            "
            aria-label="Mobile navigation"
          >
            <div className="space-y-1">
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
                      flex
                      min-h-12
                      items-center
                      justify-between
                      rounded-xl
                      px-4
                      text-sm
                      font-medium
                      transition-colors
                      duration-150
                      ${
                        active
                          ? "bg-white/[0.08] text-white"
                          : "text-zinc-400 hover:bg-white/[0.045] hover:text-white"
                      }
                    `}
                  >
                    <span>{link.label}</span>

                    <span className="flex items-center gap-2">
                      {active && (
                        <span
                          className="
                            h-1.5
                            w-1.5
                            rounded-full
                            bg-[#D4AF37]
                          "
                        />
                      )}

                      <ChevronRight
                        className={
                          active
                            ? "h-4 w-4 text-zinc-400"
                            : "h-4 w-4 text-zinc-600"
                        }
                        strokeWidth={1.8}
                      />
                    </span>
                  </Link>
                );
              })}
            </div>

            {/* Mobile Settings */}
            <div className="mt-3 border-t border-white/[0.07] pt-3">
              <Link
                href="/settings"
                aria-current={
                  pathname === "/settings"
                    ? "page"
                    : undefined
                }
                className={`
                  flex
                  min-h-12
                  items-center
                  justify-between
                  rounded-xl
                  border
                  px-4
                  text-sm
                  font-medium
                  transition-colors
                  duration-150
                  ${
                    pathname === "/settings"
                      ? "border-white/[0.14] bg-white/[0.08] text-white"
                      : "border-white/[0.07] bg-white/[0.015] text-zinc-400 hover:bg-white/[0.045] hover:text-white"
                  }
                `}
              >
                <span className="flex items-center gap-2.5">
                  <Settings
                    className="h-4 w-4"
                    strokeWidth={1.8}
                  />

                  <span>Settings</span>
                </span>

                <ChevronRight
                  className="h-4 w-4 text-zinc-600"
                  strokeWidth={1.8}
                />
              </Link>
            </div>
          </nav>
        </div>
      </header>

      {/* =====================================================
          MOBILE BACKDROP
      ===================================================== */}

      {mobileOpen && (
        <button
          type="button"
          aria-label="Close navigation"
          onClick={() => setMobileOpen(false)}
          className="
            fixed
            inset-0
            z-40
            bg-black/[0.10]
            md:hidden
          "
        />
      )}
    </>
  );
}