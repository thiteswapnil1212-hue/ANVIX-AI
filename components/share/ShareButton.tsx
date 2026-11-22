"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Link2, Share2, X } from "lucide-react";

import { useAuth } from "@/components/auth/AuthProvider";
import { supabase } from "@/lib/supabase/client";
import {
  buildShareUrl,
  isShareLive,
  SHARE_EXPIRY_OPTIONS,
  type ShareExpiryOption,
  type SharePermission,
  type ShareRecord,
  type ShareResourceType,
} from "@/lib/share/share";
import {
  countShareReports,
  createShare,
  listSharesForResource,
  revokeShare,
} from "@/lib/share/owner";

interface ShareButtonProps {
  resourceType: ShareResourceType;
  /**
   * Cloud id of the resource. Null when the resource only exists
   * locally so far (e.g. a workspace project never saved to the
   * cloud) — then `ensureResourceId` saves it first and returns its
   * cloud id. Omit both only for resources that always have an id.
   */
  resourceId: string | null;
  ensureResourceId?: () => Promise<string | null>;
  resourceLabel: string;
  className?: string;
}

/**
 * Share button + popover: create a public link for one chat or
 * generated app, copy it, see live links, revoke one, and see how
 * many abuse reports each link has.
 *
 * Sharing needs a signed-in user (the link points at their cloud
 * row) and the shares tables (SQL run). Both gaps show an honest
 * message instead of a dead button.
 */
export default function ShareButton({
  resourceType,
  resourceId,
  ensureResourceId,
  resourceLabel,
  className = "",
}: ShareButtonProps) {
  const { user, loading: authLoading } = useAuth();
  const [open, setOpen] = useState(false);
  const [effectiveResourceId, setEffectiveResourceId] = useState<string | null>(
    resourceId
  );
  const [ensuring, setEnsuring] = useState(false);
  const [shares, setShares] = useState<ShareRecord[] | null>(null);
  const [reportCounts, setReportCounts] = useState<Record<string, number>>({});
  const [loadingShares, setLoadingShares] = useState(false);
  const [creating, setCreating] = useState(false);
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);
  const [expiry, setExpiry] = useState<ShareExpiryOption["id"]>("30d");
  const [permission, setPermission] = useState<SharePermission>("view");
  const [error, setError] = useState<string | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setEffectiveResourceId(resourceId);
  }, [resourceId]);

  async function handleToggle() {
    if (open) {
      setOpen(false);
      return;
    }
    if (!effectiveResourceId && ensureResourceId && user) {
      setEnsuring(true);
      setError(null);
      const ensured = await ensureResourceId();
      setEnsuring(false);
      if (!ensured) {
        setError(
          "Could not save this to your account first — sign in and try again."
        );
        setOpen(true);
        return;
      }
      setEffectiveResourceId(ensured);
    }
    setOpen(true);
  }

  async function refreshShares() {
    if (!supabase || !user || !effectiveResourceId) return;
    setLoadingShares(true);
    const listed = await listSharesForResource(
      supabase,
      user.id,
      resourceType,
      effectiveResourceId
    );
    setLoadingShares(false);
    if (listed === null) {
      setError(
        "Sharing is unavailable — the shares tables may not be set up yet."
      );
      return;
    }
    setShares(listed);
    const counts: Record<string, number> = {};
    for (const share of listed) {
      counts[share.id] = await countShareReports(supabase, share.id);
    }
    setReportCounts(counts);
  }

  useEffect(() => {
    if (!open) return;
    setError(null);
    void refreshShares();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open ]);

  useEffect(() => {
    if (!open) return;
    function onClickOutside(event: MouseEvent) {
      if (
        panelRef.current &&
        !panelRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [open ]);

  async function handleCreate() {
    if (!supabase || !user || !effectiveResourceId) return;
    setCreating(true);
    setError(null);
    const share = await createShare(supabase, {
      ownerId: user.id,
      resourceType,
      resourceId: effectiveResourceId,
      permission,
      expiry,
    });
    setCreating(false);
    if (!share) {
      setError(
        "Could not create the link — sharing may not be set up on this deployment yet."
      );
      return;
    }
    setShares((current) => [share, ...(current ?? [])]);
  }

  async function handleRevoke(share: ShareRecord) {
    if (!supabase || !user) return;
    setRevokingId(share.id);
    const ok = await revokeShare(supabase, user.id, share.id);
    setRevokingId(null);
    if (!ok) {
      setError("Could not revoke that link. Try again.");
      return;
    }
    setShares((current) =>
      (current ?? []).map((item) =>
        item.id === share.id ? { ...item, revoked: true } : item
      )
    );
  }

  async function handleCopy(share: ShareRecord) {
    const url = buildShareUrl(window.location.origin, share.token);
    try {
      await navigator.clipboard.writeText(url);
      setCopiedToken(share.token);
      window.setTimeout(() => {
        setCopiedToken((current) =>
          current === share.token ? null : current
        );
      }, 2000);
    } catch {
      setError("Could not copy — copy the link from the address bar instead.");
    }
  }

  const liveShares = (shares ?? []).filter((share) => isShareLive(share));

  return (
    <div
      ref={panelRef}
      className={`relative ${className}`}
      onClick={(event) => event.stopPropagation()}
    >
      <button
        type="button"
        onClick={() => void handleToggle()}
        disabled={ensuring}
        title={`Share ${resourceLabel}`}
        className="flex items-center gap-1.5 rounded-lg border border-zinc-800 bg-[#0B0B0D] px-3 py-2 text-[10px] font-medium text-zinc-400 transition hover:border-zinc-700 hover:text-zinc-200 disabled:opacity-50"
      >
        <Share2 className="h-3 w-3" />
        <span className="hidden sm:inline">
          {ensuring ? "Saving…" : "Share"}
        </span>
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-2 w-80 rounded-xl border border-zinc-800 bg-[#0D0D0F] p-4 text-left shadow-2xl">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-xs font-semibold text-zinc-100">
                Share {resourceLabel}
              </p>
              <p className="mt-1 text-[10px] leading-4 text-zinc-500">
                Anyone with the link can open it read-only. Revoke the
                link any time to close it.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close share panel"
              className="rounded p-1 text-zinc-600 transition hover:text-zinc-300"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>

          {authLoading ? (
            <p className="mt-4 text-[11px] text-zinc-500">
              Checking your account…
            </p>
          ) : !user ? (
            <p className="mt-4 text-[11px] leading-5 text-zinc-400">
              Sign in to share this {resourceType === "chat" ? "chat" : "project"} —{" "}
              <a href="/auth" className="text-[#D4AF37] underline">
                sign in
              </a>{" "}
              and the link will point at your saved copy.
            </p>
          ) : (
            <>
              <div className="mt-4 flex gap-2">
                <label className="flex-1">
                  <span className="text-[9px] uppercase tracking-[0.14em] text-zinc-600">
                    Link expires
                  </span>
                  <select
                    value={expiry}
                    onChange={(event) =>
                      setExpiry(event.target.value as ShareExpiryOption["id"])
                    }
                    className="mt-1 w-full rounded-lg border border-zinc-800 bg-[#0B0B0D] px-2 py-1.5 text-[11px] text-zinc-200 outline-none"
                  >
                    {SHARE_EXPIRY_OPTIONS.map((option) => (
                      <option key={option.id} value={option.id}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="flex-1">
                  <span className="text-[9px] uppercase tracking-[0.14em] text-zinc-600">
                    Visitors can
                  </span>
                  <select
                    value={permission}
                    onChange={(event) =>
                      setPermission(event.target.value as SharePermission)
                    }
                    className="mt-1 w-full rounded-lg border border-zinc-800 bg-[#0B0B0D] px-2 py-1.5 text-[11px] text-zinc-200 outline-none"
                  >
                    <option value="view">View only</option>
                    <option value="comment">View + comment</option>
                  </select>
                </label>
              </div>

              <button
                type="button"
                onClick={() => void handleCreate()}
                disabled={creating}
                className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-lg bg-[#D4AF37] px-3 py-2 text-[11px] font-semibold text-black transition hover:bg-[#E2C259] disabled:opacity-50"
              >
                <Link2 className="h-3 w-3" />
                {creating ? "Creating link…" : "Create share link"}
              </button>

              {error && (
                <p className="mt-3 text-[11px] leading-4 text-red-300">
                  {error}
                </p>
              )}

              <div className="mt-4 space-y-2">
                {loadingShares && (
                  <p className="text-[11px] text-zinc-500">
                    Loading your links…
                  </p>
                )}
                {!loadingShares && shares !== null && shares.length === 0 && (
                  <p className="text-[11px] text-zinc-500">
                    No links yet for this {resourceType}.
                  </p>
                )}
                {(shares ?? []).map((share) => {
                  const live = isShareLive(share);
                  const reports = reportCounts[share.id] ?? 0;
                  return (
                    <div
                      key={share.id}
                      className="rounded-lg border border-zinc-800 bg-[#0B0B0D] px-3 py-2"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p className="min-w-0 truncate font-mono text-[10px] text-zinc-400">
                          /share/{share.token.slice(0, 12)}…
                        </p>
                        <span
                          className={`shrink-0 text-[9px] font-medium ${
                            live ? "text-emerald-400" : "text-zinc-600"
                          }`}
                        >
                          {share.revoked
                            ? "Revoked"
                            : share.expires_at &&
                                new Date(share.expires_at) <= new Date()
                              ? "Expired"
                              : "Live"}
                        </span>
                      </div>
                      <p className="mt-1 text-[9px] text-zinc-600">
                        {share.permission === "comment"
                          ? "View + comment"
                          : "View only"}
                        {" · "}
                        {share.expires_at
                          ? `expires ${new Date(share.expires_at).toLocaleDateString()}`
                          : "no expiry"}
                        {reports > 0 && (
                          <span className="text-amber-400">
                            {" · "}
                            {reports} abuse report{reports === 1 ? "" : "s"}
                          </span>
                        )}
                      </p>
                      <div className="mt-2 flex gap-2">
                        <button
                          type="button"
                          onClick={() => void handleCopy(share)}
                          disabled={!live}
                          className="flex flex-1 items-center justify-center gap-1 rounded-md border border-zinc-800 px-2 py-1.5 text-[10px] font-medium text-zinc-300 transition hover:border-zinc-700 disabled:opacity-40"
                        >
                          {copiedToken === share.token ? (
                            <>
                              <Check className="h-3 w-3 text-emerald-400" />
                              Copied
                            </>
                          ) : (
                            <>
                              <Link2 className="h-3 w-3" />
                              Copy link
                            </>
                          )}
                        </button>
                        {live && (
                          <button
                            type="button"
                            onClick={() => void handleRevoke(share)}
                            disabled={revokingId === share.id}
                            className="rounded-md border border-red-900/60 px-2 py-1.5 text-[10px] font-medium text-red-300 transition hover:border-red-800 disabled:opacity-40"
                          >
                            {revokingId === share.id ? "Revoking…" : "Revoke"}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {liveShares.length > 0 && (
                <p className="mt-3 text-[9px] leading-4 text-zinc-600">
                  Shared links are public: anyone with the link can read
                  this {resourceType}. Don&apos;t share chats with private
                  information.
                </p>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
