"use client";

import { useEffect, useState } from "react";
import { Mail } from "lucide-react";
import { getAuthHeaders } from "@/lib/api/auth-headers";

/**
 * Email notification settings card.
 *
 * Shows the Resend status honestly: unconfigured without RESEND_API_KEY,
 * and — once configured — the sender address and how much of today's
 * free-tier allowance (100/day hard cap) this instance has used. The
 * test buttons send a welcome / digest sample to the user's own address.
 */
export default function EmailSettings() {
  const [loading, setLoading] = useState(true);
  const [configured, setConfigured] = useState(false);
  const [from, setFrom] = useState<string | null>(null);
  const [dailyUsed, setDailyUsed] = useState<number | null>(null);
  const [dailyLimit, setDailyLimit] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        const headers = await getAuthHeaders();
        const response = await fetch("/api/notifications/email/status", {
          headers,
        });
        const data = (await response.json()) as {
          configured?: boolean;
          from?: string;
          dailyUsed?: number;
          dailyLimit?: number;
        };
        if (cancelled) return;
        setConfigured(data.configured === true);
        setFrom(data.from ?? null);
        setDailyUsed(data.dailyUsed ?? null);
        setDailyLimit(data.dailyLimit ?? null);
      } catch {
        if (!cancelled) setStatus("Could not check email status.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const sendSample = async (kind: "welcome" | "digest") => {
    setBusy(true);
    setStatus(`Sending ${kind} sample…`);
    try {
      const headers = await getAuthHeaders();
      const response = await fetch("/api/notifications/email/send", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...headers },
        body: JSON.stringify({ kind }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        setStatus(data.error ?? "Could not send the sample email.");
      } else {
        setStatus(
          `Sample ${kind} email sent — check your inbox (and spam folder).`
        );
      }
    } catch {
      setStatus("Could not send the sample email.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rounded-2xl border border-white/[0.07] bg-[#111113] p-5 sm:p-6">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/[0.08] bg-black/20">
          <Mail className="h-4 w-4 text-[#D4AF37]" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-white">
            Email notifications
          </h3>
          <p className="mt-1 text-xs leading-5 text-zinc-500">
            Welcome, password-reset, and digest mail via Resend (free tier:
            3,000/month, hard-capped at 100/day). This fills the gap left
            by Supabase auth email, which is capped at 2/hour by default.
          </p>
        </div>
      </div>

      <div className="mt-4">
        {loading ? (
          <p className="text-xs text-zinc-500">Checking email status…</p>
        ) : !configured ? (
          <p className="text-xs leading-5 text-zinc-500">
            Email is not configured on this deployment yet — the server
            needs a Resend API key (see docs/notifications.md). Nothing to
            send until then.
          </p>
        ) : (
          <div className="space-y-3">
            <p className="text-xs leading-5 text-zinc-400">
              Sending from <span className="font-mono">{from}</span>
              {dailyUsed !== null && dailyLimit !== null && (
                <> — {dailyUsed} of {dailyLimit} emails used today.</>
              )}
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => void sendSample("welcome")}
                disabled={busy}
                className="inline-flex h-10 items-center rounded-lg bg-[#D4AF37] px-4 text-xs font-semibold text-black transition hover:bg-[#E2C259] disabled:opacity-60"
              >
                Send welcome sample
              </button>
              <button
                type="button"
                onClick={() => void sendSample("digest")}
                disabled={busy}
                className="inline-flex h-10 items-center rounded-lg border border-white/[0.1] px-4 text-xs font-medium text-zinc-300 transition hover:border-white/[0.2] hover:text-white disabled:opacity-60"
              >
                Send digest sample
              </button>
            </div>
          </div>
        )}

        {status && <p className="mt-3 text-xs text-zinc-500">{status}</p>}
      </div>
    </div>
  );
}
