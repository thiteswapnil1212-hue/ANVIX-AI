"use client";

import { useCallback, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  Check,
  Copy,
  Download,
  ExternalLink,
  FileSearch,
  LoaderCircle,
  Search,
  Square,
  X,
} from "lucide-react";
import {
  isResearchTerminal,
  researchProgress,
  researchReportExport,
  type ResearchRun,
} from "@/lib/research";

interface ResearchPanelProps {
  run: ResearchRun;
  /** An advance/steer request is in flight. */
  busy: boolean;
  /** Retry the current step (used when a run failed). */
  onAdvance: () => void;
  onCancel: () => void;
  onSteer: (direction: string) => void;
  /** Close the panel. The layout cancels a running run on close. */
  onClose: () => void;
}

function StatusPill({ run }: { run: ResearchRun }) {
  const label =
    run.status === "done"
      ? "Done"
      : run.status === "failed"
        ? "Failed"
        : run.status === "cancelled"
          ? "Cancelled"
          : researchProgress(run).label;
  const tone =
    run.status === "done"
      ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-300"
      : run.status === "failed"
        ? "border-red-400/30 bg-red-400/10 text-red-300"
        : "border-[#D4AF37]/30 bg-[#D4AF37]/10 text-[#E9C96B]";
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium ${tone}`}
    >
      {!isResearchTerminal(run.status) && (
        <LoaderCircle
          className="h-3 w-3 animate-spin"
          aria-hidden="true"
        />
      )}
      {label}
    </span>
  );
}

/**
 * Deep research panel (scoped version).
 *
 * Shows the run's live state — plan, search progress, sources found —
 * lets the user steer (a direction note folded into the final report)
 * or cancel, and renders the finished report with a Markdown export.
 * Progress comes from the layout polling `advance`; this component
 * never calls the API itself except through the callbacks.
 *
 * Honest footer: this is sequential grounded search, not an
 * autonomous agent — no replanning, no tool use, no background
 * worker. Closing the panel while a run is active cancels it.
 */
export default function ResearchPanel({
  run,
  busy,
  onAdvance,
  onCancel,
  onSteer,
  onClose,
}: ResearchPanelProps) {
  const [direction, setDirection] = useState("");
  const [copied, setCopied] = useState(false);

  const progress = researchProgress(run);
  const running = !isResearchTerminal(run.status);
  const report = researchReportExport(run);

  const handleCopyReport = useCallback(async () => {
    if (!report) return;
    try {
      await navigator.clipboard.writeText(report);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard unavailable: the report is still visible above.
    }
  }, [report]);

  const handleExport = useCallback(() => {
    if (!report) return;
    const blob = new Blob([report], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `anvix-research-${run.id.slice(0, 8)}.md`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }, [report, run.id]);

  const stepItems: { label: string; done: boolean; active: boolean }[] = [
    {
      label: "Plan searches",
      done: run.plan.length > 0,
      active: run.status === "planning" || run.status === "queued",
    },
    ...run.plan.map((query, index) => ({
      label: `Search: ${query}`,
      done: index < run.stepIndex,
      active:
        run.status === "searching" && index === run.stepIndex,
    })),
    {
      label: "Write the report",
      done: run.status === "done",
      active: run.status === "synthesizing",
    },
  ];

  return (
    <div className="flex h-full min-h-0 flex-col bg-[#0B0B0C]">
      <header className="flex h-12 shrink-0 items-center justify-between gap-2 border-b border-white/[0.08] px-3">
        <div className="flex min-w-0 items-center gap-2">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-[#D4AF37]/25 bg-[#D4AF37]/10">
            <FileSearch
              className="h-3.5 w-3.5 text-[#D4AF37]"
              aria-hidden="true"
            />
          </span>
          <span className="truncate text-sm font-medium text-zinc-100">
            Deep research
          </span>
          <StatusPill run={run} />
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close research panel"
          title={
            running
              ? "Close and cancel this run"
              : "Close research panel"
          }
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-zinc-400 transition-colors hover:bg-white/10 hover:text-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D4AF37]/60"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
        <p className="text-[13px] font-medium leading-6 text-zinc-200">
          {run.question}
        </p>

        {/* Progress */}
        <div className="mt-4">
          <div
            className="h-1.5 overflow-hidden rounded-full bg-zinc-800"
            role="progressbar"
            aria-valuenow={progress.done}
            aria-valuemax={progress.total}
            aria-label={progress.label}
          >
            <div
              className="h-full rounded-full bg-[#D4AF37] transition-all duration-500"
              style={{
                width: `${Math.round(
                  (progress.done / Math.max(1, progress.total)) * 100
                )}%`,
              }}
            />
          </div>
          <p className="mt-1.5 text-[11px] text-zinc-500">
            {progress.label} · {progress.done} of {progress.total} steps
            · {run.sources.length} source{run.sources.length === 1 ? "" : "s"} (max 15)
          </p>
        </div>

        {/* Plan / steps */}
        {stepItems.length > 0 && (
          <ol className="mt-4 space-y-1.5">
            {stepItems.map((step, index) => (
              <li
                key={`${step.label}-${index}`}
                className="flex items-start gap-2 text-[12px] leading-5"
              >
                <span
                  aria-hidden="true"
                  className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${
                    step.done
                      ? "bg-emerald-400"
                      : step.active
                        ? "animate-pulse bg-[#D4AF37]"
                        : "bg-zinc-700"
                  }`}
                />
                <span
                  className={
                    step.done
                      ? "text-zinc-400"
                      : step.active
                        ? "font-medium text-zinc-100"
                        : "text-zinc-500"
                  }
                >
                  {step.label}
                </span>
              </li>
            ))}
          </ol>
        )}

        {run.direction && (
          <p className="mt-3 rounded-lg border border-white/[0.07] bg-white/[0.02] px-3 py-2 text-[12px] leading-5 text-zinc-400">
            <span className="font-medium text-zinc-300">Direction: </span>
            {run.direction}
          </p>
        )}

        {run.error && (
          <p
            role="alert"
            className="mt-3 rounded-lg border border-red-400/20 bg-red-400/[0.06] px-3 py-2 text-[12px] leading-5 text-red-300"
          >
            {run.error}
          </p>
        )}

        {/* Sources */}
        {run.sources.length > 0 && (
          <div className="mt-5">
            <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.17em] text-zinc-500">
              Sources
            </p>
            <ol className="space-y-1.5">
              {run.sources.map((source, index) => (
                <li key={`${source.uri}-${index}`} className="min-w-0">
                  <a
                    href={source.uri}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group flex items-start gap-1.5 text-[13px] leading-5 text-zinc-400 transition-colors hover:text-[#E9C96B] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D4AF37]/60"
                  >
                    <span className="shrink-0 font-medium tabular-nums text-zinc-500">
                      {index + 1}.
                    </span>
                    <span className="min-w-0 truncate underline underline-offset-4">
                      {source.title}
                    </span>
                    <ExternalLink
                      className="mt-0.5 h-3 w-3 shrink-0 text-zinc-600 group-hover:text-[#D4AF37]"
                      aria-hidden="true"
                    />
                  </a>
                </li>
              ))}
            </ol>
          </div>
        )}

        {/* Report */}
        {run.status === "done" && report && (
          <div className="mt-5 border-t border-white/[0.06] pt-4">
            <div className="mb-3 flex items-center justify-between gap-2">
              <p className="text-[10px] font-bold uppercase tracking-[0.17em] text-zinc-500">
                Report
              </p>
              <div className="flex gap-1">
                <button
                  type="button"
                  onClick={handleCopyReport}
                  className="inline-flex h-7 items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.04] px-2 text-[11px] font-medium text-zinc-400 transition-colors hover:border-[#D4AF37]/30 hover:text-[#E9C96B] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D4AF37]/60"
                >
                  {copied ? (
                    <Check
                      className="h-3 w-3 text-emerald-400"
                      aria-hidden="true"
                    />
                  ) : (
                    <Copy className="h-3 w-3" aria-hidden="true" />
                  )}
                  {copied ? "Copied" : "Copy"}
                </button>
                <button
                  type="button"
                  onClick={handleExport}
                  className="inline-flex h-7 items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.04] px-2 text-[11px] font-medium text-zinc-400 transition-colors hover:border-[#D4AF37]/30 hover:text-[#E9C96B] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D4AF37]/60"
                >
                  <Download className="h-3 w-3" aria-hidden="true" />
                  Export .md
                </button>
              </div>
            </div>
            <div
              className="
                markdown-content min-w-0 break-words text-[14px] leading-[1.8] text-zinc-200
                [&_h1]:mb-3 [&_h1]:mt-5 [&_h1]:text-xl [&_h1]:font-bold [&_h1]:text-white
                [&_h2]:mb-3 [&_h2]:mt-5 [&_h2]:text-lg [&_h2]:font-bold [&_h2]:text-white
                [&_h3]:mb-2 [&_h3]:mt-4 [&_h3]:text-base [&_h3]:font-semibold [&_h3]:text-white
                [&_p]:my-3 [&_strong]:font-semibold [&_strong]:text-white
                [&_ul]:my-3 [&_ul]:list-disc [&_ul]:pl-6
                [&_ol]:my-3 [&_ol]:list-decimal [&_ol]:pl-6
                [&_li]:my-1 [&_li::marker]:text-[#D4AF37]
              "
            >
              <ReactMarkdown remarkPlugins={[remarkGfm]} skipHtml>
                {report}
              </ReactMarkdown>
            </div>
          </div>
        )}

        {/* Failed: retry */}
        {run.status === "failed" && (
          <button
            type="button"
            onClick={onAdvance}
            disabled={busy}
            className="mt-4 inline-flex h-9 items-center gap-2 rounded-xl bg-[#D4AF37] px-3.5 text-[13px] font-semibold text-black transition-colors hover:bg-[#E0BB4C] disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D4AF37]"
          >
            <Search className="h-4 w-4" aria-hidden="true" />
            Retry this step
          </button>
        )}
      </div>

      {/* Steer / cancel */}
      {running && (
        <div className="shrink-0 border-t border-white/[0.06] px-3 py-3">
          <div className="flex gap-2">
            <input
              type="text"
              value={direction}
              onChange={(event) => setDirection(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && direction.trim() && !busy) {
                  onSteer(direction.trim());
                  setDirection("");
                }
              }}
              maxLength={500}
              placeholder="Steer the research… (e.g. focus on costs)"
              aria-label="Steer the research"
              className="min-w-0 flex-1 rounded-xl border border-zinc-800 bg-[#151518] px-3 py-2 text-[13px] text-zinc-100 outline-none placeholder:text-zinc-600 focus:border-[#D4AF37]/50"
            />
            <button
              type="button"
              disabled={!direction.trim() || busy}
              onClick={() => {
                onSteer(direction.trim());
                setDirection("");
              }}
              className="shrink-0 rounded-xl border border-[#D4AF37]/40 bg-[#D4AF37]/10 px-3 text-[12px] font-medium text-[#E9C96B] transition-colors hover:bg-[#D4AF37]/20 disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D4AF37]/60"
            >
              Steer
            </button>
            <button
              type="button"
              onClick={onCancel}
              disabled={busy}
              aria-label="Cancel research run"
              title="Cancel research run"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-zinc-400 transition-colors hover:bg-red-400/10 hover:text-red-300 disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D4AF37]/60"
            >
              <Square className="h-3.5 w-3.5" fill="currentColor" aria-hidden="true" />
            </button>
          </div>
          <p className="mt-2 text-[11px] leading-5 text-zinc-600">
            Scoped research: sequential grounded searches on Flash-Lite,
            1 run/day, max 15 sources. Not an autonomous agent — no
            replanning or tool use. Closing the panel cancels the run.
          </p>
        </div>
      )}
    </div>
  );
}
