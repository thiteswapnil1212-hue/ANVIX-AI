"use client";

import { useCallback, useMemo, useState } from "react";
import {
  Code2,
  Copy,
  Check,
  Download,
  Play,
  ShieldCheck,
  X,
} from "lucide-react";
import {
  buildSandboxedSrcDoc,
  type ChatArtifact,
} from "@/lib/artifacts";

interface ArtifactViewerProps {
  artifact: ChatArtifact;
  onClose: () => void;
}

/**
 * Renders one chat artifact in the side panel.
 *
 * Safety is the whole point of this component:
 * - The iframe gets `sandbox="allow-scripts"` ONLY — no
 *   `allow-same-origin` (opaque origin, no access to ANVIX cookies,
 *   storage, or DOM), no `allow-top-navigation`, no `allow-forms`.
 * - The HTML is wrapped by `buildSandboxedSrcDoc`, which injects a
 *   CSP blocking every network request, so the artifact cannot phone
 *   home even though its scripts run.
 * - The artifact is read-only: there is no edit-and-rerun path and
 *   no bridge back into the app. Copy / Download just hand the user
 *   the source text.
 */
export default function ArtifactViewer({
  artifact,
  onClose,
}: ArtifactViewerProps) {
  const [view, setView] = useState<"preview" | "code">("preview");
  const [copied, setCopied] = useState(false);

  const srcDoc = useMemo(
    () => buildSandboxedSrcDoc(artifact.code),
    [artifact.code]
  );

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(artifact.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard unavailable: the Code tab still shows the source.
    }
  }, [artifact.code]);

  const handleDownload = useCallback(() => {
    const blob = new Blob([artifact.code], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${artifact.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "artifact"}.html`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }, [artifact.code, artifact.title]);

  return (
    <div className="flex h-full min-h-0 flex-col bg-[#0B0B0C]">
      <header className="flex h-12 shrink-0 items-center justify-between gap-2 border-b border-white/[0.08] px-3">
        <div className="flex min-w-0 items-center gap-2">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-[#D4AF37]/25 bg-[#D4AF37]/10">
            <Play className="h-3.5 w-3.5 text-[#D4AF37]" aria-hidden="true" />
          </span>
          <span className="truncate text-sm font-medium text-zinc-100" title={artifact.title}>
            {artifact.title}
          </span>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close artifact panel"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-zinc-400 transition-colors hover:bg-white/10 hover:text-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D4AF37]/60"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      </header>

      <div className="flex shrink-0 items-center justify-between gap-2 border-b border-white/[0.06] px-3 py-2">
        <div
          className="flex items-center gap-1 rounded-lg border border-zinc-800 bg-[#09090B] p-0.5"
          role="group"
          aria-label="Artifact view"
        >
          {(
            [
              ["preview", "Preview", Play],
              ["code", "Code", Code2],
            ] as const
          ).map(([value, label, Icon]) => (
            <button
              key={value}
              type="button"
              onClick={() => setView(value)}
              aria-pressed={view === value}
              className={`flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[11px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D4AF37]/60 ${
                view === value
                  ? "bg-[#D4AF37]/10 text-[#E9C96B]"
                  : "text-zinc-500 hover:text-zinc-200"
              }`}
            >
              <Icon className="h-3 w-3" aria-hidden="true" />
              {label}
            </button>
          ))}
        </div>

        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={handleCopy}
            className="inline-flex h-7 items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.04] px-2 text-[11px] font-medium text-zinc-400 transition-colors hover:border-[#D4AF37]/30 hover:text-[#E9C96B] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D4AF37]/60"
          >
            {copied ? (
              <Check className="h-3 w-3 text-emerald-400" aria-hidden="true" />
            ) : (
              <Copy className="h-3 w-3" aria-hidden="true" />
            )}
            {copied ? "Copied" : "Copy"}
          </button>
          <button
            type="button"
            onClick={handleDownload}
            className="inline-flex h-7 items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.04] px-2 text-[11px] font-medium text-zinc-400 transition-colors hover:border-[#D4AF37]/30 hover:text-[#E9C96B] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D4AF37]/60"
          >
            <Download className="h-3 w-3" aria-hidden="true" />
            .html
          </button>
        </div>
      </div>

      <p className="flex shrink-0 items-center gap-1.5 border-b border-white/[0.06] px-3 py-1.5 text-[11px] leading-5 text-zinc-500">
        <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-emerald-400/80" aria-hidden="true" />
        Sandboxed &amp; offline — the artifact runs only in your browser,
        with no network and no access to ANVIX.
      </p>

      {view === "preview" ? (
        <div className="min-h-0 flex-1 bg-white">
          <iframe
            title={`Artifact preview: ${artifact.title}`}
            sandbox="allow-scripts"
            referrerPolicy="no-referrer"
            srcDoc={srcDoc}
            className="h-full w-full border-0"
          />
        </div>
      ) : (
        <div className="min-h-0 flex-1 overflow-auto bg-[#09090B] p-4">
          <pre className="whitespace-pre-wrap break-words font-mono text-[12px] leading-6 text-zinc-300">
            {artifact.code}
          </pre>
        </div>
      )}
    </div>
  );
}
