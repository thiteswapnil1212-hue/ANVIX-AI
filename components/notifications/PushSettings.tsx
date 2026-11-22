"use client";

import { useEffect, useState } from "react";
import { Bell, BellOff } from "lucide-react";
import { getAuthHeaders } from "@/lib/api/auth-headers";
import {
  getPushSubscriptionState,
  isPushSupported,
  subscribeToPush,
  unsubscribeFromPush,
} from "@/lib/notify/push-client";

/**
 * Push notification settings card.
 *
 * States are shown honestly, never faked:
 * - browser without PushManager → "not supported here";
 * - VAPID keys missing on the deployment → "not configured";
 * - signed out → sign-in prompt (the server requires auth);
 * - subscribed → disable + send-test.
 */
export default function PushSettings() {
  const [loading, setLoading] = useState(true);
  const [configured, setConfigured] = useState(false);
  const [publicKey, setPublicKey] = useState<string | null>(null);
  const [supported] = useState(() => isPushSupported());
  const [subscribed, setSubscribed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        const response = await fetch("/api/push/config");
        const data = (await response.json()) as {
          configured?: boolean;
          publicKey?: string | null;
        };
        if (cancelled) return;
        setConfigured(data.configured === true);
        setPublicKey(data.publicKey ?? null);
        if (data.configured) {
          const state = await getPushSubscriptionState();
          if (!cancelled) setSubscribed(state.subscribed);
        }
      } catch {
        if (!cancelled) setStatus("Could not check push notification status.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const enable = async () => {
    if (!publicKey) return;
    setBusy(true);
    setStatus("");
    const result = await subscribeToPush(publicKey);
    setBusy(false);
    if (result.ok) {
      setSubscribed(true);
      setStatus("Push notifications enabled on this browser.");
    } else {
      setStatus(result.error);
    }
  };

  const disable = async () => {
    setBusy(true);
    setStatus("");
    const result = await unsubscribeFromPush();
    setBusy(false);
    if (result.ok) {
      setSubscribed(false);
      setStatus("Push notifications disabled on this browser.");
    } else {
      setStatus(result.error);
    }
  };

  const sendTest = async () => {
    setBusy(true);
    setStatus("Sending test notification…");
    try {
      const headers = await getAuthHeaders();
      const response = await fetch("/api/push/send", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...headers },
        body: JSON.stringify({
          title: "ANVIX test notification",
          body: "Push notifications are working on this browser.",
          url: "/settings",
          tag: "anvix-test",
        }),
      });
      const data = (await response.json()) as {
        error?: string;
        sent?: number;
        message?: string;
      };
      if (!response.ok) {
        setStatus(data.error ?? "Could not send the test notification.");
      } else if (data.sent === 0) {
        setStatus(data.message ?? "No push subscriptions found.");
      } else {
        setStatus("Test notification sent — it should appear shortly.");
      }
    } catch {
      setStatus("Could not send the test notification.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rounded-2xl border border-white/[0.07] bg-[#111113] p-5 sm:p-6">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/[0.08] bg-black/20">
          <Bell className="h-4 w-4 text-[#D4AF37]" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-white">
            Push notifications
          </h3>
          <p className="mt-1 text-xs leading-5 text-zinc-500">
            Get notified in this browser when a task finishes or the daily
            question arrives — even when ANVIX is closed.
          </p>
        </div>
      </div>

      <div className="mt-4">
        {loading ? (
          <p className="text-xs text-zinc-500">Checking push status…</p>
        ) : !supported ? (
          <p className="text-xs leading-5 text-zinc-500">
            Web Push is not supported in this browser. Try Chrome, Edge, or
            Firefox — or install ANVIX on Android, where push works from the
            home-screen app.
          </p>
        ) : !configured ? (
          <p className="text-xs leading-5 text-zinc-500">
            Push notifications are not configured on this deployment yet —
            the server needs VAPID keys (see docs/notifications.md). Nothing
            to enable until then.
          </p>
        ) : (
          <div className="flex flex-wrap items-center gap-3">
            {subscribed ? (
              <>
                <button
                  type="button"
                  onClick={() => void disable()}
                  disabled={busy}
                  className="inline-flex h-10 items-center gap-2 rounded-lg border border-white/[0.1] px-4 text-xs font-medium text-zinc-300 transition hover:border-white/[0.2] hover:text-white disabled:opacity-60"
                >
                  <BellOff className="h-4 w-4" />
                  Disable push
                </button>
                <button
                  type="button"
                  onClick={() => void sendTest()}
                  disabled={busy}
                  className="inline-flex h-10 items-center rounded-lg bg-[#D4AF37] px-4 text-xs font-semibold text-black transition hover:bg-[#E2C259] disabled:opacity-60"
                >
                  Send test notification
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => void enable()}
                disabled={busy}
                className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#D4AF37] px-4 text-xs font-semibold text-black transition hover:bg-[#E2C259] disabled:opacity-60"
              >
                <Bell className="h-4 w-4" />
                Enable push notifications
              </button>
            )}
          </div>
        )}

        {status && <p className="mt-3 text-xs text-zinc-500">{status}</p>}
      </div>
    </div>
  );
}
