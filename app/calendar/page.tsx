"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import AppShell from "@/components/layout/AppShell";
import { useAuth } from "@/components/auth/AuthProvider";
import { getAuthHeaders } from "@/lib/api/auth-headers";
import {
  Calendar as CalendarIcon,
  CalendarPlus,
  Link2,
  LogOut,
  MessageSquareText,
  RefreshCw,
} from "lucide-react";

interface CalendarEventView {
  id: string;
  summary: string;
  description: string | null;
  location: string | null;
  start: { dateTime: string | null; date: string | null };
  end: { dateTime: string | null; date: string | null };
  htmlLink: string | null;
}

interface StatusResponse {
  configured: boolean;
  connected: boolean;
  scope: string;
}

function todayIsoDate(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatTime(value: string | null): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function formatEventLine(event: CalendarEventView): string {
  const start = event.start.dateTime ?? event.start.date ?? "";
  const end = event.end.dateTime ?? event.end.date ?? "";
  if (event.start.date && !event.start.dateTime) {
    return `${event.summary} — all day`;
  }
  return `${formatTime(start)} – ${formatTime(end)} · ${event.summary}${
    event.location ? ` · ${event.location}` : ""
  }`;
}

export default function CalendarPage() {
  const { configured, user, loading } = useAuth();
  const [status, setStatus] = useState<StatusResponse | null>(null);
  const [statusError, setStatusError] = useState("");
  const [events, setEvents] = useState<CalendarEventView[]>([]);
  const [eventsError, setEventsError] = useState("");
  const [eventsLoading, setEventsLoading] = useState(false);
  const [date, setDate] = useState(todayIsoDate());
  const [notice, setNotice] = useState("");
  const [askQuestion, setAskQuestion] = useState("");
  const [askAnswer, setAskAnswer] = useState("");
  const [askBusy, setAskBusy] = useState(false);
  const [title, setTitle] = useState("");
  const [startTime, setStartTime] = useState("10:00");
  const [endTime, setEndTime] = useState("11:00");
  const [addError, setAddError] = useState("");
  const [addBusy, setAddBusy] = useState(false);

  const loadStatus = useCallback(async () => {
    try {
      const headers = await getAuthHeaders();
      const response = await fetch("/api/integrations/google/status", {
        headers,
      });
      const json = (await response.json()) as StatusResponse;
      setStatus(json);
    } catch {
      setStatusError("Could not check the Google Calendar connection.");
    }
  }, []);

  const loadEvents = useCallback(async (day: string) => {
    setEventsLoading(true);
    setEventsError("");
    try {
      const headers = await getAuthHeaders();
      const response = await fetch(
        `/api/calendar/events?date=${encodeURIComponent(day)}`,
        { headers }
      );
      const json = (await response.json()) as {
        events?: CalendarEventView[];
        error?: string;
      };
      if (!response.ok) {
        setEventsError(json.error ?? "Could not load events.");
        setEvents([]);
        return;
      }
      setEvents(json.events ?? []);
    } catch {
      setEventsError("Could not load events. Check your connection.");
      setEvents([]);
    } finally {
      setEventsLoading(false);
    }
  }, []);

  // Initial status + Google redirect outcomes (?google_connected=1,
  // ?google_setup=1, ?google_error=...).
  useEffect(() => {
    // Read the query string directly (instead of useSearchParams) so the
    // page does not need a Suspense boundary to prerender.
    const searchParams = new URLSearchParams(window.location.search);
    const connected = searchParams.get("google_connected");
    const setup = searchParams.get("google_setup");
    const error = searchParams.get("google_error");
    if (connected) setNotice("Google Calendar connected.");
    if (error) setNotice(error);
    if (setup) {
      void (async () => {
        try {
          const headers = await getAuthHeaders();
          const response = await fetch(
            "/api/integrations/google/complete",
            { method: "POST", headers }
          );
          const json = (await response.json()) as { error?: string };
          setNotice(
            response.ok
              ? "Google Calendar connected."
              : (json.error ?? "Could not finish connecting Google Calendar.")
          );
        } catch {
          setNotice("Could not finish connecting Google Calendar.");
        }
        await loadStatus();
      })();
      return;
    }
    void loadStatus();
  }, [loadStatus]);

  useEffect(() => {
    if (status?.connected) void loadEvents(date);
  }, [status?.connected, date, loadEvents]);

  const handleDisconnect = async () => {
    try {
      const headers = await getAuthHeaders();
      const response = await fetch("/api/integrations/google/disconnect", {
        method: "POST",
        headers,
      });
      if (response.ok) {
        setStatus((prev) => (prev ? { ...prev, connected: false } : prev));
        setEvents([]);
        setNotice("Google Calendar disconnected.");
      } else {
        setNotice("Could not disconnect Google Calendar.");
      }
    } catch {
      setNotice("Could not disconnect Google Calendar.");
    }
  };

  const handleAsk = async () => {
    const question = askQuestion.trim();
    if (!question) return;
    setAskBusy(true);
    setAskAnswer("");
    try {
      const headers = await getAuthHeaders();
      const response = await fetch("/api/calendar/ask", {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({ question }),
      });
      const json = (await response.json()) as {
        answer?: string;
        error?: string;
      };
      setAskAnswer(
        response.ok
          ? (json.answer ?? "")
          : (json.error ?? "Could not answer that.")
      );
      if (response.ok) void loadEvents(date);
    } catch {
      setAskAnswer("Could not answer that. Check your connection.");
    } finally {
      setAskBusy(false);
    }
  };

  const handleAdd = async () => {
    if (!title.trim()) {
      setAddError("Give the event a title.");
      return;
    }
    setAddBusy(true);
    setAddError("");
    try {
      const headers = await getAuthHeaders();
      const response = await fetch("/api/calendar/events", {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({
          summary: title.trim(),
          startIso: `${date}T${startTime}:00+05:30`,
          endIso: `${date}T${endTime}:00+05:30`,
        }),
      });
      const json = (await response.json()) as { error?: string };
      if (!response.ok) {
        setAddError(json.error ?? "Could not add the event.");
        return;
      }
      setTitle("");
      setNotice("Event added.");
      void loadEvents(date);
    } catch {
      setAddError("Could not add the event. Check your connection.");
    } finally {
      setAddBusy(false);
    }
  };

  return (
    <AppShell
      title="Calendar"
      description="Your Google Calendar, inside ANVIX."
    >
      <div className="mx-auto w-full max-w-4xl space-y-6 pb-10">
        <section className="rounded-3xl border border-white/[0.08] bg-[#111113] p-5 sm:p-8">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#D4AF37]/20 bg-[#D4AF37]/[0.07]">
              <CalendarIcon className="h-4 w-4 text-[#D4AF37]" />
            </div>
            <div>
              <h2 className="text-xl font-semibold tracking-tight text-white">
                Google Calendar
              </h2>
              <p className="mt-0.5 text-sm text-zinc-500">
                Ask what is on your day, or add events without leaving ANVIX.
              </p>
            </div>
          </div>

          {notice && (
            <p className="mt-4 rounded-lg border border-white/[0.08] bg-black/20 px-3 py-2 text-xs leading-5 text-zinc-300">
              {notice}
            </p>
          )}

          {loading ? (
            <p className="mt-4 text-sm text-zinc-400">
              Checking your account…
            </p>
          ) : !configured ? (
            <p className="mt-4 text-sm leading-6 text-zinc-400">
              Accounts are not connected on this deployment yet — the
              Supabase environment variables are missing. Calendar needs a
              signed-in account.
            </p>
          ) : !user ? (
            <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
              <p className="text-sm leading-6 text-zinc-400">
                Sign in to connect your Google Calendar.
              </p>
              <Link
                href="/auth"
                className="inline-flex items-center gap-2 rounded-lg bg-[#D4AF37] px-3.5 py-2 text-xs font-semibold text-black transition hover:bg-[#E2C259]"
              >
                Sign in
              </Link>
            </div>
          ) : statusError ? (
            <p className="mt-4 text-sm text-zinc-400">{statusError}</p>
          ) : status && !status.configured ? (
            <div className="mt-4 space-y-2">
              <p className="text-sm font-medium text-zinc-200">
                Calendar is not available on this deployment yet.
              </p>
              <p className="text-sm leading-6 text-zinc-400">
                The owner needs to set up Google OAuth first (client ID,
                client secret and token encryption key). No Google account
                is connected, and nothing has been sent to Google. Setup
                steps:{" "}
                <span className="text-zinc-200">
                  docs/google-calendar-setup.md
                </span>
              </p>
            </div>
          ) : status && !status.connected ? (
            <div className="mt-4 space-y-3">
              <p className="text-sm leading-6 text-zinc-400">
                Connect your Google account to read and add events. ANVIX
                asks only for Calendar access — it never reads your Gmail.
              </p>
              <a
                href="/api/integrations/google/auth"
                className="inline-flex items-center gap-2 rounded-lg bg-[#D4AF37] px-4 py-2 text-xs font-semibold text-black transition hover:bg-[#E2C259]"
              >
                <Link2 className="h-3.5 w-3.5" />
                Connect Google Calendar
              </a>
            </div>
          ) : status?.connected ? (
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-zinc-400">
                Connected to Google Calendar.
              </p>
              <button
                type="button"
                onClick={() => void handleDisconnect()}
                className="inline-flex items-center gap-2 rounded-lg border border-white/[0.1] px-3 py-2 text-xs font-medium text-zinc-300 transition hover:border-white/[0.2] hover:text-white"
              >
                <LogOut className="h-3.5 w-3.5" />
                Disconnect
              </button>
            </div>
          ) : null}
        </section>

        {status?.connected && (
          <>
            {/* ASK */}
            <section className="rounded-2xl border border-white/[0.07] bg-[#111113] p-5">
              <div className="flex items-center gap-3">
                <MessageSquareText className="h-4 w-4 text-[#D4AF37]" />
                <h3 className="text-sm font-semibold text-white">
                  Ask your calendar
                </h3>
              </div>
              <div className="mt-3 flex flex-wrap gap-3">
                <input
                  value={askQuestion}
                  onChange={(event) => setAskQuestion(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") void handleAsk();
                  }}
                  placeholder="What is on my calendar today?"
                  className="h-10 min-w-56 flex-1 rounded-lg border border-white/[0.08] bg-[#0D0D0D] px-3 text-sm text-zinc-100 outline-none transition placeholder:text-zinc-600 focus:border-[#D4AF37]/40"
                />
                <button
                  type="button"
                  onClick={() => void handleAsk()}
                  disabled={askBusy || !askQuestion.trim()}
                  className="inline-flex h-10 items-center rounded-lg bg-[#D4AF37] px-4 text-xs font-semibold text-black transition hover:bg-[#E2C259] disabled:opacity-50"
                >
                  {askBusy ? "Asking…" : "Ask"}
                </button>
              </div>
              {askAnswer && (
                <p className="mt-3 text-sm leading-6 text-zinc-300">
                  {askAnswer}
                </p>
              )}
            </section>

            {/* DAY VIEW */}
            <section className="rounded-2xl border border-white/[0.07] bg-[#111113] p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h3 className="text-sm font-semibold text-white">
                  Events
                </h3>
                <div className="flex items-center gap-2">
                  <input
                    type="date"
                    value={date}
                    onChange={(event) => setDate(event.target.value)}
                    className="h-9 rounded-lg border border-white/[0.08] bg-[#0D0D0D] px-3 text-sm text-zinc-100 outline-none focus:border-[#D4AF37]/40"
                  />
                  <button
                    type="button"
                    onClick={() => void loadEvents(date)}
                    disabled={eventsLoading}
                    aria-label="Reload events"
                    className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-white/[0.1] text-zinc-300 transition hover:border-white/[0.2] hover:text-white disabled:opacity-50"
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              {eventsLoading ? (
                <p className="mt-3 text-sm text-zinc-400">Loading events…</p>
              ) : eventsError ? (
                <p className="mt-3 text-sm text-zinc-400">{eventsError}</p>
              ) : events.length === 0 ? (
                <p className="mt-3 text-sm text-zinc-400">
                  Nothing on your calendar for this day.
                </p>
              ) : (
                <ul className="mt-3 space-y-2">
                  {events.map((event) => (
                    <li
                      key={event.id}
                      className="rounded-lg border border-white/[0.06] bg-black/20 px-3 py-2 text-sm text-zinc-200"
                    >
                      {event.htmlLink ? (
                        <a
                          href={event.htmlLink}
                          target="_blank"
                          rel="noreferrer"
                          className="hover:text-white hover:underline"
                        >
                          {formatEventLine(event)}
                        </a>
                      ) : (
                        formatEventLine(event)
                      )}
                      {event.description && (
                        <span className="block text-xs text-zinc-500">
                          {event.description}
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </section>

            {/* ADD EVENT */}
            <section className="rounded-2xl border border-white/[0.07] bg-[#111113] p-5">
              <div className="flex items-center gap-3">
                <CalendarPlus className="h-4 w-4 text-[#D4AF37]" />
                <h3 className="text-sm font-semibold text-white">
                  Add an event
                </h3>
              </div>
              <div className="mt-3 flex flex-wrap gap-3">
                <input
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder="Event title"
                  className="h-10 min-w-56 flex-1 rounded-lg border border-white/[0.08] bg-[#0D0D0D] px-3 text-sm text-zinc-100 outline-none transition placeholder:text-zinc-600 focus:border-[#D4AF37]/40"
                />
                <input
                  type="time"
                  value={startTime}
                  onChange={(event) => setStartTime(event.target.value)}
                  aria-label="Start time"
                  className="h-10 rounded-lg border border-white/[0.08] bg-[#0D0D0D] px-3 text-sm text-zinc-100 outline-none focus:border-[#D4AF37]/40"
                />
                <input
                  type="time"
                  value={endTime}
                  onChange={(event) => setEndTime(event.target.value)}
                  aria-label="End time"
                  className="h-10 rounded-lg border border-white/[0.08] bg-[#0D0D0D] px-3 text-sm text-zinc-100 outline-none focus:border-[#D4AF37]/40"
                />
                <button
                  type="button"
                  onClick={() => void handleAdd()}
                  disabled={addBusy}
                  className="inline-flex h-10 items-center rounded-lg bg-[#D4AF37] px-4 text-xs font-semibold text-black transition hover:bg-[#E2C259] disabled:opacity-50"
                >
                  {addBusy ? "Adding…" : "Add event"}
                </button>
              </div>
              {addError && (
                <p className="mt-2 text-xs text-zinc-400">{addError}</p>
              )}
              <p className="mt-2 text-xs text-zinc-500">
                Times are Asia/Kolkata, on the day picked above.
              </p>
            </section>
          </>
        )}
      </div>
    </AppShell>
  );
}
