
"use client";

import { useEffect, useState } from "react";
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
  Monitor,
  Command,
  Info,
  LoaderCircle,
} from "lucide-react";

const STORAGE_KEY = "anvix-workspace-settings";

const settingsSections = [
  {
    title: "Profile",
    description: "Manage your identity and workspace preferences.",
    icon: User,
    status: "Coming soon",
  },
  {
    title: "Appearance",
    description: "Customize the look and feel of your workspace.",
    icon: Palette,
    status: "Quick settings",
  },
  {
    title: "AI Preferences",
    description: "Choose your response style and AI behavior.",
    icon: Sparkles,
    status: "Quick settings",
  },
  {
    title: "Notifications",
    description: "Control workspace alerts and activity updates.",
    icon: Bell,
    status: "Quick settings",
  },
  {
    title: "Privacy & Security",
    description: "Review privacy controls and security options.",
    icon: ShieldCheck,
    status: "Coming soon",
  },
  {
    title: "API Keys",
    description: "Manage provider credentials and integrations.",
    icon: KeyRound,
    status: "Coming soon",
  },
];

const shortcuts = [
  { keys: ["Ctrl", "K"], label: "Open command palette" },
  { keys: ["Ctrl", "Enter"], label: "Send message" },
  { keys: ["Shift", "Enter"], label: "New line" },
  { keys: ["Esc"], label: "Close dialog" },
];

interface Preferences {
  darkMode: boolean;
  notifications: boolean;
  responseStyle: string;
  streaming: boolean;
}

const defaultPreferences: Preferences = {
  darkMode: true,
  notifications: true,
  responseStyle: "Balanced",
  streaming: true,
};

export default function SettingsPage() {
  const [preferences, setPreferences] =
    useState<Preferences>(defaultPreferences);

  const [hydrated, setHydrated] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState("");

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);

      if (stored) {
        const parsed = JSON.parse(stored);

        setPreferences({
          ...defaultPreferences,
          ...parsed,
        });
      }
    } catch {
      // Use defaults if stored preferences are unavailable.
    } finally {
      setHydrated(true);
    }
  }, []);

  function updatePreference<K extends keyof Preferences>(
    key: K,
    value: Preferences[K],
  ) {
    setPreferences((current) => ({
      ...current,
      [key]: value,
    }));

    setSaved(false);
    setSaveError("");
  }

  function handleSave() {
    if (!hydrated || saving) return;

    setSaving(true);
    setSaved(false);
    setSaveError("");

    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(preferences),
      );

      setSaved(true);
    } catch {
      setSaveError("Could not save preferences in this browser.");
    } finally {
      setSaving(false);
    }
  }

  const quickStats = [
    {
      icon: Cpu,
      label: "Active model",
      value: "Gemini 2.5",
    },
    {
      icon: Zap,
      label: "Response style",
      value: preferences.responseStyle,
    },
    {
      icon: Monitor,
      label: "Appearance",
      value: preferences.darkMode ? "Dark" : "Light preference",
    },
    {
      icon: Bell,
      label: "Notifications",
      value: preferences.notifications ? "Enabled" : "Disabled",
    },
  ];

  return (
    <AppShell
      title="Settings"
      description="Customize your ANVIX workspace and AI experience."
    >
      <div className="mx-auto w-full max-w-6xl space-y-8 pb-10">
        {/* HERO */}
        <section className="relative isolate overflow-hidden rounded-3xl border border-white/[0.08] bg-[#111113]">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-24 -top-28 -z-10 h-72 w-72 rounded-full bg-[#D4AF37]/[0.08] blur-[100px]"
          />

          <div className="relative p-5 sm:p-8 lg:p-9">
            <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <div className="mb-4 flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#D4AF37]/20 bg-[#D4AF37]/[0.07]">
                    <SlidersHorizontal className="h-4 w-4 text-[#D4AF37]" />
                  </div>

                  <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#D4AF37]">
                    ANVIX / Control center
                  </span>
                </div>

                <h2 className="text-3xl font-semibold tracking-[-0.04em] text-white sm:text-4xl">
                  Make it yours.
                </h2>

                <p className="mt-3 max-w-xl text-sm leading-6 text-zinc-400">
                  Personalize your workspace and tune how ANVIX
                  responds to your ideas.
                </p>
              </div>

              <div className="flex w-fit items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.03] px-3 py-2">
                <span className="h-1.5 w-1.5 rounded-full bg-[#D4AF37]" />
                <span className="text-xs text-zinc-400">
                  Workspace preferences
                </span>
              </div>
            </div>

            {/* QUICK OVERVIEW */}
            <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {quickStats.map((item) => {
                const Icon = item.icon;

                return (
                  <div
                    key={item.label}
                    className="min-w-0 rounded-xl border border-white/[0.07] bg-black/20 p-3.5 transition-colors hover:border-white/[0.12]"
                  >
                    <div className="flex items-center gap-2">
                      <Icon
                        className="h-3.5 w-3.5 shrink-0 text-[#D4AF37]"
                        aria-hidden="true"
                      />
                      <span className="truncate text-[10px] uppercase tracking-wider text-zinc-500">
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

        {/* SETTINGS CATEGORIES */}
        <section>
          <div className="mb-5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#D4AF37]">
              Configuration
            </p>

            <h2 className="mt-2 text-xl font-semibold tracking-tight text-white">
              Workspace settings
            </h2>

            <p className="mt-1 text-sm text-zinc-500">
              Explore the settings available for your workspace.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {settingsSections.map((section) => {
              const Icon = section.icon;
              const available = section.status !== "Coming soon";

              return (
                <button
                  key={section.title}
                  type="button"
                  disabled={!available}
                  onClick={() => {
                    if (section.title === "Appearance") {
                      document
                        .getElementById("appearance-settings")
                        ?.scrollIntoView({ behavior: "smooth" });
                    } else if (section.title === "AI Preferences") {
                      document
                        .getElementById("ai-settings")
                        ?.scrollIntoView({ behavior: "smooth" });
                    } else if (section.title === "Notifications") {
                      document
                        .getElementById("notification-settings")
                        ?.scrollIntoView({ behavior: "smooth" });
                    }
                  }}
                  className="
                    group flex w-full items-start gap-4 rounded-2xl
                    border border-white/[0.07] bg-[#111113] p-4
                    text-left transition-all duration-200
                    hover:border-[#D4AF37]/20 hover:bg-[#141416]
                    focus-visible:outline-none focus-visible:ring-2
                    focus-visible:ring-[#D4AF37]/50
                    disabled:cursor-default disabled:opacity-75
                    sm:p-5
                  "
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#D4AF37]/15 bg-[#D4AF37]/[0.06] transition-colors group-hover:bg-[#D4AF37]/[0.1]">
                    <Icon className="h-4 w-4 text-[#D4AF37]" />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-3">
                      <h3 className="text-sm font-semibold text-zinc-100">
                        {section.title}
                      </h3>

                      {available ? (
                        <ChevronRight className="h-4 w-4 shrink-0 text-zinc-600 transition-transform group-hover:translate-x-0.5 group-hover:text-zinc-300" />
                      ) : (
                        <span className="shrink-0 rounded-full border border-white/[0.07] px-2 py-1 text-[9px] text-zinc-600">
                          Coming soon
                        </span>
                      )}
                    </div>

                    <p className="mt-1.5 text-xs leading-5 text-zinc-500">
                      {section.description}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        {/* QUICK PREFERENCES */}
        <section>
          <div className="mb-5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#D4AF37]">
              Quick preferences
            </p>

            <h2 className="mt-2 text-xl font-semibold tracking-tight text-white">
              Your experience
            </h2>
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            {/* APPEARANCE */}
            <div
              id="appearance-settings"
              className="scroll-mt-24 rounded-2xl border border-white/[0.07] bg-[#111113] p-5"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/[0.08] bg-black/20">
                <MoonStar className="h-4 w-4 text-[#D4AF37]" />
              </div>

              <h3 className="mt-5 text-sm font-semibold text-white">
                Appearance
              </h3>

              <p className="mt-1.5 text-xs leading-5 text-zinc-500">
                Save your preferred interface appearance.
              </p>

              <button
                type="button"
                role="switch"
                aria-checked={preferences.darkMode}
                onClick={() =>
                  updatePreference("darkMode", !preferences.darkMode)
                }
                className="mt-5 flex w-full items-center justify-between rounded-xl border border-white/[0.07] bg-black/20 px-3.5 py-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D4AF37]/50"
              >
                <span className="text-xs text-zinc-300">
                  Dark appearance preference
                </span>

                <span
                  aria-hidden="true"
                  className={`relative h-5 w-9 shrink-0 rounded-full transition-colors ${
                    preferences.darkMode
                      ? "bg-[#D4AF37]"
                      : "bg-zinc-700"
                  }`}
                >
                  <span
                    className={`absolute top-1 h-3 w-3 rounded-full bg-white transition-all ${
                      preferences.darkMode ? "left-5" : "left-1"
                    }`}
                  />
                </span>
              </button>
            </div>

            {/* AI PREFERENCES */}
            <div
              id="ai-settings"
              className="scroll-mt-24 rounded-2xl border border-white/[0.07] bg-[#111113] p-5"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#D4AF37]/15 bg-[#D4AF37]/[0.06]">
                <Sparkles className="h-4 w-4 text-[#D4AF37]" />
              </div>

              <h3 className="mt-5 text-sm font-semibold text-white">
                Response style
              </h3>

              <p className="mt-1.5 text-xs leading-5 text-zinc-500">
                Choose your preferred response detail.
              </p>

              <select
                value={preferences.responseStyle}
                onChange={(event) =>
                  updatePreference("responseStyle", event.target.value)
                }
                className="mt-5 w-full rounded-xl border border-white/[0.08] bg-black/20 px-3.5 py-3 text-xs text-zinc-300 outline-none transition focus:border-[#D4AF37]/40 focus:ring-2 focus:ring-[#D4AF37]/10"
              >
                <option value="Balanced">Balanced</option>
                <option value="Concise">Concise</option>
                <option value="Detailed">Detailed</option>
                <option value="Creative">Creative</option>
              </select>
            </div>

            {/* NOTIFICATIONS */}
            <div
              id="notification-settings"
              className="scroll-mt-24 rounded-2xl border border-white/[0.07] bg-[#111113] p-5"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/[0.08] bg-black/20">
                <Bell className="h-4 w-4 text-[#D4AF37]" />
              </div>

              <h3 className="mt-5 text-sm font-semibold text-white">
                Notifications
              </h3>

              <p className="mt-1.5 text-xs leading-5 text-zinc-500">
                Save your workspace notification preference.
              </p>

              <button
                type="button"
                role="switch"
                aria-checked={preferences.notifications}
                onClick={() =>
                  updatePreference(
                    "notifications",
                    !preferences.notifications,
                  )
                }
                className="mt-5 flex w-full items-center justify-between rounded-xl border border-white/[0.07] bg-black/20 px-3.5 py-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D4AF37]/50"
              >
                <span className="text-xs text-zinc-300">
                  Workspace notifications
                </span>

                <span
                  aria-hidden="true"
                  className={`relative h-5 w-9 shrink-0 rounded-full transition-colors ${
                    preferences.notifications
                      ? "bg-[#D4AF37]"
                      : "bg-zinc-700"
                  }`}
                >
                  <span
                    className={`absolute top-1 h-3 w-3 rounded-full bg-white transition-all ${
                      preferences.notifications ? "left-5" : "left-1"
                    }`}
                  />
                </span>
              </button>
            </div>
          </div>
        </section>

        {/* AI PERFORMANCE */}
        <section className="overflow-hidden rounded-2xl border border-white/[0.07] bg-[#111113]">
          <div className="flex items-center gap-3 border-b border-white/[0.07] p-5 sm:px-6">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#D4AF37]/15 bg-[#D4AF37]/[0.06]">
              <Zap className="h-4 w-4 text-[#D4AF37]" />
            </div>

            <div>
              <h3 className="text-sm font-semibold text-white">
                AI performance
              </h3>
              <p className="mt-0.5 text-xs text-zinc-500">
                Configure your response experience.
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between gap-4 p-5 sm:px-6">
            <div>
              <p className="text-xs font-medium text-zinc-200">
                Streaming preference
              </p>
              <p className="mt-1 text-[11px] leading-5 text-zinc-500">
                Preferred display mode for AI responses.
              </p>
            </div>

            <button
              type="button"
              role="switch"
              aria-checked={preferences.streaming}
              onClick={() =>
                updatePreference("streaming", !preferences.streaming)
              }
              className="relative h-5 w-9 shrink-0 rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D4AF37]/50"
              style={{
                backgroundColor: preferences.streaming
                  ? "#D4AF37"
                  : "#3F3F46",
              }}
            >
              <span
                aria-hidden="true"
                className={`absolute top-1 h-3 w-3 rounded-full bg-white transition-all ${
                  preferences.streaming ? "left-5" : "left-1"
                }`}
              />
            </button>
          </div>
        </section>

        {/* KEYBOARD SHORTCUTS */}
        <section className="rounded-2xl border border-white/[0.07] bg-[#111113] p-5 sm:p-6">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/[0.08] bg-black/20">
                <Keyboard className="h-4 w-4 text-[#D4AF37]" />
              </div>

              <div>
                <h3 className="text-sm font-semibold text-white">
                  Keyboard shortcuts
                </h3>
                <p className="mt-1 text-xs text-zinc-500">
                  Handy shortcuts for your workflow.
                </p>
              </div>
            </div>

            <div className="grid gap-2 sm:min-w-[300px]">
              {shortcuts.map((shortcut) => (
                <div
                  key={shortcut.label}
                  className="flex items-center justify-between gap-3 rounded-lg border border-white/[0.06] bg-black/20 px-3 py-2"
                >
                  <span className="text-[11px] text-zinc-500">
                    {shortcut.label}
                  </span>

                  <div className="flex shrink-0 items-center gap-1">
                    {shortcut.keys.map((key) => (
                      <kbd
                        key={key}
                        className="rounded-md border border-white/[0.1] bg-white/[0.04] px-1.5 py-0.5 text-[9px] font-medium text-zinc-400"
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

        {/* SAVE BAR */}
        <div className="sticky bottom-4 z-20 flex flex-col gap-3 rounded-2xl border border-white/[0.1] bg-[#111113]/95 p-3 shadow-xl backdrop-blur-xl sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-2.5 px-2">
            {saved ? (
              <Check className="h-4 w-4 shrink-0 text-emerald-400" />
            ) : saveError ? (
              <Info className="h-4 w-4 shrink-0 text-red-400" />
            ) : (
              <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#D4AF37]" />
            )}

            <span
              role="status"
              className={`text-xs ${
                saved
                  ? "text-emerald-400"
                  : saveError
                    ? "text-red-400"
                    : "text-zinc-500"
              }`}
            >
              {saved
                ? "Preferences saved in this browser"
                : saveError || "Save your preference changes"}
            </span>
          </div>

          <button
            type="button"
            onClick={handleSave}
            disabled={!hydrated || saving}
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-[#D4AF37] px-5 py-2.5 text-xs font-semibold text-black transition hover:bg-[#E5C158] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? (
              <LoaderCircle className="h-4 w-4 animate-spin" />
            ) : saved ? (
              <Check className="h-3.5 w-3.5" />
            ) : (
              <Command className="h-3.5 w-3.5" />
            )}

            {saving ? "Saving..." : saved ? "Saved" : "Save preferences"}
          </button>
        </div>

        <div className="flex items-center justify-center gap-2 pb-2 text-[10px] text-zinc-600">
          <Info className="h-3 w-3" />
          <span>ANVIX AI · Preferences stored locally</span>
        </div>
      </div>
    </AppShell>
  );
}