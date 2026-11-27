"use client";

import { useCallback, useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useAuth } from "@/components/auth/AuthProvider";
import {
  researchProgress,
  researchReportExport,
  type ResearchRun,
  type ResearchStatus,
} from "@/lib/research";

/**
 * Past deep research runs.
 *
 * GET /api/research already listed the user's runs, but nothing
 * consumed the list — a finished report could only be seen in the
 * chat panel it was created in. This lists the recent runs (newest
 * first) and reopens one in place: status, sources, and the finished
 * report (with Copy). A still-running run cannot be advanced from
 * here — it continues in chat.
 */

const STATUS_TONE: Record<ResearchStatus, string> = {
  done: "border-emerald-400/30 bg-emerald-400/10 text-emerald-300",
  failed: "border-red-400/30 bg-red-400/10 text-red-300",
  cancelled: "border-white/[0.1] bg-white/[0.04] text-zinc-400",
  queued: "border-[#D4AF37]/30 bg-[#D4AF37]/10 text-[#E9C96B]",
  planning: "border-[#D4AF37]/30 bg-[#D4AF37]/10 text-[#E9C96B]",
  searching: "border-[#D4AF37]/30 bg-[#D4AF37]/10 text-[#E9C96B]",
  synthesizing: "border-[#D4AF37]/30 bg-[#D4AF37]/10 text-[#E9C96B]",
};

function statusLabel(run: ResearchRun): string {
  if (run.status === "done") return "Done";
  if (run.status === "failed") return "Failed";
  if (run.status === "cancelled") return "Cancelled";
  return researchProgress(run).label;
}

export default function PastResearchRuns() {
  const { user, loading } = useAuth();
  const [runs, setRuns] = useState<ResearchRun[] | null>(null);
  const [status, setStatus] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);
  const [openRun, setOpenRun] = useState<ResearchRun | null>(null);
  const [opening, setOpening] = useState(false);
  const [copied, setCopied] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const response = await fetch("/api/research");
      if (!response.ok) {
        setStatus("Could not load research runs.");
        setRuns([]);
        return;
      }
      const body = (await response.json()) as { runs?: ResearchRun[] };
      setRuns(Array.isArray(body.runs) ? body.runs : []);
      setStatus("");
    } catch {
      setStatus("Could not load research runs. Check your connection.");
      setRuns([]);
    }
  }, []);

  useEffect(() => {
    if (!user) return;
    void refresh();
  }, [user, refresh]);

  const handleToggle = async (run: ResearchRun) => {
    if (openId === run.id) {
      setOpenId(null);
      setOpenRun(null);
      return;
    }
    setOpenId(run.id);
    setOpening(true);
    setCopied(false);
    try {
      const response = await fetch(`/api/research/${run.id}`);
      if (!response.ok) {
        setOpenRun(run);
        return;
      }
      const body = (await response.json()) as { run?: ResearchRun };
      setOpenRun(body.run ?? run);
    } catch {
      setOpenRun(run);
    } finally {
      setOpening(false);
    }
  };

  const handleCopyReport = async () => {
    const report = openRun ? researchReportExport(openRun) : null;
    if (!report) return;
    try {
      await navigator.clipboard.writeText(report);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard unavailable: the report is still visible above.
    }
  };

  if (loading) {
    return <p className="text-sm leading-6 text-zinc-400">Checking your account…</p>;
  }

  if (!user) {
    return (
      <p className="text-sm leading-6 text-zinc-400">
        Sign in to see your past deep research runs. Guests cannot run
        deep research.
      </p>
    );
  }

  if (runs === null) {
    return <p className="text-sm leading-6 text-zinc-400">Loading your runs…</p>;
  }

  if (runs.length === 0) {
    return (
      <p className="text-sm leading-6 text-zinc-400">
        No research runs yet. Start one from chat: open the mode menu and
        turn on Deep research (1 run per day).
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {status && (
        <p role="alert" className="text-xs leading-5 text-red-400">
          {status}
        </p>
      )}
      {runs.map((run) => {
        const open = openId === run.id;
        return (
          <div
            key={run.id}
            className="overflow-hidden rounded-xl border border-white/[0.07] bg-black/20"
          >
            <button
              type="button"
              onClick={() => void handleToggle(run)}
              aria-expanded={open}
              className="flex w-full items-start justify-between gap-3 px-4 py-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D4AF37]/60"
            >
              <span className="min-w-0">
                <span className="block truncate text-sm font-medium text-zinc-100">
                  {run.question}
                </span>
                <span className="mt-0.5 block text-xs text-zinc-500">
                  {new Date(run.createdAt).toLocaleString()}
                  {run.sources.length > 0
                    ? ` · ${run.sources.length} source${run.sources.length === 1 ? "" : "s"}`
                    : ""}
                </span>
              </span>
              <span
                className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium ${STATUS_TONE[run.status]}`}
              >
                {statusLabel(run)}
              </span>
            </button>

            {open && (
              <div className="border-t border-white/[0.06] px-4 py-4">
                {opening ? (
                  <p className="text-sm text-zinc-400">Loading the run…</p>
                ) : openRun?.reportMarkdown ? (
                  <>
                    <div className="mb-3 flex justify-end">
                      <button
                        type="button"
                        onClick={() => void handleCopyReport()}
                        className="inline-flex h-9 items-center rounded-lg border border-white/[0.1] px-3 text-xs font-medium text-zinc-300 transition hover:border-white/[0.2] hover:text-white"
                      >
                        {copied ? "Copied" : "Copy report"}
                      </button>
                    </div>
                    <div className="markdown-content min-w-0 text-sm leading-6 text-zinc-300 [&_h1]:mb-3 [&_h1]:mt-5 [&_h1]:text-lg [&_h1]:font-bold [&_h1]:text-white [&_h2]:mb-3 [&_h2]:mt-5 [&_h2]:text-base [&_h2]:font-bold [&_h2]:text-white [&_h3]:mb-2 [&_h3]:mt-4 [&_h3]:text-sm [&_h3]:font-semibold [&_h3]:text-white [&_p]:my-3 [&_strong]:font-semibold [&_strong]:text-white [&_ul]:my-3 [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:my-3 [&_ol]:list-decimal [&_ol]:pl-6 [&_li]:my-1">
                      <ReactMarkdown remarkPlugins={[remarkGfm]} skipHtml>
                        {openRun.reportMarkdown}
                      </ReactMarkdown>
                    </div>
                    {openRun.sources.length > 0 && (
                      <div className="mt-4 border-t border-white/[0.06] pt-3">
                        <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.17em] text-zinc-500">
                          Sources
                        </p>
                        <ol className="space-y-1.5">
                          {openRun.sources.map((source, index) => (
                            <li key={`${source.uri}-${index}`}>
                              <a
                                href={source.uri}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-[13px] leading-5 text-zinc-400 transition-colors hover:text-[#E9C96B]"
                              >
                                {source.title || source.uri}
                              </a>
                            </li>
                          ))}
                        </ol>
                      </div>
                    )}
                  </>
                ) : openRun?.error ? (
                  <p className="text-sm leading-6 text-red-400">
                    {openRun.error}
                  </p>
                ) : (
                  <p className="text-sm leading-6 text-zinc-400">
                    This run is still {statusLabel(run).toLowerCase()}. Open
                    chat to continue it — runs advance from the research
                    panel there.
                  </p>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
