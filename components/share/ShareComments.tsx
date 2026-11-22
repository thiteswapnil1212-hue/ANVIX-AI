"use client";

import { useState } from "react";

import type { ShareCommentRecord } from "@/lib/share/share";

interface ShareCommentsProps {
  token: string;
  canComment: boolean;
  initialComments: ShareCommentRecord[];
  authorName: string;
}

/**
 * Comments on a shared resource, for visitors holding the link.
 * Only rendered with comment access — view-only shares get a short
 * note instead. Posting needs no account: the link is the invite.
 */
export default function ShareComments({
  token,
  canComment,
  initialComments,
  authorName,
}: ShareCommentsProps) {
  const [comments, setComments] = useState<ShareCommentRecord[]>(initialComments);
  const [name, setName] = useState(authorName);
  const [body, setBody] = useState("");
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handlePost() {
    if (!body.trim() || posting) return;
    setPosting(true);
    setError(null);

    try {
      const response = await fetch(`/api/share/${token}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() || "Guest", body: body.trim() }),
      });
      const data = (await response.json()) as {
        comment?: ShareCommentRecord;
        message?: string;
      };
      if (!response.ok || !data.comment) {
        setError(data.message ?? "Could not post the comment.");
        return;
      }
      setComments((current) => [...current, data.comment as ShareCommentRecord]);
      setBody("");
    } catch {
      setError("Could not reach the server. Try again.");
    } finally {
      setPosting(false);
    }
  }

  return (
    <section className="mt-8 border-t border-zinc-800 pt-6">
      <h2 className="text-sm font-semibold text-zinc-100">
        Comments ({comments.length})
      </h2>

      {comments.length === 0 ? (
        <p className="mt-3 text-xs leading-5 text-zinc-500">
          No comments yet.
        </p>
      ) : (
        <ul className="mt-4 space-y-3">
          {comments.map((comment) => (
            <li
              key={comment.id}
              className="rounded-xl border border-zinc-800 bg-[#0D0D0F] px-4 py-3"
            >
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-xs font-medium text-zinc-200">
                  {comment.author_name}
                </span>
                <span className="shrink-0 text-[10px] text-zinc-600">
                  {new Date(comment.created_at).toLocaleString()}
                </span>
              </div>
              <p className="mt-1 whitespace-pre-wrap text-xs leading-5 text-zinc-400">
                {comment.body}
              </p>
            </li>
          ))}
        </ul>
      )}

      {canComment ? (
        <div className="mt-4 rounded-xl border border-zinc-800 bg-[#0D0D0F] p-4">
          <label className="block">
            <span className="text-[10px] uppercase tracking-[0.14em] text-zinc-600">
              Your name
            </span>
            <input
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              maxLength={100}
              placeholder="Guest"
              className="mt-1 w-full rounded-lg border border-zinc-800 bg-[#0B0B0D] px-3 py-2 text-xs text-zinc-200 outline-none placeholder:text-zinc-700"
            />
          </label>
          <label className="mt-3 block">
            <span className="text-[10px] uppercase tracking-[0.14em] text-zinc-600">
              Comment
            </span>
            <textarea
              value={body}
              onChange={(event) => setBody(event.target.value)}
              maxLength={2000}
              rows={3}
              placeholder="Leave a comment on this shared item…"
              className="mt-1 w-full resize-none rounded-lg border border-zinc-800 bg-[#0B0B0D] px-3 py-2 text-xs leading-5 text-zinc-200 outline-none placeholder:text-zinc-700"
            />
          </label>
          {error && (
            <p className="mt-2 text-[11px] text-red-300">{error}</p>
          )}
          <button
            type="button"
            onClick={() => void handlePost()}
            disabled={!body.trim() || posting}
            className="mt-3 rounded-lg bg-[#D4AF37] px-4 py-2 text-[11px] font-semibold text-black transition hover:bg-[#E2C259] disabled:opacity-50"
          >
            {posting ? "Posting…" : "Post comment"}
          </button>
        </div>
      ) : (
        <p className="mt-4 text-[11px] leading-5 text-zinc-500">
          The owner shared this read-only — comments are off for this link.
        </p>
      )}
    </section>
  );
}
