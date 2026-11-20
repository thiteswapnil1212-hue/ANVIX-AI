"use client";

import Image from "next/image";
import { useState } from "react";
import {
  ChevronDown,
  Fingerprint,
  GitBranch,
  Globe,
  Pencil,
  ShieldCheck,
  X,
} from "lucide-react";
import {
  formatRelativeTime,
  type ApprovalEntry,
} from "./ApprovalsHistory";

type PanelTab = "approvals" | "identity";

type ApprovalsPanelProps = {
  open: boolean;
  onClose: () => void;
  approvals: ApprovalEntry[];
  /** "Connected" when the last /api/chat call succeeded; "Not connected" after a key error. */
  status: "connected" | "not-connected";
  /** Display name — email when signed in, "Guest" otherwise. */
  userName?: string;
  /** Email when signed in; absent for guests. */
  userEmail?: string;
  /** "Cloud sync on" when signed in, guest line otherwise. */
  accountState?: string;
  signedIn?: boolean;
  onSignIn?: () => void;
  onSignOut?: () => void;
  onOpenSettings?: () => void;
};

function ApprovalIcon({ icon }: { icon: string }) {
  // lucide has no brand icons — GitHub approvals get a branch mark,
  // web-task approvals get a globe.
  const Icon =
    icon === "github"
      ? GitBranch
      : icon === "globe"
        ? Globe
        : ShieldCheck;

  return (
    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-surface-2 text-ink">
      <Icon className="h-4.5 w-4.5" strokeWidth={1.8} aria-hidden="true" />
    </span>
  );
}

function ApprovalCard({ entry }: { entry: ApprovalEntry }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <button
      type="button"
      onClick={() => setExpanded((current) => !current)}
      aria-expanded={expanded}
      className="w-full rounded-xl text-left transition-colors hover:bg-white/[0.03] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-action"
    >
      <span className="flex items-start gap-3 px-1 py-2">
        <ApprovalIcon icon={entry.icon} />

        <span className="min-w-0 flex-1">
          <span className="flex items-start justify-between gap-2">
            <span className="text-sm font-semibold leading-5 text-white">
              {entry.title}
            </span>

            <ChevronDown
              className={`mt-0.5 h-4 w-4 shrink-0 text-ink-muted transition-transform ${
                expanded ? "rotate-180" : ""
              }`}
              aria-hidden="true"
            />
          </span>

          <span
            className={`mt-1 block text-[13px] leading-5 text-ink-muted ${
              expanded ? "" : "line-clamp-3"
            }`}
          >
            {entry.description}
          </span>

          <span className="mt-1.5 block text-xs text-ink-muted">
            {entry.status === "allowed" ? "Allowed" : "Denied"}
            {" · "}
            {formatRelativeTime(entry.createdAt)}
          </span>
        </span>
      </span>
    </button>
  );
}

/**
 * Right panel (~420 px, §2.6 of the AGI spec): AGI avatar (ANVIX's own
 * public/logo.png, circular crop — never Muse's character), name, Connected
 * status, segmented Approvals / Identity tabs, and the Approvals history
 * list. Data is localStorage only; the list starts empty (no fake GitHub
 * entries are seeded). The Activity tab was folded away — there is no
 * activity data source, and an eternal "No activity yet" is a dead tab.
 */
export default function ApprovalsPanel({
  open,
  onClose,
  approvals,
  status,
  userName = "Guest",
  userEmail,
  accountState = "Guest — chats stay in this browser",
  signedIn = false,
  onSignIn,
  onSignOut,
  onOpenSettings,
}: ApprovalsPanelProps) {
  const [tab, setTab] = useState<PanelTab>("approvals");

  if (!open) {
    return null;
  }

  const connected = status === "connected";

  const tabs: { key: PanelTab; label: string; Icon: typeof ShieldCheck }[] = [
    { key: "approvals", label: "Approvals", Icon: ShieldCheck },
    { key: "identity", label: "Identity", Icon: Fingerprint },
  ];

  return (
    <div className="relative flex h-full w-full flex-col overflow-hidden bg-app-bg text-ink">
      <button
        type="button"
        onClick={onClose}
        aria-label="Close panel"
        title="Close panel"
        className="absolute right-4 top-4 z-10 flex h-9 w-9 items-center justify-center rounded-full text-ink-muted transition-colors hover:bg-white/[0.06] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-action"
      >
        <X className="h-5 w-5" strokeWidth={1.8} aria-hidden="true" />
      </button>

      {/* Avatar block */}
      <div className="flex shrink-0 flex-col items-center px-4 pt-16">
        <div className="relative">
          <span className="block h-[110px] w-[110px] overflow-hidden rounded-full bg-surface-2">
            <Image
              src="/logo.png"
              alt="AGI avatar"
              width={110}
              height={110}
              className="h-full w-full object-cover"
            />
          </span>

          <button
            type="button"
            onClick={onOpenSettings}
            aria-label="Edit profile"
            title="Edit profile"
            className="absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-surface-2 text-ink transition-colors hover:bg-surface-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-action"
          >
            <Pencil className="h-3.5 w-3.5" strokeWidth={1.8} aria-hidden="true" />
          </button>
        </div>

        <p className="mt-4 text-xl font-semibold text-white">AGI</p>

        <p className="mt-1.5 flex items-center gap-2 text-sm text-ink-muted">
          <span
            className={`h-2 w-2 rounded-full ${
              connected ? "bg-[#07B123]" : "bg-zinc-600"
            }`}
            aria-hidden="true"
          />
          {connected ? "Connected" : "Not connected"}
        </p>
      </div>

      {/* Segmented control */}
      <div className="shrink-0 px-4 pt-8">
        <div
          role="tablist"
          aria-label="Panel sections"
          className="flex h-10 w-full items-center rounded-full bg-segmented p-1"
        >
          {tabs.map(({ key, label, Icon }) => {
            const isActive = tab === key;

            return (
              <button
                key={key}
                type="button"
                role="tab"
                aria-selected={isActive}
                aria-label={label}
                title={label}
                onClick={() => setTab(key)}
                className={`flex h-full flex-1 items-center justify-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-action ${
                  isActive
                    ? "bg-segmented-active text-white"
                    : "text-ink-muted hover:text-ink"
                }`}
              >
                <Icon className="h-4.5 w-4.5" strokeWidth={1.8} aria-hidden="true" />
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab content */}
      <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-6 pt-6">
        {tab === "approvals" && (
          <div>
            <h2 className="text-[15px] font-semibold text-white">
              Approvals history
            </h2>

            {approvals.length === 0 ? (
              <p className="mt-4 text-sm leading-6 text-ink-muted">
                No approvals yet — approvals you allow will appear here.
              </p>
            ) : (
              <div className="mt-3 flex flex-col gap-4">
                {approvals.map((entry) => (
                  <ApprovalCard key={entry.id} entry={entry} />
                ))}
              </div>
            )}
          </div>
        )}

        {tab === "identity" && (
          <div>
            <div className="flex items-center gap-3">
              <span className="block h-12 w-12 shrink-0 overflow-hidden rounded-full bg-surface-2">
                <Image
                  src="/logo.png"
                  alt=""
                  width={48}
                  height={48}
                  className="h-full w-full object-cover"
                  aria-hidden="true"
                />
              </span>

              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-white">
                  {userName}
                </p>

                {userEmail && (
                  <p className="mt-0.5 truncate text-xs text-ink-muted">
                    {userEmail}
                  </p>
                )}
              </div>
            </div>

            <p className="mt-4 text-sm leading-6 text-ink-muted">
              {accountState}
            </p>

            <div className="mt-4 flex flex-col gap-2">
              <button
                type="button"
                onClick={onOpenSettings}
                className="w-full rounded-full bg-action px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-action-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
              >
                Settings
              </button>

              {signedIn ? (
                <button
                  type="button"
                  onClick={onSignOut}
                  className="w-full rounded-full bg-surface-2 px-4 py-2.5 text-sm font-medium text-zinc-200 transition-colors hover:bg-surface-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
                >
                  Sign out
                </button>
              ) : (
                <button
                  type="button"
                  onClick={onSignIn}
                  className="w-full rounded-full bg-surface-2 px-4 py-2.5 text-sm font-medium text-zinc-200 transition-colors hover:bg-surface-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
                >
                  Sign in
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
