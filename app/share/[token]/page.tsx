"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Download, FileCode2, Flag, MessageSquare, Share2 } from "lucide-react";

import { useAuth } from "@/components/auth/AuthProvider";
import ShareComments from "@/components/share/ShareComments";
import { downloadProjectZip } from "@/lib/project/export-zip";
import type {
  ShareCommentRecord,
  SharePermission,
} from "@/lib/share/share";

type SharePayload =
  | {
      share: {
        resource_type: "chat";
        permission: SharePermission;
        expires_at: string | null;
        created_at: string;
      };
      resource_type: "chat";
      resource: {
        id: string;
        title: string;
        preview: string;
        messages: Array<{
          id: string;
          role: "user" | "assistant";
          content: string;
          createdAt: string;
        }>;
      };
      comments: ShareCommentRecord[];
      comments_unavailable: boolean;
    }
  | {
      share: {
        resource_type: "project";
        permission: SharePermission;
        expires_at: string | null;
        created_at: string;
      };
      resource_type: "project";
      resource: {
        id: string;
        name: string;
        framework: string;
        files: Array<{ path: string; content: string; language: string }>;
        prompt: string | null;
      };
      comments: ShareCommentRecord[];
      comments_unavailable: boolean;
    };

type LoadError =
  | "sharing_unavailable"
  | "not_found"
  | "revoked_or_expired"
  | "failed";

function slugifyProjectName(name: string): string {
  return (
    name
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "project"
  );
}

/**
 * Public shared page: /share/[token]
 *
 * Anyone with the link sees one chat (read-only) or one generated
 * app (file browser + open in workspace + ZIP download). No sign-in,
 * no sidebar, no editing. Comments appear only on comment-access
 * links; every page carries a report form so abuse can be flagged
 * to the owner, who revokes the link.
 */
export default function SharedPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const token = typeof params.token === "string" ? params.token : "";

  const [payload, setPayload] = useState<SharePayload | null>(null);
  const [loadError, setLoadError] = useState<LoadError | null>(() =>
    token ? null : "not_found"
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);

  const [reportReason, setReportReason] = useState("");
  const [reportState, setReportState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [reportError, setReportError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;

    let cancelled = false;

    void (async () => {
      try {
        const response = await fetch(`/api/share/${token}`);
        const data = (await response.json()) as SharePayload & {
          error?: string;
          message?: string;
        };

        if (cancelled) return;

        if (!response.ok) {
          if (data.error === "sharing_unavailable") setLoadError("sharing_unavailable");
          else if (data.error === "revoked_or_expired") setLoadError("revoked_or_expired");
          else setLoadError("not_found");
          setErrorMessage(data.message ?? null);
          return;
        }

        setPayload(data);
        if (data.resource_type === "project" && data.resource.files.length > 0) {
          setSelectedFile(data.resource.files[0].path);
        }
      } catch {
        if (!cancelled) setLoadError("failed");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [token]);

  async function handleReport() {
    if (!reportReason.trim() || reportState === "sending") return;
    setReportState("sending");
    setReportError(null);

    try {
      const response = await fetch(`/api/share/${token}/report`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: reportReason.trim() }),
      });
      const data = (await response.json()) as { message?: string };
      if (!response.ok) {
        setReportError(data.message ?? "Could not send the report.");
        setReportState("error");
        return;
      }
      setReportState("sent");
    } catch {
      setReportError("Could not reach the server. Try again.");
      setReportState("error");
    }
  }

  function handleOpenInWorkspace() {
    if (!payload || payload.resource_type !== "project") return;
    try {
      localStorage.setItem(
        "anvix.generatedProject",
        JSON.stringify({
          id: payload.resource.id,
          name: payload.resource.name,
          framework: payload.resource.framework,
          files: payload.resource.files,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        })
      );
    } catch {
      // Storage unavailable — nothing to open with.
      return;
    }
    router.push(`/workspace/${slugifyProjectName(payload.resource.name)}`);
  }

  function handleDownloadZip() {
    if (!payload || payload.resource_type !== "project") return;
    downloadProjectZip({
      name: payload.resource.name,
      framework: "nextjs",
      files: payload.resource.files,
    });
  }

  if (!payload && !loadError) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0B0B0D] px-6 text-zinc-400">
        <p className="text-sm">Loading shared item…</p>
      </div>
    );
  }

  if (!payload) {
    const copy: Record<Exclude<LoadError, "failed">, { title: string; body: string }> = {
      sharing_unavailable: {
        title: "Sharing is unavailable",
        body:
          errorMessage ??
          "This deployment has not set up sharing yet, so this link cannot be opened.",
      },
      not_found: {
        title: "This link does not exist",
        body:
          errorMessage ??
          "The share link may have been typed wrong, or the shared item was deleted.",
      },
      revoked_or_expired: {
        title: "This link is closed",
        body:
          errorMessage ??
          "The owner revoked this link, or it expired.",
      },
    };
    const shown =
      loadError === "failed"
        ? {
            title: "Could not load this link",
            body: "Check your connection and try again.",
          }
        : copy[loadError as Exclude<LoadError, "failed">];
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0B0B0D] px-6">
        <div className="max-w-md rounded-2xl border border-zinc-800 bg-[#0D0D0F] p-8 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl border border-[#D4AF37]/15 bg-[#D4AF37]/[0.06]">
            <Share2 className="h-5 w-5 text-[#D4AF37]" strokeWidth={1.8} />
          </div>
          <h1 className="mt-5 text-lg font-semibold text-zinc-100">{shown.title}</h1>
          <p className="mt-3 text-sm leading-6 text-zinc-500">{shown.body}</p>
          <button
            type="button"
            onClick={() => router.push("/")}
            className="mt-6 inline-flex items-center justify-center rounded-lg bg-[#D4AF37] px-4 py-2 text-xs font-semibold text-black transition hover:bg-[#E2C259]"
          >
            Go to ANVIX
          </button>
        </div>
      </div>
    );
  }

  const selectedProjectFile =
    payload.resource_type === "project"
      ? payload.resource.files.find((file) => file.path === selectedFile) ?? null
      : null;

  return (
    <div className="min-h-screen bg-[#0B0B0D] text-white">
      <header className="flex h-14 items-center justify-between border-b border-zinc-800/80 bg-[#0F0F11] px-4">
        <button
          type="button"
          onClick={() => router.push("/")}
          className="text-sm font-semibold tracking-tight text-zinc-100"
        >
          ANVIX <span className="text-[#D4AF37]">AI</span>
        </button>
        <span className="rounded-full border border-zinc-800 bg-[#0B0B0D] px-2.5 py-1 text-[9px] font-medium text-zinc-500">
          Shared {payload.resource_type === "chat" ? "chat" : "app"} · read-only
        </span>
      </header>

      <main className="mx-auto w-full max-w-3xl px-4 py-8">
        {payload.resource_type === "chat" ? (
          <>
            <h1 className="text-xl font-semibold tracking-tight text-zinc-100">
              {payload.resource.title}
            </h1>
            <p className="mt-1 text-xs text-zinc-500">
              Shared {new Date(payload.share.created_at).toLocaleDateString()}
              {payload.share.expires_at
                ? ` · expires ${new Date(payload.share.expires_at).toLocaleDateString()}`
                : " · no expiry"}
            </p>

            <div className="mt-6 space-y-4">
              {payload.resource.messages.length === 0 && (
                <p className="text-sm text-zinc-500">This chat has no messages.</p>
              )}
              {payload.resource.messages.map((message) => (
                <div
                  key={message.id}
                  className={`rounded-2xl border px-4 py-3 ${
                    message.role === "user"
                      ? "border-zinc-800 bg-[#0D0D0F]"
                      : "border-[#D4AF37]/15 bg-[#D4AF37]/[0.04]"
                  }`}
                >
                  <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
                    {message.role === "user" ? "You" : "ANVIX"}
                  </p>
                  <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-zinc-200">
                    {message.content}
                  </p>
                </div>
              ))}
            </div>
          </>
        ) : (
          <>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h1 className="text-xl font-semibold tracking-tight text-zinc-100">
                  {payload.resource.name}
                </h1>
                <p className="mt-1 text-xs text-zinc-500">
                  {payload.resource.framework} · {payload.resource.files.length} files
                  {payload.share.expires_at
                    ? ` · link expires ${new Date(payload.share.expires_at).toLocaleDateString()}`
                    : " · link has no expiry"}
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleOpenInWorkspace}
                  className="rounded-lg bg-[#D4AF37] px-3 py-2 text-[11px] font-semibold text-black transition hover:bg-[#E2C259]"
                >
                  Open in workspace
                </button>
                <button
                  type="button"
                  onClick={handleDownloadZip}
                  className="flex items-center gap-1.5 rounded-lg border border-zinc-800 bg-[#0B0B0D] px-3 py-2 text-[11px] font-medium text-zinc-300 transition hover:border-zinc-700"
                >
                  <Download className="h-3 w-3" />
                  ZIP
                </button>
              </div>
            </div>

            <div className="mt-6 overflow-hidden rounded-2xl border border-zinc-800">
              <div className="border-b border-zinc-800 bg-[#0D0D0F] px-4 py-2">
                <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
                  <FileCode2 className="h-3 w-3" />
                  Files
                </p>
              </div>
              <ul className="max-h-64 overflow-y-auto bg-[#0B0B0D]">
                {payload.resource.files.map((file) => (
                  <li key={file.path}>
                    <button
                      type="button"
                      onClick={() => setSelectedFile(file.path)}
                      className={`w-full px-4 py-2 text-left font-mono text-xs transition ${
                        file.path === selectedFile
                          ? "bg-[#D4AF37]/[0.08] text-[#D4AF37]"
                          : "text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200"
                      }`}
                    >
                      {file.path}
                    </button>
                  </li>
                ))}
              </ul>
              {selectedProjectFile && (
                <pre className="max-h-96 overflow-auto border-t border-zinc-800 bg-black/40 p-4 font-mono text-[11px] leading-5 text-zinc-300">
                  {selectedProjectFile.content}
                </pre>
              )}
            </div>
          </>
        )}

        {payload.comments_unavailable ? (
          <p className="mt-8 text-[11px] text-zinc-600">
            Comments are unavailable on this deployment.
          </p>
        ) : (
          <ShareComments
            token={token}
            canComment={payload.share.permission === "comment"}
            initialComments={payload.comments}
            authorName={user?.email ?? "Guest"}
          />
        )}

        <section className="mt-8 rounded-2xl border border-zinc-800 bg-[#0D0D0F] p-4">
          <h2 className="flex items-center gap-1.5 text-xs font-semibold text-zinc-200">
            <Flag className="h-3 w-3 text-zinc-500" />
            Report this link
          </h2>
          {reportState === "sent" ? (
            <p className="mt-2 text-xs leading-5 text-emerald-400">
              Thanks — the report was sent to the link&apos;s owner, who can revoke it.
            </p>
          ) : (
            <>
              <p className="mt-1 text-[11px] leading-5 text-zinc-500">
                If this shared item is spam, abusive or private content posted without
                permission, tell the owner.
              </p>
              <div className="mt-3 flex gap-2">
                <input
                  type="text"
                  value={reportReason}
                  onChange={(event) => setReportReason(event.target.value)}
                  maxLength={500}
                  placeholder="Briefly, what is wrong with this link?"
                  className="min-w-0 flex-1 rounded-lg border border-zinc-800 bg-[#0B0B0D] px-3 py-2 text-xs text-zinc-200 outline-none placeholder:text-zinc-700"
                />
                <button
                  type="button"
                  onClick={() => void handleReport()}
                  disabled={!reportReason.trim() || reportState === "sending"}
                  className="shrink-0 rounded-lg border border-zinc-800 px-3 py-2 text-[11px] font-medium text-zinc-300 transition hover:border-zinc-700 disabled:opacity-50"
                >
                  {reportState === "sending" ? "Sending…" : "Report"}
                </button>
              </div>
              {reportError && (
                <p className="mt-2 text-[11px] text-red-300">{reportError}</p>
              )}
            </>
          )}
        </section>

        <p className="mt-8 flex items-center justify-center gap-1.5 text-center text-[11px] text-zinc-600">
          <MessageSquare className="h-3 w-3" />
          Shared with ANVIX AI — build your own at anvix.
        </p>
      </main>
    </div>
  );
}
