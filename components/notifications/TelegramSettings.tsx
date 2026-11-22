"use client";

import { useEffect, useState } from "react";
import { MessageCircle, Send, Unlink } from "lucide-react";
import { getAuthHeaders } from "@/lib/api/auth-headers";

/**
 * Telegram notification settings card.
 *
 * Flow: user taps "Get link code" → an 8-character code appears (valid
 * 10 minutes) → they open the bot and send `/start <code>` → the webhook
 * links their Telegram chat. No bot token on the deployment → honest
 * "not configured" state; no bot username env → the code is shown with
 * text instructions instead of a one-tap link.
 */
export default function TelegramSettings() {
  const [loading, setLoading] = useState(true);
  const [configured, setConfigured] = useState(false);
  const [linked, setLinked] = useState(false);
  const [chatUsername, setChatUsername] = useState<string | null>(null);
  const [botUsername, setBotUsername] = useState<string | null>(null);
  const [code, setCode] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        const headers = await getAuthHeaders();
        const response = await fetch("/api/notifications/telegram/status", {
          headers,
        });
        const data = (await response.json()) as {
          configured?: boolean;
          linked?: boolean;
          botUsername?: string | null;
          chatUsername?: string | null;
        };
        if (cancelled) return;
        setConfigured(data.configured === true);
        setLinked(data.linked === true);
        setBotUsername(data.botUsername ?? null);
        setChatUsername(data.chatUsername ?? null);
      } catch {
        if (!cancelled) setStatus("Could not check Telegram status.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const getCode = async () => {
    setBusy(true);
    setStatus("");
    try {
      const headers = await getAuthHeaders();
      const response = await fetch(
        "/api/notifications/telegram/link-code",
        { method: "POST", headers }
      );
      const data = (await response.json()) as {
        error?: string;
        code?: string;
        expiresAt?: string;
        botUsername?: string | null;
      };
      if (!response.ok) {
        setStatus(data.error ?? "Could not create a link code.");
      } else {
        setCode(data.code ?? null);
        setExpiresAt(data.expiresAt ?? null);
        if (data.botUsername) setBotUsername(data.botUsername);
        setStatus("Code created — it expires in 10 minutes.");
      }
    } catch {
      setStatus("Could not create a link code.");
    } finally {
      setBusy(false);
    }
  };

  const sendTest = async () => {
    setBusy(true);
    setStatus("Sending test message…");
    try {
      const headers = await getAuthHeaders();
      const response = await fetch("/api/notifications/telegram/send-test", {
        method: "POST",
        headers,
      });
      const data = (await response.json()) as { error?: string };
      setStatus(
        response.ok
          ? "Test message sent — check Telegram."
          : (data.error ?? "Could not send the test message.")
      );
    } catch {
      setStatus("Could not send the test message.");
    } finally {
      setBusy(false);
    }
  };

  const unlink = async () => {
    setBusy(true);
    setStatus("");
    try {
      const headers = await getAuthHeaders();
      const response = await fetch("/api/notifications/telegram/unlink", {
        method: "POST",
        headers,
      });
      if (response.ok) {
        setLinked(false);
        setChatUsername(null);
        setCode(null);
        setStatus("Telegram unlinked.");
      } else {
        setStatus("Could not unlink Telegram.");
      }
    } catch {
      setStatus("Could not unlink Telegram.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rounded-2xl border border-white/[0.07] bg-[#111113] p-5 sm:p-6">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/[0.08] bg-black/20">
          <MessageCircle className="h-4 w-4 text-[#D4AF37]" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-white">
            Telegram notifications
          </h3>
          <p className="mt-1 text-xs leading-5 text-zinc-500">
            Task results and the daily question delivered to Telegram — free,
            no phone number needed. WhatsApp is not offered: its business
            API is paid per message.
          </p>
        </div>
      </div>

      <div className="mt-4">
        {loading ? (
          <p className="text-xs text-zinc-500">Checking Telegram status…</p>
        ) : !configured ? (
          <p className="text-xs leading-5 text-zinc-500">
            Telegram notifications are not configured on this deployment yet
            — the server needs a bot token (see docs/notifications.md).
            Nothing to link until then.
          </p>
        ) : linked ? (
          <div className="space-y-3">
            <p className="text-xs leading-5 text-zinc-400">
              Linked{chatUsername ? ` as @${chatUsername}` : ""}. ANVIX can
              message you on Telegram.
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => void sendTest()}
                disabled={busy}
                className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#D4AF37] px-4 text-xs font-semibold text-black transition hover:bg-[#E2C259] disabled:opacity-60"
              >
                <Send className="h-4 w-4" />
                Send test message
              </button>
              <button
                type="button"
                onClick={() => void unlink()}
                disabled={busy}
                className="inline-flex h-10 items-center gap-2 rounded-lg border border-white/[0.1] px-4 text-xs font-medium text-zinc-300 transition hover:border-white/[0.2] hover:text-white disabled:opacity-60"
              >
                <Unlink className="h-4 w-4" />
                Unlink Telegram
              </button>
            </div>
            <p className="text-xs text-zinc-600">
              You can also send /unlink to the bot in Telegram.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            <button
              type="button"
              onClick={() => void getCode()}
              disabled={busy}
              className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#D4AF37] px-4 text-xs font-semibold text-black transition hover:bg-[#E2C259] disabled:opacity-60"
            >
              <Send className="h-4 w-4" />
              Get link code
            </button>
            {code && (
              <div className="rounded-lg border border-white/[0.06] bg-black/20 p-3">
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
                  Your link code
                </p>
                <p className="mt-1 font-mono text-2xl font-semibold tracking-[0.2em] text-white">
                  {code}
                </p>
                <p className="mt-2 text-xs leading-5 text-zinc-500">
                  {botUsername ? (
                    <>
                      Open{" "}
                      <a
                        className="text-[#D4AF37] underline"
                        href={`https://t.me/${botUsername}?start=${code}`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        t.me/{botUsername}
                      </a>{" "}
                      and tap Start — or send the bot{" "}
                      <span className="font-mono">/start {code}</span>.
                    </>
                  ) : (
                    <>
                      Open the ANVIX bot in Telegram and send{" "}
                      <span className="font-mono">/start {code}</span>.
                    </>
                  )}
                  {expiresAt &&
                    ` Code expires at ${new Date(expiresAt).toLocaleTimeString()}.`}
                </p>
              </div>
            )}
          </div>
        )}

        {status && <p className="mt-3 text-xs text-zinc-500">{status}</p>}
      </div>
    </div>
  );
}
