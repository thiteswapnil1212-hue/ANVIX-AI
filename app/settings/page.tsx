"use client";

import { useState } from "react";
import AppShell from "@/components/layout/AppShell";
import PanelCard from "@/components/common/PanelCard";
import {
  User,
  MoonStar,
  Sparkles,
  KeyRound,
  Bell,
  ShieldCheck,
  Keyboard,
  Palette,
  ChevronRight,
  Check,
} from "lucide-react";

const settingsSections = [
  {
    title: "Profile",
    description:
      "Manage your identity, contact details, and workspace preferences.",
    icon: User,
    status: "Configured",
  },
  {
    title: "Appearance",
    description:
      "Customize the look and feel of your ANVIX workspace.",
    icon: Palette,
    status: "Dark",
  },
  {
    title: "AI Preferences",
    description:
      "Choose your preferred model and response behavior.",
    icon: Sparkles,
    status: "Gemini 2.5 Flash",
  },
  {
    title: "Notifications",
    description:
      "Control alerts and activity notifications from ANVIX.",
    icon: Bell,
    status: "Enabled",
  },
  {
    title: "Privacy & Security",
    description:
      "Manage privacy controls and workspace security settings.",
    icon: ShieldCheck,
    status: "Protected",
  },
  {
    title: "API Keys",
    description:
      "Securely manage connected providers and credentials.",
    icon: KeyRound,
    status: "No keys added",
  },
];

export default function SettingsPage() {
  const [darkMode, setDarkMode] = useState(true);
  const [notifications, setNotifications] = useState(true);
  const [responseStyle, setResponseStyle] = useState("Balanced");

  return (
    <AppShell
      title="Settings"
      description="Customize your ANVIX workspace and AI experience."
    >
      <div className="mx-auto w-full max-w-6xl space-y-8">

        {/* HEADER */}
        <div className="relative overflow-hidden rounded-3xl border border-zinc-800 bg-[#111113] p-6 sm:p-8">
          {/* Glow */}
          <div
            aria-hidden="true"
            className="
              pointer-events-none
              absolute
              -right-24
              -top-24
              h-64
              w-64
              rounded-full
              bg-[#D4AF37]/[0.07]
              blur-[100px]
            "
          />

          <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="mb-3 flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#D4AF37]/20 bg-[#D4AF37]/10">
                  <Sparkles
                    className="h-4 w-4 text-[#D4AF37]"
                    aria-hidden="true"
                  />
                </div>

                <span className="text-xs font-medium uppercase tracking-[0.18em] text-[#D4AF37]">
                  ANVIX Control Center
                </span>
              </div>

              <h2 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">
                Workspace settings
              </h2>

              <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-400">
                Fine-tune your workspace, AI behavior, appearance,
                notifications, and security.
              </p>
            </div>

            <div className="flex shrink-0 items-center gap-2 rounded-full border border-zinc-800 bg-[#0D0D0F] px-3 py-2">
              <span className="h-2 w-2 rounded-full bg-[#D4AF37]" />

              <span className="text-xs text-zinc-400">
                All systems ready
              </span>
            </div>
          </div>
        </div>

        {/* SETTINGS GRID */}
        <div className="grid gap-5 md:grid-cols-2">
          {settingsSections.map((section) => {
            const Icon = section.icon;

            return (
              <PanelCard
                key={section.title}
                title={section.title}
                description={section.description}
              >
                <button
                  type="button"
                  className="
                    group
                    flex
                    w-full
                    items-center
                    justify-between
                    rounded-2xl
                    border
                    border-zinc-800
                    bg-[#0D0D0F]
                    p-4
                    text-left
                    transition-all
                    duration-200
                    hover:border-[#D4AF37]/20
                    hover:bg-[#121214]
                    focus:outline-none
                    focus:ring-2
                    focus:ring-[#D4AF37]/40
                  "
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <div
                      className="
                        flex
                        h-10
                        w-10
                        shrink-0
                        items-center
                        justify-center
                        rounded-xl
                        border
                        border-[#D4AF37]/15
                        bg-[#D4AF37]/[0.07]
                        transition
                        duration-200
                        group-hover:border-[#D4AF37]/30
                        group-hover:bg-[#D4AF37]/10
                      "
                    >
                      <Icon
                        className="h-4 w-4 text-[#D4AF37]"
                        aria-hidden="true"
                      />
                    </div>

                    <div className="min-w-0">
                      <p className="text-sm font-medium text-zinc-200">
                        {section.status}
                      </p>

                      <p className="mt-1 text-xs text-zinc-600">
                        Current configuration
                      </p>
                    </div>
                  </div>

                  <ChevronRight
                    className="
                      h-4
                      w-4
                      shrink-0
                      text-zinc-600
                      transition
                      duration-200
                      group-hover:translate-x-0.5
                      group-hover:text-zinc-300
                    "
                    aria-hidden="true"
                  />
                </button>
              </PanelCard>
            );
          })}
        </div>

        {/* QUICK PREFERENCES */}
        <section>
          <div className="mb-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#D4AF37]">
              Quick preferences
            </p>

            <h2 className="mt-2 text-xl font-semibold text-white">
              Control your experience
            </h2>
          </div>

          <div className="grid gap-5 lg:grid-cols-3">

            {/* APPEARANCE */}
            <div className="rounded-2xl border border-zinc-800 bg-[#111113] p-5">
              <div className="flex items-start justify-between">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-zinc-800 bg-[#0D0D0F]">
                  <MoonStar
                    className="h-4 w-4 text-[#D4AF37]"
                    aria-hidden="true"
                  />
                </div>

                <span className="rounded-full border border-zinc-800 px-2 py-1 text-[10px] text-zinc-500">
                  Appearance
                </span>
              </div>

              <h3 className="mt-5 text-sm font-semibold text-white">
                Dark workspace
              </h3>

              <p className="mt-1 text-xs leading-5 text-zinc-500">
                Keep ANVIX in its dark premium interface.
              </p>

              <button
                type="button"
                onClick={() => setDarkMode(!darkMode)}
                className="
                  mt-5
                  flex
                  w-full
                  items-center
                  justify-between
                  rounded-xl
                  border
                  border-zinc-800
                  bg-[#0D0D0F]
                  px-3
                  py-2.5
                  transition
                  hover:border-zinc-700
                "
              >
                <span className="text-xs text-zinc-300">
                  Dark mode
                </span>

                <span
                  className={`
                    relative
                    h-5
                    w-9
                    rounded-full
                    transition
                    ${darkMode ? "bg-[#D4AF37]" : "bg-zinc-700"}
                  `}
                >
                  <span
                    className={`
                      absolute
                      top-1
                      h-3
                      w-3
                      rounded-full
                      bg-white
                      shadow
                      transition-all
                      ${
                        darkMode
                          ? "left-5"
                          : "left-1"
                      }
                    `}
                  />
                </span>
              </button>
            </div>

            {/* AI RESPONSE */}
            <div className="rounded-2xl border border-zinc-800 bg-[#111113] p-5">
              <div className="flex items-start justify-between">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-zinc-800 bg-[#0D0D0F]">
                  <Sparkles
                    className="h-4 w-4 text-[#D4AF37]"
                    aria-hidden="true"
                  />
                </div>

                <span className="rounded-full border border-zinc-800 px-2 py-1 text-[10px] text-zinc-500">
                  AI
                </span>
              </div>

              <h3 className="mt-5 text-sm font-semibold text-white">
                Response style
              </h3>

              <p className="mt-1 text-xs leading-5 text-zinc-500">
                Choose how ANVIX responds to your prompts.
              </p>

              <select
                value={responseStyle}
                onChange={(event) =>
                  setResponseStyle(event.target.value)
                }
                className="
                  mt-5
                  w-full
                  rounded-xl
                  border
                  border-zinc-800
                  bg-[#0D0D0F]
                  px-3
                  py-2.5
                  text-xs
                  text-zinc-300
                  outline-none
                  transition
                  focus:border-[#D4AF37]/40
                  focus:ring-2
                  focus:ring-[#D4AF37]/10
                "
              >
                <option>Balanced</option>
                <option>Concise</option>
                <option>Detailed</option>
                <option>Creative</option>
              </select>
            </div>

            {/* NOTIFICATIONS */}
            <div className="rounded-2xl border border-zinc-800 bg-[#111113] p-5">
              <div className="flex items-start justify-between">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-zinc-800 bg-[#0D0D0F]">
                  <Bell
                    className="h-4 w-4 text-[#D4AF37]"
                    aria-hidden="true"
                  />
                </div>

                <span className="rounded-full border border-zinc-800 px-2 py-1 text-[10px] text-zinc-500">
                  Alerts
                </span>
              </div>

              <h3 className="mt-5 text-sm font-semibold text-white">
                Notifications
              </h3>

              <p className="mt-1 text-xs leading-5 text-zinc-500">
                Receive updates about your workspace activity.
              </p>

              <button
                type="button"
                onClick={() =>
                  setNotifications(!notifications)
                }
                className="
                  mt-5
                  flex
                  w-full
                  items-center
                  justify-between
                  rounded-xl
                  border
                  border-zinc-800
                  bg-[#0D0D0F]
                  px-3
                  py-2.5
                  transition
                  hover:border-zinc-700
                "
              >
                <span className="text-xs text-zinc-300">
                  Workspace alerts
                </span>

                <span
                  className={`
                    flex
                    h-5
                    w-5
                    items-center
                    justify-center
                    rounded-md
                    border
                    transition
                    ${
                      notifications
                        ? "border-[#D4AF37] bg-[#D4AF37]"
                        : "border-zinc-700 bg-transparent"
                    }
                  `}
                >
                  {notifications && (
                    <Check
                      className="h-3.5 w-3.5 text-black"
                      aria-hidden="true"
                    />
                  )}
                </span>
              </button>
            </div>
          </div>
        </section>

        {/* SECURITY FOOTER */}
        <div className="flex flex-col gap-4 rounded-2xl border border-zinc-800 bg-[#111113] p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-emerald-500/10 bg-emerald-500/5">
              <ShieldCheck
                className="h-4 w-4 text-emerald-400"
                aria-hidden="true"
              />
            </div>

            <div>
              <p className="text-sm font-medium text-zinc-200">
                Your workspace is protected
              </p>

              <p className="mt-1 text-xs text-zinc-600">
                Security and privacy controls are active.
              </p>
            </div>
          </div>

          <button
            type="button"
            className="
              inline-flex
              items-center
              justify-center
              gap-2
              rounded-xl
              border
              border-zinc-800
              bg-[#0D0D0F]
              px-4
              py-2.5
              text-xs
              font-medium
              text-zinc-300
              transition
              hover:border-zinc-700
              hover:bg-[#18181B]
              hover:text-white
              focus:outline-none
              focus:ring-2
              focus:ring-[#D4AF37]/30
            "
          >
            <Keyboard
              className="h-3.5 w-3.5"
              aria-hidden="true"
            />
            Keyboard shortcuts
          </button>
        </div>
      </div>
    </AppShell>
  );
}
