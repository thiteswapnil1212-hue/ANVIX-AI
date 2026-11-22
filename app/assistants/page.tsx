"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import AppShell from "@/components/layout/AppShell";
import { useAuth } from "@/components/auth/AuthProvider";
import { getAuthHeaders } from "@/lib/api/auth-headers";
import {
  STARTER_ASSISTANTS,
  storeAssistantSelection,
  type AssistantRecord,
  type StarterAssistant,
  type StoredAssistantSelection,
} from "@/lib/assistants";
import {
  createAssistant,
  deleteAssistant,
  fetchAssistants,
  fetchPublicAssistantByShareToken,
  updateAssistant,
} from "@/lib/supabase/assistants-memory";

/**
 * /assistants — custom assistants ("skills" pattern, report §8).
 *
 * A named assistant = saved instructions + a tool set, reusable
 * across chats. NOT Custom GPTs / Gems (both deleted Dec 2026).
 * Signed-in users save their own; guests can still try the starters
 * inline in chat. A public assistant has a share link; opening it
 * offers a one-tap copy into your own account.
 *
 * Reference files: the table reserves file_ids, but no stored-file
 * plumbing exists in this base — the form says so plainly instead of
 * pretending files attach.
 */

export type { StoredAssistantSelection } from "@/lib/assistants";

type EditorState = {
  id: string | null;
  name: string;
  description: string;
  instructions: string;
  mode: "" | "fast" | "smart" | "deep";
  isPublic: boolean;
};

const emptyEditor: EditorState = {
  id: null,
  name: "",
  description: "",
  instructions: "",
  mode: "",
  isPublic: false,
};

function AssistantsPageContent() {
  const { configured, user, loading } = useAuth();
  const searchParams = useSearchParams();
  const shareToken = searchParams.get("share") ?? "";

  const [assistants, setAssistants] = useState<AssistantRecord[] | null>(null);
  const [loadError, setLoadError] = useState("");
  const [editor, setEditor] = useState<EditorState>(emptyEditor);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editorStatus, setEditorStatus] = useState("");
  const [shared, setShared] = useState<AssistantRecord | null>(null);
  const [sharedStatus, setSharedStatus] = useState("");
  const [copyStatus, setCopyStatus] = useState("");

  const load = useCallback(async () => {
    if (!user) return;
    const rows = await fetchAssistants(user.id);
    if (rows === null) {
      setLoadError(
        "Could not load your assistants. If the new database tables have not been applied yet, saving is unavailable."
      );
      setAssistants([]);
      return;
    }
    setLoadError("");
    setAssistants(rows);
  }, [user]);

  // Load once per account (the effect inlines the fetch instead of
  // calling `load` — calling a state-setting callback from an effect
  // trips the set-state-in-effect lint rule).
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    void (async () => {
      const rows = await fetchAssistants(user.id);
      if (cancelled) return;
      if (rows === null) {
        setLoadError(
          "Could not load your assistants. If the new database tables have not been applied yet, saving is unavailable."
        );
        setAssistants([]);
        return;
      }
      setLoadError("");
      setAssistants(rows);
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  useEffect(() => {
    if (!shareToken) return;
    let cancelled = false;
    void (async () => {
      const found = await fetchPublicAssistantByShareToken(shareToken);
      if (!cancelled) setShared(found);
    })();
    return () => {
      cancelled = true;
    };
  }, [shareToken]);

  const pickForChat = (selection: StoredAssistantSelection) => {
    storeAssistantSelection(selection);
  };

  const saveEditor = async () => {
    if (!user) return;
    setEditorStatus("Saving…");
    const payload = {
      name: editor.name,
      description: editor.description,
      instructions: editor.instructions,
      fileIds: [],
      toolsEnabled: ["web"],
      mode: editor.mode === "" ? null : editor.mode,
      isPublic: editor.isPublic,
    };
    const saved = editor.id
      ? await updateAssistant(user.id, editor.id, payload)
      : await createAssistant(user.id, payload);
    if (!saved) {
      setEditorStatus(
        "Could not save. Check the name/instructions and try again."
      );
      return;
    }
    setEditorStatus("Saved.");
    setEditorOpen(false);
    setEditor(emptyEditor);
    await load();
  };

  const removeAssistant = async (id: string) => {
    if (!user) return;
    const ok = await deleteAssistant(user.id, id);
    if (ok) await load();
  };

  const saveStarter = async (starter: StarterAssistant) => {
    if (!user) return;
    const saved = await createAssistant(user.id, {
      name: starter.name,
      description: starter.description,
      instructions: starter.instructions,
      fileIds: [],
      toolsEnabled: starter.toolsEnabled,
      mode: starter.mode,
      isPublic: false,
    });
    if (saved) await load();
  };

  const copyShared = async () => {
    if (!user || !shared) return;
    setSharedStatus("Copying…");
    try {
      const response = await fetch("/api/assistants/copy", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(await getAuthHeaders()),
        },
        body: JSON.stringify({ shareToken: shared.shareToken }),
      });
      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as {
          error?: string;
        } | null;
        setSharedStatus(data?.error ?? "Could not copy that assistant.");
        return;
      }
      setSharedStatus("Copied to your assistants.");
      await load();
    } catch {
      setSharedStatus("Could not copy that assistant. Please try again.");
    }
  };

  const shareLink = (assistant: AssistantRecord) =>
    `${typeof window !== "undefined" ? window.location.origin : ""}/assistants?share=${assistant.shareToken}`;

  const copyShareLink = async (assistant: AssistantRecord) => {
    try {
      await navigator.clipboard.writeText(shareLink(assistant));
      setCopyStatus(`Share link copied for “${assistant.name}”.`);
    } catch {
      setCopyStatus("Could not copy — copy the link from the address bar.");
    }
  };

  return (
    <AppShell
      title="Assistants"
      description="Reusable AI assistants with their own instructions — the skills pattern."
    >
      <div className="mx-auto w-full max-w-6xl space-y-8 pb-10">
        <section className="relative isolate overflow-hidden rounded-3xl border border-white/[0.08] bg-[#111113]">
          <div className="relative p-5 sm:p-8 lg:p-9">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#D4AF37]">
              ANVIX / Assistants
            </p>
            <h2 className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-white sm:text-4xl">
              Assistants that remember their job.
            </h2>
            <p className="mt-3 max-w-xl text-sm leading-6 text-zinc-400">
              A custom assistant is a name, instructions and a tool set —
              reusable across chats. Pick one in chat and it answers in
              that role. Public assistants can be shared with a link;
              anyone opening it can copy it into their own account.
            </p>
            <p className="mt-2 max-w-xl text-xs leading-5 text-zinc-500">
              Reference files are not attached yet — the app has no
              stored-file plumbing for assistants, so attach files per
              message in chat for now.
            </p>
          </div>
        </section>

        {/* SHARED ASSISTANT PREVIEW */}
        {shareToken && (
          <section className="rounded-2xl border border-[#D4AF37]/25 bg-[#D4AF37]/[0.05] p-5">
            {shared === null ? (
              <p className="text-sm text-zinc-400">
                Loading the shared assistant…
              </p>
            ) : (
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-white">
                  Shared assistant: {shared.name}
                </h3>
                <p className="text-sm leading-6 text-zinc-400">
                  {shared.description || "No description."}
                </p>
                {!user ? (
                  <p className="text-sm text-zinc-400">
                    <Link href="/auth" className="text-[#D4AF37] underline">
                      Sign in
                    </Link>{" "}
                    to copy this assistant into your account, or try it
                    below in chat as a guest.
                  </p>
                ) : (
                  <button
                    type="button"
                    onClick={() => void copyShared()}
                    className="inline-flex h-10 items-center rounded-lg bg-[#D4AF37] px-4 text-xs font-semibold text-black transition hover:bg-[#E2C259]"
                  >
                    Copy to my assistants
                  </button>
                )}
                {sharedStatus && (
                  <p className="text-xs text-zinc-500">{sharedStatus}</p>
                )}
              </div>
            )}
          </section>
        )}

        {/* STARTERS */}
        <section>
          <h2 className="text-xl font-semibold tracking-tight text-white">
            Starters
          </h2>
          <p className="mt-1 text-sm text-zinc-500">
            Try one now — no account needed. Sign in to save a copy you
            can edit.
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {STARTER_ASSISTANTS.map((starter) => (
              <div
                key={starter.name}
                className="rounded-2xl border border-white/[0.07] bg-[#111113] p-5"
              >
                <h3 className="text-sm font-semibold text-zinc-100">
                  {starter.name}
                </h3>
                <p className="mt-1.5 text-xs leading-5 text-zinc-500">
                  {starter.description}
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Link
                    href="/chat"
                    onClick={() =>
                      pickForChat({
                        id: null,
                        name: starter.name,
                        instructions: starter.instructions,
                        mode: starter.mode,
                      })
                    }
                    className="inline-flex h-9 items-center rounded-lg bg-[#D4AF37] px-3.5 text-xs font-semibold text-black transition hover:bg-[#E2C259]"
                  >
                    Use in chat
                  </Link>
                  {user && (
                    <button
                      type="button"
                      onClick={() => void saveStarter(starter)}
                      className="inline-flex h-9 items-center rounded-lg border border-white/[0.1] px-3.5 text-xs font-medium text-zinc-300 transition hover:border-white/[0.2] hover:text-white"
                    >
                      Save a copy
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* YOUR ASSISTANTS */}
        <section>
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold tracking-tight text-white">
                Your assistants
              </h2>
              <p className="mt-1 text-sm text-zinc-500">
                Saved to your account. Pick one in chat from the assistant
                menu.
              </p>
            </div>
            {user && (
              <button
                type="button"
                onClick={() => {
                  setEditor(emptyEditor);
                  setEditorStatus("");
                  setEditorOpen(true);
                }}
                className="inline-flex h-10 items-center rounded-lg bg-[#D4AF37] px-4 text-xs font-semibold text-black transition hover:bg-[#E2C259]"
              >
                New assistant
              </button>
            )}
          </div>

          {loading ? (
            <p className="mt-4 text-sm text-zinc-400">Checking your account…</p>
          ) : !configured || !user ? (
            <p className="mt-4 rounded-2xl border border-white/[0.07] bg-[#111113] p-5 text-sm leading-6 text-zinc-400">
              You are in guest mode.{" "}
              <Link href="/auth" className="text-[#D4AF37] underline">
                Sign in
              </Link>{" "}
              to save your own assistants — starters above still work in
              chat without an account.
            </p>
          ) : loadError ? (
            <p className="mt-4 rounded-2xl border border-white/[0.07] bg-[#111113] p-5 text-sm leading-6 text-zinc-400">
              {loadError}
            </p>
          ) : assistants && assistants.length === 0 ? (
            <p className="mt-4 rounded-2xl border border-white/[0.07] bg-[#111113] p-5 text-sm leading-6 text-zinc-400">
              No assistants yet. Create one, or save a copy of a starter.
            </p>
          ) : (
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {(assistants ?? []).map((assistant) => (
                <div
                  key={assistant.id}
                  className="rounded-2xl border border-white/[0.07] bg-[#111113] p-5"
                >
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="text-sm font-semibold text-zinc-100">
                      {assistant.name}
                    </h3>
                    <span className="shrink-0 rounded-full border border-white/[0.07] px-2 py-1 text-[9px] text-zinc-500">
                      {assistant.isPublic ? "Public" : "Private"}
                      {assistant.mode ? ` · ${assistant.mode}` : ""}
                    </span>
                  </div>
                  <p className="mt-1.5 text-xs leading-5 text-zinc-500">
                    {assistant.description || "No description."}
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Link
                      href="/chat"
                      onClick={() =>
                        pickForChat({
                          id: assistant.id,
                          name: assistant.name,
                          instructions: assistant.instructions,
                          mode: assistant.mode,
                        })
                      }
                      className="inline-flex h-9 items-center rounded-lg bg-[#D4AF37] px-3.5 text-xs font-semibold text-black transition hover:bg-[#E2C259]"
                    >
                      Use in chat
                    </Link>
                    <button
                      type="button"
                      onClick={() => {
                        setEditor({
                          id: assistant.id,
                          name: assistant.name,
                          description: assistant.description,
                          instructions: assistant.instructions,
                          mode: assistant.mode ?? "",
                          isPublic: assistant.isPublic,
                        });
                        setEditorStatus("");
                        setEditorOpen(true);
                      }}
                      className="inline-flex h-9 items-center rounded-lg border border-white/[0.1] px-3.5 text-xs font-medium text-zinc-300 transition hover:border-white/[0.2] hover:text-white"
                    >
                      Edit
                    </button>
                    {assistant.isPublic && (
                      <button
                        type="button"
                        onClick={() => void copyShareLink(assistant)}
                        className="inline-flex h-9 items-center rounded-lg border border-white/[0.1] px-3.5 text-xs font-medium text-zinc-300 transition hover:border-white/[0.2] hover:text-white"
                      >
                        Copy share link
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => void removeAssistant(assistant.id)}
                      className="inline-flex h-9 items-center rounded-lg border border-red-500/20 px-3.5 text-xs font-medium text-red-400 transition hover:border-red-500/40"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
          {copyStatus && (
            <p className="mt-3 text-xs text-zinc-500">{copyStatus}</p>
          )}
        </section>

        {/* EDITOR */}
        {editorOpen && user && (
          <section className="rounded-2xl border border-white/[0.07] bg-[#111113] p-5">
            <h2 className="text-lg font-semibold text-white">
              {editor.id ? "Edit assistant" : "New assistant"}
            </h2>
            <div className="mt-4 space-y-4">
              <div>
                <label
                  htmlFor="assistant-name"
                  className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500"
                >
                  Name
                </label>
                <input
                  id="assistant-name"
                  value={editor.name}
                  onChange={(event) =>
                    setEditor({ ...editor, name: event.target.value })
                  }
                  placeholder="e.g. DSA Interview Coach"
                  maxLength={80}
                  className="mt-2 h-10 w-full rounded-lg border border-white/[0.08] bg-[#0D0D0D] px-3 text-sm text-zinc-100 outline-none placeholder:text-zinc-600 focus:border-[#D4AF37]/40"
                />
              </div>
              <div>
                <label
                  htmlFor="assistant-description"
                  className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500"
                >
                  Description
                </label>
                <input
                  id="assistant-description"
                  value={editor.description}
                  onChange={(event) =>
                    setEditor({ ...editor, description: event.target.value })
                  }
                  placeholder="What is this assistant for?"
                  maxLength={500}
                  className="mt-2 h-10 w-full rounded-lg border border-white/[0.08] bg-[#0D0D0D] px-3 text-sm text-zinc-100 outline-none placeholder:text-zinc-600 focus:border-[#D4AF37]/40"
                />
              </div>
              <div>
                <label
                  htmlFor="assistant-instructions"
                  className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500"
                >
                  Instructions — how this assistant behaves
                </label>
                <textarea
                  id="assistant-instructions"
                  value={editor.instructions}
                  onChange={(event) =>
                    setEditor({ ...editor, instructions: event.target.value })
                  }
                  placeholder="You are a … Ask one question at a time …"
                  rows={8}
                  maxLength={8000}
                  className="mt-2 w-full rounded-lg border border-white/[0.08] bg-[#0D0D0D] px-3 py-2 text-sm leading-6 text-zinc-100 outline-none placeholder:text-zinc-600 focus:border-[#D4AF37]/40"
                />
                <p className="mt-1 text-[11px] text-zinc-600">
                  {editor.instructions.length}/8000 characters. Long
                  instructions are added to every chat with this assistant,
                  so keep them tight.
                </p>
              </div>
              <div className="flex flex-wrap gap-4">
                <div>
                  <label
                    htmlFor="assistant-mode"
                    className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500"
                  >
                    Preferred mode
                  </label>
                  <select
                    id="assistant-mode"
                    value={editor.mode}
                    onChange={(event) =>
                      setEditor({
                        ...editor,
                        mode: event.target.value as EditorState["mode"],
                      })
                    }
                    className="mt-2 h-10 rounded-lg border border-white/[0.08] bg-[#0D0D0D] px-3 text-sm text-zinc-100 outline-none focus:border-[#D4AF37]/40"
                  >
                    <option value="">Chat&apos;s own mode</option>
                    <option value="fast">Fast</option>
                    <option value="smart">Smart</option>
                    <option value="deep">Deep</option>
                  </select>
                </div>
                <label className="flex items-end gap-2 pb-2 text-sm text-zinc-300">
                  <input
                    type="checkbox"
                    checked={editor.isPublic}
                    onChange={(event) =>
                      setEditor({ ...editor, isPublic: event.target.checked })
                    }
                    className="h-4 w-4 accent-[#D4AF37]"
                  />
                  Public — anyone with the link can read and copy it
                </label>
              </div>
              <p className="text-[11px] leading-5 text-zinc-600">
                Tools: web search only, for now. Reference files are not
                supported yet — the assistant&apos;s instructions are what
                shapes its answers.
              </p>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => void saveEditor()}
                  className="inline-flex h-10 items-center rounded-lg bg-[#D4AF37] px-4 text-xs font-semibold text-black transition hover:bg-[#E2C259]"
                >
                  Save assistant
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEditorOpen(false);
                    setEditor(emptyEditor);
                  }}
                  className="inline-flex h-10 items-center rounded-lg border border-white/[0.1] px-4 text-xs font-medium text-zinc-300 transition hover:border-white/[0.2] hover:text-white"
                >
                  Cancel
                </button>
              </div>
              {editorStatus && (
                <p className="text-xs text-zinc-500">{editorStatus}</p>
              )}
            </div>
          </section>
        )}

        <p className="text-xs leading-5 text-zinc-600">
          Assistants are stored per account and only you can edit yours.
          Public assistants are readable by anyone with the link — never
          put secrets in instructions.
        </p>
      </div>
    </AppShell>
  );
}

// useSearchParams() needs a Suspense boundary or the build's static
// prerender fails — the share-token preview is the only part that
// reads the query string.
export default function AssistantsPage() {
  return (
    <Suspense
      fallback={
        <AppShell
          title="Assistants"
          description="Reusable AI assistants with their own instructions — the skills pattern."
        >
          <p className="mx-auto w-full max-w-6xl pb-10 text-sm text-zinc-400">
            Loading assistants…
          </p>
        </AppShell>
      }
    >
      <AssistantsPageContent />
    </Suspense>
  );
}
