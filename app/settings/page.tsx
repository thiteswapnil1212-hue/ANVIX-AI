"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import AppShell from "@/components/layout/AppShell";
import InstallPrompt from "@/components/pwa/InstallPrompt";
import PushSettings from "@/components/notifications/PushSettings";
import TelegramSettings from "@/components/notifications/TelegramSettings";
import EmailSettings from "@/components/notifications/EmailSettings";
import { useAuth } from "@/components/auth/AuthProvider";
import { fetchProfile, upsertProfile } from "@/lib/supabase/cloud";
import {
  fetchByokStatus,
  fetchUsage,
  revokeByokKey,
  saveByokKey,
  setUseOwnKey,
  shouldUseOwnKey,
  type ByokStatus,
  type UsageStatus,
} from "@/lib/byok/client";
import {
  User,
  KeyRound,
  ShieldCheck,
  Keyboard,
  ChevronRight,
  SlidersHorizontal,
} from "lucide-react";

const settingsSections = [
  {
    title: "Profile",
    description: "Manage your identity and workspace preferences.",
    icon: User,
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
    description: "Use your own free Gemini key (optional) — the shared key stays the default.",
    icon: KeyRound,
    status: "Optional",
  },
];

const scopeLabels: Record<string, string> = {
  chat: "Chat",
  build: "App builds",
  agent: "Agent edits",
  generate: "Generate",
};

const shortcuts = [
  { keys: ["Ctrl", "Enter"], label: "Send message" },
  { keys: ["Shift", "Enter"], label: "New line" },
  { keys: ["Esc"], label: "Close dialog" },
];

export default function SettingsPage() {
  const { configured, user, loading, signOut } = useAuth();
  const [displayName, setDisplayName] = useState("");
  const [profileStatus, setProfileStatus] = useState("");

  // BYOK + quota meter state.
  const [byokStatus, setByokStatus] = useState<ByokStatus | null>(null);
  const [byokLoaded, setByokLoaded] = useState(false);
  const [byokKeyInput, setByokKeyInput] = useState("");
  const [byokMessage, setByokMessage] = useState("");
  const [byokSaving, setByokSaving] = useState(false);
  const [useOwnKey, setUseOwnKeyState] = useState(() => shouldUseOwnKey());
  const [usage, setUsage] = useState<UsageStatus | null>(null);

  const refreshByokAndUsage = async () => {
    const [status, usageStatus] = await Promise.all([
      fetchByokStatus(),
      fetchUsage(),
    ]);
    setByokStatus(status);
    setUsage(usageStatus);
  };

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    void (async () => {
      await refreshByokAndUsage();
      if (!cancelled) setByokLoaded(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  const handleSaveKey = async () => {
    if (!byokKeyInput.trim()) {
      setByokMessage("Paste your Gemini API key first.");
      return;
    }
    setByokSaving(true);
    setByokMessage("Verifying your key with Google…");
    const error = await saveByokKey(byokKeyInput.trim());
    setByokSaving(false);
    if (error) {
      setByokMessage(error);
      return;
    }
    setByokKeyInput("");
    setByokMessage("Key verified and saved. It is stored encrypted on the server.");
    await refreshByokAndUsage();
  };

  const handleRevokeKey = async () => {
    setByokSaving(true);
    setByokMessage("");
    const error = await revokeByokKey();
    setByokSaving(false);
    if (error) {
      setByokMessage(error);
      return;
    }
    setUseOwnKey(false);
    setUseOwnKeyState(false);
    setByokMessage("Your key was removed. Chats now use the shared key.");
    await refreshByokAndUsage();
  };

  const handleToggleUseOwnKey = (checked: boolean) => {
    setUseOwnKey(checked);
    setUseOwnKeyState(checked);
  };

  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    void (async () => {
      const profile = await fetchProfile(user.id);
      if (!cancelled && profile?.displayName) {
        setDisplayName(profile.displayName);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user]);

  const saveProfile = async () => {
    if (!user) return;
    setProfileStatus("Saving…");
    const ok = await upsertProfile(user.id, {
      email: user.email ?? null,
      displayName: displayName.trim() || null,
    });
    setProfileStatus(ok ? "Profile saved." : "Could not save your profile. Please try again.");
  };

  const handleSignOut = async () => {
    // signOut returns false when Supabase did not confirm the sign-out
    // (e.g. network failure) — say so instead of silently staying put.
    setProfileStatus("");
    const ok = await signOut();
    if (!ok) {
      setProfileStatus(
        "Could not sign out. Check your connection and try again."
      );
    }
  };

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
                  Manage your account and see what is available in
                  your workspace.
                </p>
              </div>

              <div className="flex w-fit items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.03] px-3 py-2">
                <span className="h-1.5 w-1.5 rounded-full bg-[#D4AF37]" />
                <span className="text-xs text-zinc-400">
                  Workspace preferences
                </span>
              </div>
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
                    if (section.title === "Profile") {
                      document
                        .getElementById("account-settings")
                        ?.scrollIntoView({ behavior: "smooth" });
                    }
                    if (section.title === "API Keys") {
                      document
                        .getElementById("byok-settings")
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

        {/* ACCOUNT */}
        <section id="account-settings" className="mb-10 scroll-mt-24">
          <div className="mb-5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#D4AF37]">
              Profile
            </p>

            <h2 className="mt-2 text-xl font-semibold tracking-tight text-white">
              Your account
            </h2>
          </div>

          <div className="rounded-2xl border border-white/[0.07] bg-[#111113] p-5">
            {loading ? (
              <p className="text-sm leading-6 text-zinc-400">
                Checking your account…
              </p>
            ) : !configured ? (
              <p className="text-sm leading-6 text-zinc-400">
                Accounts are not connected on this deployment yet — the
                Supabase environment variables are missing. You are browsing
                in guest mode; chats and projects stay in this browser.
              </p>
            ) : !user ? (
              <div className="flex flex-wrap items-center justify-between gap-4">
                <p className="text-sm leading-6 text-zinc-400">
                  You are in guest mode. Sign in to sync chats and projects
                  to your account across devices.
                </p>

                <Link
                  href="/auth"
                  className="inline-flex items-center gap-2 rounded-lg bg-[#D4AF37] px-3.5 py-2 text-xs font-semibold text-black transition hover:bg-[#E2C259]"
                >
                  Sign in
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
                    Email
                  </p>
                  <p className="mt-1 text-sm text-zinc-200">{user.email}</p>
                </div>

                <div>
                  <label
                    htmlFor="display-name"
                    className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500"
                  >
                    Display name
                  </label>

                  <div className="mt-2 flex flex-wrap gap-3">
                    <input
                      id="display-name"
                      value={displayName}
                      onChange={(event) => setDisplayName(event.target.value)}
                      placeholder="Your name"
                      className="h-10 min-w-56 flex-1 rounded-lg border border-white/[0.08] bg-[#0D0D0D] px-3 text-sm text-zinc-100 outline-none transition placeholder:text-zinc-600 focus:border-[#D4AF37]/40"
                    />

                    <button
                      type="button"
                      onClick={() => void saveProfile()}
                      className="inline-flex h-10 items-center rounded-lg bg-[#D4AF37] px-4 text-xs font-semibold text-black transition hover:bg-[#E2C259]"
                    >
                      Save profile
                    </button>

                    <button
                      type="button"
                      onClick={() => void handleSignOut()}
                      className="inline-flex h-10 items-center rounded-lg border border-white/[0.1] px-4 text-xs font-medium text-zinc-300 transition hover:border-white/[0.2] hover:text-white"
                    >
                      Sign out
                    </button>
                  </div>

                  {profileStatus && (
                    <p className="mt-2 text-xs text-zinc-500">{profileStatus}</p>
                  )}
                </div>
              </div>
            )}
          </div>
        </section>

        {/* USAGE TODAY */}
        <section id="usage-settings" className="scroll-mt-24">
          <div className="mb-5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#D4AF37]">
              Usage
            </p>

            <h2 className="mt-2 text-xl font-semibold tracking-tight text-white">
              Today&apos;s free allowance
            </h2>

            <p className="mt-1 text-sm text-zinc-500">
              How much of today&apos;s shared allowance you have used.
              {usage?.byokActive
                ? " You are running on your own key, so the shared allowance doesn't bind you — these are still your counts for today."
                : " Bring your own key below if you hit the limit."}
            </p>
          </div>

          <div className="rounded-2xl border border-white/[0.07] bg-[#111113] p-5">
            {!usage ? (
              <p className="text-sm leading-6 text-zinc-400">
                Usage is not available right now. Your chats still work —
                this meter is best-effort.
              </p>
            ) : (
              <div className="space-y-4">
                {usage.meters.map((meter) => (
                  <div key={meter.scope}>
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="text-xs font-medium text-zinc-200">
                        {scopeLabels[meter.scope] ?? meter.scope}
                      </span>
                      <span className="text-xs text-zinc-500">
                        {meter.used} of {meter.limit} used
                        {meter.overLimit ? " — limit reached" : ""}
                      </span>
                    </div>
                    <div
                      className="mt-2 h-2 overflow-hidden rounded-full bg-white/[0.06]"
                      role="progressbar"
                      aria-valuenow={meter.used}
                      aria-valuemin={0}
                      aria-valuemax={meter.limit}
                      aria-label={`${scopeLabels[meter.scope] ?? meter.scope} usage today`}
                    >
                      <div
                        className={`h-full rounded-full transition-all ${
                          meter.overLimit ? "bg-red-400" : "bg-[#D4AF37]"
                        }`}
                        style={{ width: `${meter.percentUsed}%` }}
                      />
                    </div>
                  </div>
                ))}
                <p className="text-[11px] leading-5 text-zinc-600">
                  {usage.source === "db"
                    ? "Counts from today's hourly totals (UTC day)."
                    : "Counts from this server instance's rate limiter (last 24 hours) — the database totals aren't available on this deployment."}
                </p>
              </div>
            )}
          </div>
        </section>

        {/* YOUR API KEY (BYOK) */}
        <section id="byok-settings" className="scroll-mt-24">
          <div className="mb-5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#D4AF37]">
              API Keys
            </p>

            <h2 className="mt-2 text-xl font-semibold tracking-tight text-white">
              Your own Gemini key
            </h2>

            <p className="mt-1 text-sm text-zinc-500">
              Optional. Get a free key from Google AI Studio (no card
              needed) and your chats run on your own quota instead of the
              shared one. The shared key stays the default — nothing
              changes unless you turn this on.
            </p>
          </div>

          <div className="rounded-2xl border border-white/[0.07] bg-[#111113] p-5">
            {loading ? (
              <p className="text-sm leading-6 text-zinc-400">
                Checking your account…
              </p>
            ) : !user ? (
              <p className="text-sm leading-6 text-zinc-400">
                Sign in to add your own key. Guests always use the shared
                key.
              </p>
            ) : !byokLoaded ? (
              <p className="text-sm leading-6 text-zinc-400">
                Loading your key status…
              </p>
            ) : byokStatus && !byokStatus.encryptionConfigured ? (
              <p className="text-sm leading-6 text-zinc-400">
                Your own key can&apos;t be stored on this deployment yet —
                the server&apos;s key encryption is not configured. The
                shared key stays the default, and nothing you paste here
                would be stored. (Deployment owner: set{" "}
                <code className="text-zinc-300">BYOK_ENCRYPTION_KEY</code>{" "}
                and run{" "}
                <code className="text-zinc-300">
                  supabase/byok-usage.sql
                </code>
                .)
              </p>
            ) : (
              <div className="space-y-4">
                {byokStatus?.hasKey ? (
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="text-sm leading-6 text-zinc-300">
                      Key saved{" "}
                      <span className="text-zinc-500">
                        (…{byokStatus.keyLast4})
                      </span>
                      {byokStatus.verifiedAt
                        ? ` — verified ${new Date(byokStatus.verifiedAt).toLocaleDateString()}`
                        : ""}
                      . Only the last 4 characters are shown; the full key
                      is stored encrypted on the server and never leaves it.
                    </p>
                    <button
                      type="button"
                      disabled={byokSaving}
                      onClick={() => void handleRevokeKey()}
                      className="inline-flex h-10 items-center rounded-lg border border-white/[0.1] px-4 text-xs font-medium text-zinc-300 transition hover:border-white/[0.2] hover:text-white disabled:opacity-50"
                    >
                      Remove key
                    </button>
                  </div>
                ) : (
                  <p className="text-sm leading-6 text-zinc-400">
                    No key saved. Your key is verified with Google before
                    it is stored, and stored encrypted — never in plain
                    text.
                  </p>
                )}

                <div>
                  <label
                    htmlFor="byok-key"
                    className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500"
                  >
                    {byokStatus?.hasKey
                      ? "Replace key (paste a new one to rotate)"
                      : "Gemini API key"}
                  </label>
                  <div className="mt-2 flex flex-wrap gap-3">
                    <input
                      id="byok-key"
                      type="password"
                      autoComplete="off"
                      value={byokKeyInput}
                      onChange={(event) => setByokKeyInput(event.target.value)}
                      placeholder="AIza…"
                      className="h-10 min-w-56 flex-1 rounded-lg border border-white/[0.08] bg-[#0D0D0D] px-3 text-sm text-zinc-100 outline-none transition placeholder:text-zinc-600 focus:border-[#D4AF37]/40"
                    />
                    <button
                      type="button"
                      disabled={byokSaving}
                      onClick={() => void handleSaveKey()}
                      className="inline-flex h-10 items-center rounded-lg bg-[#D4AF37] px-4 text-xs font-semibold text-black transition hover:bg-[#E2C259] disabled:opacity-50"
                    >
                      {byokSaving ? "Verifying…" : "Save & verify"}
                    </button>
                  </div>
                </div>

                {byokStatus?.hasKey && (
                  <label className="flex cursor-pointer items-start gap-3 text-sm text-zinc-300">
                    <input
                      type="checkbox"
                      checked={useOwnKey}
                      onChange={(event) =>
                        handleToggleUseOwnKey(event.target.checked)
                      }
                      className="mt-0.5 h-4 w-4 shrink-0 accent-[#D4AF37]"
                    />
                    <span>
                      Use my key for chats and agent edits
                      <span className="block text-xs text-zinc-500">
                        Off means the shared key, even with a key saved.
                      </span>
                    </span>
                  </label>
                )}

                {byokMessage && (
                  <p className="text-xs leading-5 text-zinc-500">{byokMessage}</p>
                )}
              </div>
            )}
          </div>
        </section>

        {/* NOTIFICATIONS + INSTALL */}
        <section>
          <div className="mb-5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#D4AF37]">
              Notifications
            </p>

            <h2 className="mt-2 text-xl font-semibold tracking-tight text-white">
              Stay in the loop
            </h2>

            <p className="mt-1 text-sm text-zinc-500">
              Install ANVIX on this device and choose how it reaches you.
            </p>
          </div>

          <div className="grid gap-3">
            <div className="rounded-2xl border border-white/[0.07] bg-[#111113] p-5 sm:p-6">
              <h3 className="text-sm font-semibold text-white">
                Install ANVIX
              </h3>
              <p className="mt-1 text-xs leading-5 text-zinc-500">
                Add ANVIX to your home screen for full-screen, app-like use.
              </p>
              <div className="mt-4">
                <InstallPrompt />
              </div>
            </div>

            <PushSettings />

            <TelegramSettings />

            <EmailSettings />
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
      </div>
    </AppShell>
  );
}
