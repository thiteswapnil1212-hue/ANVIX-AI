"use client";

import Image from "next/image";
import { useState } from "react";
import {
  ChevronDown,
  Fingerprint,
  GitBranch,
  List,
  Pencil,
  ShieldCheck,
  X,
} from "lucide-react";
import {
  formatRelativeTime,
  type ApprovalEntry,
} from "./ApprovalsHistory";

type PanelTab = "activity" | "approvals" | "identity";

type ApprovalsPanelProps = {
  open: boolean;
  onClose: () => void;
  approvals: ApprovalEntry[];
  /** "Connected" when the last /api/chat call succeeded; "Not connected" after a key error. */
  status: "connected" | "not-connected";
  /** Shown on the Identity tab, from the existing auth provider. */
  userLabel?: string;
  onOpenSettings?: () => void;
};

function ApprovalIcon({ icon }: { icon: string }) {
  // lucide has no brand icons — GitHub approvals get a branch mark.
  const Icon = icon === "github" ? GitBranch : ShieldCheck;

  return (
    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#262628] text-[#EDEDED]">
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
      className="w-full rounded-xl text-left transition-colors hover:bg-white/[0.03] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0074E8]"
    >
      <span className="flex items-start gap-3 px-1 py-2">
        <ApprovalIcon icon={entry.icon} />

        <span className="min-w-0 flex-1">
          <span className="flex items-start justify-between gap-2">
            <span className="text-sm font-semibold leading-5 text-white">
              {entry.title}
            </span>

            <ChevronDown
              className={`mt-0.5 h-4 w-4 shrink-0 text-[#A1A1AA] transition-transform ${
                expanded ? "rotate-180" : ""
              }`}
              aria-hidden="true"
            />
          </span>

          <span
            className={`mt-1 block text-[13px] leading-5 text-[#A1A1AA] ${
              expanded ? "" : "line-clamp-3"
            }`}
          >
            {entry.description}
          </span>

          <span className="mt-1.5 block text-xs text-[#A1A1AA]">
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
 * status, segmented Activity / Approvals / Identity tabs, and the
 * Approvals history list. Data is localStorage only; the list starts empty
 * (no fake GitHub entries are seeded).
 */
export default function ApprovalsPanel({
  open,
  onClose,
  approvals,
  status,
  userLabel = "Guest",
  onOpenSettings,
}: ApprovalsPanelProps) {
  const [tab, setTab] = useState<PanelTab>("approvals");

  if (!open) {
    return null;
  }

  const connected = status === "connected";

  const tabs: { key: PanelTab; label: string; Icon: typeof List }[] = [
    { key: "activity", label: "Activity", Icon: List },
    { key: "approvals", label: "Approvals", Icon: ShieldCheck },
    { key: "identity", label: "Identity", Icon: Fingerprint },
  ];

  return (
    <div className="relative flex h-full w-full flex-col overflow-hidden bg-[#181819] text-[#EDEDED]">
      <button
        type="button"
        onClick={onClose}
        aria-label="Close panel"
        title="Close panel"
        className="absolute right-4 top-4 z-10 flex h-9 w-9 items-center justify-center rounded-full text-[#A1A1AA] transition-colors hover:bg-white/[0.06] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0074E8]"
      >
        <X className="h-5 w-5" strokeWidth={1.8} aria-hidden="true" />
      </button>

      {/* Avatar block */}
      <div className="flex shrink-0 flex-col items-center px-4 pt-16">
        <div className="relative">
          <span className="block h-[110px] w-[110px] overflow-hidden rounded-full bg-[#262628]">
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
            className="absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-[#262628] text-[#EDEDED] transition-colors hover:bg-[#313132] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0074E8]"
          >
            <Pencil className="h-3.5 w-3.5" strokeWidth={1.8} aria-hidden="true" />
          </button>
        </div>

        <p className="mt-4 text-xl font-semibold text-white">AGI</p>

        <p className="mt-1.5 flex items-center gap-2 text-sm text-[#A1A1AA]">
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
          className="flex h-10 w-full items-center rounded-full bg-[#28292B] p-1"
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
                className={`flex h-full flex-1 items-center justify-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0074E8] ${
                  isActive
                    ? "bg-[#424344] text-white"
                    : "text-[#A1A1AA] hover:text-[#EDEDED]"
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
              <p className="mt-4 text-sm leading-6 text-[#A1A1AA]">
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

        {tab === "activity" && (
          <p className="text-sm leading-6 text-[#A1A1AA]">
            No activity yet.
          </p>
        )}

        {tab === "identity" && (
          <p className="text-sm leading-6 text-[#A1A1AA]">
            Signed in as {userLabel}.
          </p>
        )}
      </div>
    </div>
  );
}
