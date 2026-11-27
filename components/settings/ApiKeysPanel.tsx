"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";

/**
 * Public API keys (anvix_live_...) — list, create, revoke.
 *
 * The routes already existed (`/api/v1/keys`, `/api/v1/keys/[id]/revoke`)
 * but keys could only be minted by direct API calls; there was no UI.
 * The plaintext key is shown exactly once, at creation — ANVIX cannot
 * show it again afterwards, so the panel says so and offers Copy.
 */

type ApiKeyRow = {
  id: string;
  name: string;
  prefix: string;
  scopes: string[];
  rateLimitPerMin: number;
  dailyCap: number;
  lastUsedAt: string | null;
  createdAt: string;
  revokedAt: string | null;
};

async function readError(
  response: Response,
  fallback: string
): Promise<string> {
  try {
    const body = (await response.json()) as { error?: unknown };
    return typeof body.error === "string" ? body.error : fallback;
  } catch {
    return fallback;
  }
}

type KeysResult = { keys: ApiKeyRow[] } | { error: string };

/** Pure fetch (no setState): the effect and the handlers share it. */
async function fetchKeys(): Promise<KeysResult> {
  try {
    const response = await fetch("/api/v1/keys");
    if (!response.ok) {
      return { error: await readError(response, "Could not load API keys.") };
    }
    const body = (await response.json()) as { keys?: ApiKeyRow[] };
    return { keys: Array.isArray(body.keys) ? body.keys : [] };
  } catch {
    return { error: "Could not load API keys. Check your connection." };
  }
}

function applyKeysResult(
  result: KeysResult,
  setKeys: (keys: ApiKeyRow[]) => void,
  setStatus: (status: string) => void
): void {
  if ("error" in result) {
    setStatus(result.error);
    setKeys([]);
  } else {
    setKeys(result.keys);
    setStatus("");
  }
}

export default function ApiKeysPanel() {
  const { user, loading } = useAuth();
  const [keys, setKeys] = useState<ApiKeyRow[] | null>(null);
  const [status, setStatus] = useState("");
  const [name, setName] = useState("");
  const [creating, setCreating] = useState(false);
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const [newKey, setNewKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const refresh = useCallback(async () => {
    applyKeysResult(await fetchKeys(), setKeys, setStatus);
  }, []);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    // GitHubPanel pattern: the fetch runs in an async callback, and
    // setState happens after the await (never synchronously in the
    // effect body — the set-state-in-effect lint rule).
    void (async () => {
      const result = await fetchKeys();
      if (cancelled) return;
      applyKeysResult(result, setKeys, setStatus);
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  const handleCreate = async () => {
    setCreating(true);
    setStatus("");
    setNewKey(null);
    try {
      const response = await fetch("/api/v1/keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() }),
      });
      if (!response.ok) {
        setStatus(await readError(response, "Could not create an API key."));
        return;
      }
      const body = (await response.json()) as { key?: unknown };
      if (typeof body.key !== "string") {
        setStatus("The key was created but not returned. Try again.");
        return;
      }
      setNewKey(body.key);
      setName("");
      await refresh();
    } catch {
      setStatus("Could not create an API key. Check your connection.");
    } finally {
      setCreating(false);
    }
  };

  const handleRevoke = async (id: string) => {
    setRevokingId(id);
    setStatus("");
    try {
      const response = await fetch(`/api/v1/keys/${id}/revoke`, {
        method: "POST",
      });
      if (!response.ok) {
        setStatus(
          await readError(response, "Could not revoke that API key.")
        );
        return;
      }
      await refresh();
    } catch {
      setStatus("Could not revoke that API key. Check your connection.");
    } finally {
      setRevokingId(null);
    }
  };

  const handleCopyKey = async () => {
    if (!newKey) return;
    try {
      await navigator.clipboard.writeText(newKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard unavailable: the key is still visible above.
    }
  };

  if (loading) {
    return <p className="text-sm leading-6 text-zinc-400">Checking your account…</p>;
  }

  if (!user) {
    return (
      <p className="text-sm leading-6 text-zinc-400">
        Sign in to create API keys for the public API. Guests cannot mint
        keys.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {newKey && (
        <div className="rounded-xl border border-[#D4AF37]/30 bg-[#D4AF37]/[0.06] p-4">
          <p className="text-sm font-medium text-zinc-100">
            Your new API key — save it now
          </p>
          <p className="mt-1 text-xs leading-5 text-zinc-400">
            It is shown only once and cannot be recovered. Use it as the{" "}
            <code className="text-zinc-300">X-API-Key</code> header (or a{" "}
            <code className="text-zinc-300">Bearer</code> token) against{" "}
            <code className="text-zinc-300">/api/v1/chat</code>.
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <code className="min-w-0 flex-1 break-all rounded-lg border border-white/[0.08] bg-[#0D0D0D] px-3 py-2 text-xs text-zinc-100">
              {newKey}
            </code>
            <button
              type="button"
              onClick={() => void handleCopyKey()}
              className="inline-flex h-9 items-center rounded-lg bg-[#D4AF37] px-3 text-xs font-semibold text-black transition hover:bg-[#E2C259]"
            >
              {copied ? "Copied" : "Copy key"}
            </button>
          </div>
        </div>
      )}

      <div>
        <label
          htmlFor="public-api-key-name"
          className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500"
        >
          New key name
        </label>
        <div className="mt-2 flex flex-wrap gap-3">
          <input
            id="public-api-key-name"
            type="text"
            autoComplete="off"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Default key"
            className="h-10 min-w-56 flex-1 rounded-lg border border-white/[0.08] bg-[#0D0D0D] px-3 text-sm text-zinc-100 outline-none transition placeholder:text-zinc-600 focus:border-[#D4AF37]/40"
          />
          <button
            type="button"
            disabled={creating}
            onClick={() => void handleCreate()}
            className="inline-flex h-10 items-center rounded-lg bg-[#D4AF37] px-4 text-xs font-semibold text-black transition hover:bg-[#E2C259] disabled:opacity-50"
          >
            {creating ? "Creating…" : "Create key"}
          </button>
        </div>
      </div>

      {status && (
        <p role="alert" className="text-xs leading-5 text-red-400">
          {status}
        </p>
      )}

      {keys === null ? (
        <p className="text-sm leading-6 text-zinc-400">Loading your keys…</p>
      ) : keys.length === 0 ? (
        <p className="text-sm leading-6 text-zinc-400">
          No API keys yet. Each key is limited to 30 requests per minute
          and 100 per day on the shared quota.
        </p>
      ) : (
        <ul className="space-y-3">
          {keys.map((key) => (
            <li
              key={key.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/[0.07] bg-black/20 px-4 py-3"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-zinc-100">
                  {key.name}{" "}
                  <span className="text-zinc-500">({key.prefix}…)</span>
                </p>
                <p className="mt-0.5 text-xs leading-5 text-zinc-500">
                  {key.scopes.join(", ")} · {key.rateLimitPerMin}/min ·{" "}
                  {key.dailyCap}/day
                  {key.lastUsedAt
                    ? ` · last used ${new Date(key.lastUsedAt).toLocaleDateString()}`
                    : " · never used"}
                  {key.revokedAt
                    ? ` · revoked ${new Date(key.revokedAt).toLocaleDateString()}`
                    : ""}
                </p>
              </div>
              {key.revokedAt ? (
                <span className="rounded-full border border-white/[0.07] px-2.5 py-1 text-[11px] font-medium text-zinc-500">
                  Revoked
                </span>
              ) : (
                <button
                  type="button"
                  disabled={revokingId === key.id}
                  onClick={() => void handleRevoke(key.id)}
                  className="inline-flex h-9 items-center rounded-lg border border-white/[0.1] px-3 text-xs font-medium text-zinc-300 transition hover:border-white/[0.2] hover:text-white disabled:opacity-50"
                >
                  {revokingId === key.id ? "Revoking…" : "Revoke"}
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
