"use client";

import { useState } from "react";
import AppShell from "@/components/layout/AppShell";
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
  Cpu,
  SlidersHorizontal,
  Zap,
  Lock,
  Monitor,
  Command,
  Info,
} from "lucide-react";

const settingsSections = [
  {
    title: "Profile",
    description:
      "Manage your identity, contact details, and workspace preferences.",
    icon: User,
    status: "Configured",
    accent: "profile",
  },
  {
    title: "Appearance",
    description:
      "Customize the look and feel of your ANVIX workspace.",
    icon: Palette,
    status: "Dark",
    accent: "appearance",
  },
  {
    title: "AI Preferences",
    description:
      "Choose your preferred model and response behavior.",
    icon: Sparkles,
    status: "Gemini 2.5 Flash",
    accent: "ai",
  },
  {
    title: "Notifications",
    description:
      "Control alerts and activity notifications from ANVIX.",
    icon: Bell,
    status: "Enabled",
    accent: "notifications",
  },
  {
    title: "Privacy & Security",
    description:
      "Manage privacy controls and workspace security settings.",
    icon: ShieldCheck,
    status: "Protected",
    accent: "security",
  },
  {
    title: "API Keys",
    description:
      "Securely manage connected providers and credentials.",
    icon: KeyRound,
    status: "No keys added",
    accent: "keys",
  },
];

const shortcuts = [
  { keys: ["Ctrl", "K"], label: "Open command palette" },
  { keys: ["Ctrl", "Enter"], label: "Send message" },
  { keys: ["Shift", "Enter"], label: "New line" },
  { keys: ["Esc"], label: "Close dialog" },
];

export default function SettingsPage() {
  const [darkMode, setDarkMode] = useState(true);
  const [notifications, setNotifications] = useState(true);
  const [responseStyle, setResponseStyle] = useState("Balanced");
  const [streaming, setStreaming] = useState(true);
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    setSaved(true);

    setTimeout(() => {
      setSaved(false);
    }, 1800);
  };

  return (
    <AppShell
      title="Settings"
      description="Customize your ANVIX workspace and AI experience."
    >
      <div className="mx-auto w-full max-w-6xl space-y-8 pb-10">

        {/* ========================================================= */}
        {/* HERO */}
        {/* ========================================================= */}

        <section className="relative overflow-hidden rounded-[28px] border border-zinc-800 bg-[#111113]">
          {/* Background glow */}
          <div
            aria-hidden="true"
            className="
              pointer-events-none
              absolute
              -right-24
              -top-32
              h-80
              w-80
              rounded-full
              bg-[#D4AF37]/10
              blur-[110px]
            "
          />

          <div
            aria-hidden="true"
            className="
              pointer-events-none
              absolute
              -bottom-40
              left-1/3
              h-72
              w-72
              rounded-full
              bg-[#D4AF37]/[0.035]
              blur-[100px]
            "
          />

          {/* subtle grid */}
          <div
            aria-hidden="true"
            className="
              pointer-events-none
              absolute
              inset-0
              opacity-[0.025]
              [background-image:linear-gradient(to_right,#fff_1px,transparent_1px),linear-gradient(to_bottom,#fff_1px,transparent_1px)]
              [background-size:32px_32px]
            "
          />

          <div className="relative p-6 sm:p-8 lg:p-9">
            <div className="flex flex-col gap-7 lg:flex-row lg:items-end lg:justify-between">

              <div>
                {/* eyebrow */}
                <div className="mb-4 flex items-center gap-2.5">
                  <div
                    className="
                      flex
                      h-9
                      w-9
                      items-center
                      justify-center
                      rounded-xl
                      border
                      border-[#D4AF37]/20
                      bg-[#D4AF37]/10
                      shadow-[0_0_25px_rgba(212,175,55,0.08)]
                    "
                  >
                    <SlidersHorizontal
                      className="h-4 w-4 text-[#D4AF37]"
                    />
                  </div>

                  <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#D4AF37]">
                    ANVIX Control Center
                  </span>
                </div>

                <h2 className="text-3xl font-semibold tracking-[-0.03em] text-white sm:text-4xl">
                  Workspace settings
                </h2>

                <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-400">
                  Fine-tune your workspace, AI behavior, appearance,
                  notifications, and security from one place.
                </p>
              </div>

              {/* system status */}
              <div
                className="
                  inline-flex
                  w-fit
                  shrink-0
                  items-center
                  gap-3
                  rounded-2xl
                  border
                  border-emerald-500/10
                  bg-emerald-500/[0.035]
                  px-4
                  py-3
                "
              >
                <div className="relative">
                  <span className="block h-2.5 w-2.5 rounded-full bg-emerald-400" />
                  <span className="absolute inset-0 animate-ping rounded-full bg-emerald-400/40" />
                </div>

                <div>
                  <p className="text-xs font-medium text-emerald-300">
                    All systems ready
                  </p>

                  <p className="mt-0.5 text-[10px] text-zinc-600">
                    ANVIX is running normally
                  </p>
                </div>
              </div>
            </div>

            {/* quick stats */}
            <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                {
                  icon: Cpu,
                  label: "Active model",
                  value: "Gemini 2.5",
                },
                {
                  icon: Zap,
                  label: "Response mode",
                  value: responseStyle,
                },
                {
                  icon: ShieldCheck,
                  label: "Security",
                  value: "Protected",
                },
                {
                  icon: Monitor,
                  label: "Interface",
                  value: "Dark",
                },
              ].map((item) => {
                const Icon = item.icon;

                return (
                  <div
                    key={item.label}
                    className="
                      rounded-2xl
                      border
                      border-zinc-800/80
                      bg-[#0D0D0F]/80
                      px-4
                      py-3.5
                      transition
                      duration-200
                      hover:border-zinc-700
                      hover:bg-[#111114]
                    "
                  >
                    <div className="flex items-center gap-2">
                      <Icon className="h-3.5 w-3.5 text-[#D4AF37]" />
                      <span className="text-[10px] uppercase tracking-wider text-zinc-600">
                        {item.label}
                      </span>
                    </div>

                    <p className="mt-2 truncate text-xs font-medium text-zinc-200">
                      {item.value}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ========================================================= */}
        {/* SETTINGS */}
        {/* ========================================================= */}

        <section>
          <div className="mb-5 flex items-end justify-between">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#D4AF37]">
                Configuration
              </p>

              <h2 className="mt-2 text-xl font-semibold tracking-tight text-white">
                Workspace controls
              </h2>

              <p className="mt-1 text-sm text-zinc-600">
                Manage the core settings of your ANVIX workspace.
              </p>
            </div>

            <span className="hidden text-xs text-zinc-600 sm:block">
              6 settings
            </span>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {settingsSections.map((section) => {
              const Icon = section.icon;

              return (
                <button
                  key={section.title}
                  type="button"
                  className="
                    group
                    relative
                    overflow-hidden
                    rounded-2xl
                    border
                    border-zinc-800
                    bg-[#111113]
                    p-5
                    text-left
                    transition-all
                    duration-300
                    hover:-translate-y-0.5
                    hover:border-[#D4AF37]/25
                    hover:bg-[#131315]
                    hover:shadow-[0_16px_50px_rgba(0,0,0,0.25)]
                    focus:outline-none
                    focus:ring-2
                    focus:ring-[#D4AF37]/30
                  "
                >
                  {/* hover glow */}
                  <div
                    className="
                      pointer-events-none
                      absolute
                      -right-10
                      -top-10
                      h-28
                      w-28
                      rounded-full
                      bg-[#D4AF37]/[0.035]
                      opacity-0
                      blur-3xl
                      transition
                      duration-300
                      group-hover:opacity-100
                    "
                  />

                  <div className="relative flex items-start justify-between gap-4">
                    <div
                      className="
                        flex
                        h-11
                        w-11
                        shrink-0
                        items-center
                        justify-center
                        rounded-xl
                        border
                        border-[#D4AF37]/15
                        bg-[#D4AF37]/[0.06]
                        transition-all
                        duration-300
                        group-hover:border-[#D4AF37]/30
                        group-hover:bg-[#D4AF37]/10
                        group-hover:shadow-[0_0_24px_rgba(212,175,55,0.08)]
                      "
                    >
                      <Icon className="h-[17px] w-[17px] text-[#D4AF37]" />
                    </div>

                    <div
                      className="
                        flex
                        h-8
                        w-8
                        items-center
                        justify-center
                        rounded-lg
                        border
                        border-zinc-800
                        bg-[#0D0D0F]
                        transition
                        duration-200
                        group-hover:border-zinc-700
                      "
                    >
                      <ChevronRight
                        className="
                          h-4
                          w-4
                          text-zinc-600
                          transition
                          duration-200
                          group-hover:translate-x-0.5
                          group-hover:text-zinc-300
                        "
                      />
                    </div>
                  </div>

                  <div className="relative mt-5">
                    <h3 className="text-sm font-semibold text-zinc-100">
                      {section.title}
                    </h3>

                    <p className="mt-1.5 max-w-md text-xs leading-5 text-zinc-500">
                      {section.description}
                    </p>
                  </div>

                  <div className="relative mt-5 flex items-center justify-between">
                    <span className="text-[10px] uppercase tracking-wider text-zinc-700">
                      Current configuration
                    </span>

                    <span
                      className="
                        rounded-full
                        border
                        border-zinc-800
                        bg-[#0D0D0F]
                        px-2.5
                        py-1
                        text-[10px]
                        font-medium
                        text-zinc-400
                        transition
                        group-hover:border-[#D4AF37]/20
                        group-hover:text-[#D4AF37]
                      "
                    >
                      {section.status}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        {/* ========================================================= */}
        {/* QUICK PREFERENCES */}
        {/* ========================================================= */}

        <section>
          <div className="mb-5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#D4AF37]">
              Quick preferences
            </p>

            <h2 className="mt-2 text-xl font-semibold tracking-tight text-white">
              Control your experience
            </h2>

            <p className="mt-1 text-sm text-zinc-600">
              Make quick changes without opening a separate settings page.
            </p>
          </div>

          <div className="grid gap-4 lg:grid-cols-3">

            {/* APPEARANCE */}
            <div
              className="
                group
                rounded-2xl
                border
                border-zinc-800
                bg-[#111113]
                p-5
                transition
                duration-300
                hover:border-zinc-700
              "
            >
              <div className="flex items-start justify-between">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-zinc-800 bg-[#0D0D0F]">
                  <MoonStar className="h-4 w-4 text-[#D4AF37]" />
                </div>

                <span className="rounded-full border border-zinc-800 bg-[#0D0D0F] px-2.5 py-1 text-[9px] font-medium uppercase tracking-wider text-zinc-600">
                  Appearance
                </span>
              </div>

              <h3 className="mt-5 text-sm font-semibold text-white">
                Dark workspace
              </h3>

              <p className="mt-1.5 text-xs leading-5 text-zinc-500">
                Keep ANVIX in its dark premium interface.
              </p>

              <button
                type="button"
                onClick={() => setDarkMode((value) => !value)}
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
                  px-3.5
                  py-3
                  transition
                  hover:border-zinc-700
                "
              >
                <div className="flex items-center gap-2.5">
                  <div
                    className={`h-1.5 w-1.5 rounded-full ${
                      darkMode ? "bg-[#D4AF37]" : "bg-zinc-600"
                    }`}
                  />

                  <span className="text-xs text-zinc-300">
                    Dark mode
                  </span>
                </div>

                <span
                  className={`
                    relative
                    h-5
                    w-9
                    rounded-full
                    transition
                    duration-300
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
                      shadow-sm
                      transition-all
                      duration-300
                      ${darkMode ? "left-5" : "left-1"}
                    `}
                  />
                </span>
              </button>
            </div>

            {/* AI */}
            <div
              className="
                group
                rounded-2xl
                border
                border-zinc-800
                bg-[#111113]
                p-5
                transition
                duration-300
                hover:border-zinc-700
              "
            >
              <div className="flex items-start justify-between">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#D4AF37]/15 bg-[#D4AF37]/[0.06]">
                  <Sparkles className="h-4 w-4 text-[#D4AF37]" />
                </div>

                <span className="rounded-full border border-[#D4AF37]/15 bg-[#D4AF37]/[0.04] px-2.5 py-1 text-[9px] font-medium uppercase tracking-wider text-[#D4AF37]/70">
                  AI
                </span>
              </div>

              <h3 className="mt-5 text-sm font-semibold text-white">
                Response style
              </h3>

              <p className="mt-1.5 text-xs leading-5 text-zinc-500">
                Choose how ANVIX responds to your prompts.
              </p>

              <div className="relative mt-5">
                <select
                  value={responseStyle}
                  onChange={(event) =>
                    setResponseStyle(event.target.value)
                  }
                  className="
                    w-full
                    appearance-none
                    rounded-xl
                    border
                    border-zinc-800
                    bg-[#0D0D0F]
                    px-3.5
                    py-3
                    pr-10
                    text-xs
                    font-medium
                    text-zinc-300
                    outline-none
                    transition
                    hover:border-zinc-700
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

                <ChevronRight
                  className="
                    pointer-events-none
                    absolute
                    right-3
                    top-1/2
                    h-3.5
                    w-3.5
                    -translate-y-1/2
                    rotate-90
                    text-zinc-600
                  "
                />
              </div>
            </div>

            {/* NOTIFICATIONS */}
            <div
              className="
                group
                rounded-2xl
                border
                border-zinc-800
                bg-[#111113]
                p-5
                transition
                duration-300
                hover:border-zinc-700
              "
            >
              <div className="flex items-start justify-between">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-zinc-800 bg-[#0D0D0F]">
                  <Bell className="h-4 w-4 text-[#D4AF37]" />
                </div>

                <span className="rounded-full border border-zinc-800 bg-[#0D0D0F] px-2.5 py-1 text-[9px] font-medium uppercase tracking-wider text-zinc-600">
                  Alerts
                </span>
              </div>

              <h3 className="mt-5 text-sm font-semibold text-white">
                Notifications
              </h3>

              <p className="mt-1.5 text-xs leading-5 text-zinc-500">
                Receive updates about your workspace activity.
              </p>

              <button
                type="button"
                onClick={() =>
                  setNotifications((value) => !value)
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
                  px-3.5
                  py-3
                  transition
                  hover:border-zinc-700
                "
              >
                <div className="flex items-center gap-2.5">
                  <div
                    className={`h-1.5 w-1.5 rounded-full ${
                      notifications
                        ? "bg-emerald-400"
                        : "bg-zinc-600"
                    }`}
                  />

                  <span className="text-xs text-zinc-300">
                    Workspace alerts
                  </span>
                </div>

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
                    <Check className="h-3.5 w-3.5 text-black" />
                  )}
                </span>
              </button>
            </div>
          </div>
        </section>

        {/* ========================================================= */}
        {/* AI PERFORMANCE */}
        {/* ========================================================= */}

        <section
          className="
            overflow-hidden
            rounded-2xl
            border
            border-zinc-800
            bg-[#111113]
          "
        >
          <div className="border-b border-zinc-800 px-5 py-5 sm:px-6">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#D4AF37]/15 bg-[#D4AF37]/[0.06]">
                <Zap className="h-4 w-4 text-[#D4AF37]" />
              </div>

              <div>
                <h3 className="text-sm font-semibold text-white">
                  AI performance
                </h3>

                <p className="mt-0.5 text-xs text-zinc-600">
                  Configure how ANVIX handles AI responses.
                </p>
              </div>
            </div>
          </div>

          <div className="grid divide-y divide-zinc-800 sm:grid-cols-2 sm:divide-x sm:divide-y-0">
            <button
              type="button"
              onClick={() => setStreaming((value) => !value)}
              className="flex items-center justify-between px-5 py-5 text-left transition hover:bg-[#131315] sm:px-6"
            >
              <div>
                <p className="text-xs font-medium text-zinc-200">
                  Streaming responses
                </p>

                <p className="mt-1 text-[11px] text-zinc-600">
                  Show AI responses as they are generated.
                </p>
              </div>

              <span
                className={`
                  relative
                  ml-5
                  h-5
                  w-9
                  shrink-0
                  rounded-full
                  transition
                  ${streaming ? "bg-[#D4AF37]" : "bg-zinc-700"}
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
                    transition-all
                    ${streaming ? "left-5" : "left-1"}
                  `}
                />
              </span>
            </button>

            <div className="flex items-center justify-between px-5 py-5 sm:px-6">
              <div>
                <p className="text-xs font-medium text-zinc-200">
                  Active model
                </p>

                <p className="mt-1 text-[11px] text-zinc-600">
                  Current default AI model.
                </p>
              </div>

              <div className="ml-5 flex shrink-0 items-center gap-2 rounded-xl border border-zinc-800 bg-[#0D0D0F] px-3 py-2">
                <Sparkles className="h-3.5 w-3.5 text-[#D4AF37]" />
                <span className="text-[11px] text-zinc-300">
                  Gemini 2.5 Flash
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* ========================================================= */}
        {/* SHORTCUTS */}
        {/* ========================================================= */}

        <section
          className="
            rounded-2xl
            border
            border-zinc-800
            bg-[#111113]
            p-5
            sm:p-6
          "
        >
          <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-zinc-800 bg-[#0D0D0F]">
                <Keyboard className="h-4 w-4 text-[#D4AF37]" />
              </div>

              <div>
                <h3 className="text-sm font-semibold text-white">
                  Keyboard shortcuts
                </h3>

                <p className="mt-1 text-xs text-zinc-600">
                  Work faster with ANVIX keyboard commands.
                </p>
              </div>
            </div>

            <div className="grid gap-2 sm:min-w-[300px]">
              {shortcuts.map((shortcut) => (
                <div
                  key={shortcut.label}
                  className="flex items-center justify-between rounded-xl border border-zinc-800/80 bg-[#0D0D0F] px-3 py-2"
                >
                  <span className="text-[11px] text-zinc-500">
                    {shortcut.label}
                  </span>

                  <div className="flex items-center gap-1">
                    {shortcut.keys.map((key) => (
                      <kbd
                        key={key}
                        className="
                          rounded-md
                          border
                          border-zinc-700
                          bg-[#18181B]
                          px-1.5
                          py-0.5
                          text-[9px]
                          font-medium
                          text-zinc-400
                        "
                      >
                        {key}
                      </kbd>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ========================================================= */}
        {/* SECURITY */}
        {/* ========================================================= */}

        <section
          className="
            relative
            overflow-hidden
            rounded-2xl
            border
            border-emerald-500/10
            bg-[#101412]
            p-5
            sm:p-6
          "
        >
          <div
            aria-hidden="true"
            className="
              pointer-events-none
              absolute
              -right-20
              -top-20
              h-40
              w-40
              rounded-full
              bg-emerald-500/[0.04]
              blur-3xl
            "
          />

          <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-emerald-500/10 bg-emerald-500/[0.05]">
                <ShieldCheck className="h-4 w-4 text-emerald-400" />
              </div>

              <div>
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-zinc-200">
                    Your workspace is protected
                  </p>

                  <span className="rounded-full border border-emerald-500/10 bg-emerald-500/[0.04] px-2 py-0.5 text-[9px] font-medium text-emerald-400">
                    Secure
                  </span>
                </div>

                <p className="mt-1 text-xs text-zinc-600">
                  Security and privacy controls are active.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 text-[10px] text-zinc-600">
              <Lock className="h-3 w-3" />
              Protected workspace
            </div>
          </div>
        </section>

        {/* ========================================================= */}
        {/* SAVE BAR */}
        {/* ========================================================= */}

        <div
          className="
            sticky
            bottom-4
            z-20
            flex
            flex-col
            gap-3
            rounded-2xl
            border
            border-zinc-800
            bg-[#111113]/95
            p-3
            shadow-[0_20px_60px_rgba(0,0,0,0.45)]
            backdrop-blur-xl
            sm:flex-row
            sm:items-center
            sm:justify-between
          "
        >
          <div className="flex items-center gap-2.5 px-2">
            <div
              className={`h-1.5 w-1.5 rounded-full ${
                saved ? "bg-emerald-400" : "bg-[#D4AF37]"
              }`}
            />

            <span className="text-xs text-zinc-500">
              {saved
                ? "Preferences saved successfully"
                : "Changes are stored locally"}
            </span>

            {saved && (
              <Check className="h-3.5 w-3.5 text-emerald-400" />
            )}
          </div>

          <button
            type="button"
            onClick={handleSave}
            className="
              inline-flex
              items-center
              justify-center
              gap-2
              rounded-xl
              bg-[#D4AF37]
              px-5
              py-2.5
              text-xs
              font-semibold
              text-black
              shadow-[0_8px_25px_rgba(212,175,55,0.12)]
              transition-all
              duration-200
              hover:bg-[#E5C158]
              hover:shadow-[0_10px_30px_rgba(212,175,55,0.18)]
              active:scale-[0.98]
              focus:outline-none
              focus:ring-2
              focus:ring-[#D4AF37]/40
            "
          >
            {saved ? (
              <>
                <Check className="h-3.5 w-3.5" />
                Saved
              </>
            ) : (
              <>
                <Command className="h-3.5 w-3.5" />
                Save preferences
              </>
            )}
          </button>
        </div>

        {/* INFO */}
        <div className="flex items-center justify-center gap-2 pb-2 text-[10px] text-zinc-700">
          <Info className="h-3 w-3" />
          <span>ANVIX AI • Workspace configuration</span>
        </div>
      </div>
    </AppShell>
  );
}