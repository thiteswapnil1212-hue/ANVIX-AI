"use client";

import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Scale } from "lucide-react";
import { OPENROUTER_FREE_MODELS } from "@/lib/openrouter";
import {
  CompareError,
  getStoredOpenRouterKey,
  requestCompare,
  saveStoredOpenRouterKey,
  type CompareResult,
} from "@/lib/compare-client";

/**
 * Side-by-side second answer, opt-in per message.
 *
 * Demo lane, BYOK only: the user pastes their own free OpenRouter
 * key (openrouter.ai/keys — free, no card), kept in this browser
 * only. No key → the panel honestly says a key is needed; ANVIX
 * never burns the shared 50 requests/day. Free providers may train
 * on prompts, and only ~half of free models answer on a given day —
 * both are stated on the panel, not hidden.
 */
export default function ComparePanel({ prompt }: { prompt: string }) {
  const [key, setKey] = useState(getStoredOpenRouterKey);
  const [model, setModel] = useState(OPENROUTER_FREE_MODELS[0]?.id ?? "");
  const [result, setResult] = useState<CompareResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [needsKey, setNeedsKey] = useState(false);
  const [loading, setLoading] = useState(false);

  const modelLabel =
    OPENROUTER_FREE_MODELS.find((entry) => entry.id === model)?.label ??
    model;

  async function handleCompare() {
    const trimmedKey = key.trim();
    if (!trimmedKey) {
      setNeedsKey(true);
      setError(
        "Add your free OpenRouter key first — compare has no shared key to fall back on."
      );
      return;
    }

    setLoading(true);
    setError(null);
    setNeedsKey(false);
    saveStoredOpenRouterKey(trimmedKey);

    try {
      const answer = await requestCompare(prompt, model, trimmedKey);
      setResult(answer);
    } catch (caught) {
      if (caught instanceof CompareError) {
        setError(caught.message);
        setNeedsKey(caught.needsKey);
      } else {
        setError("Compare failed. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mt-3 rounded-xl border border-white/10 bg-white/[0.02] px-3 py-3">
      <p className="flex items-center gap-2 text-xs font-semibold text-zinc-300">
        <Scale className="h-3.5 w-3.5 text-[#D4AF37]" aria-hidden="true" />
        Compare with a second model
        <span className="rounded-full border border-white/10 bg-white/[0.04] px-2 py-0.5 text-[10px] font-medium text-zinc-500">
          Demo lane · your key
        </span>
      </p>

      {result ? (
        <div className="mt-3">
          <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-zinc-500">
            Second answer — {modelLabel}
          </p>
          <div className="mt-1.5 whitespace-pre-wrap break-words text-[13px] leading-6 text-zinc-300">
            <ReactMarkdown remarkPlugins={[remarkGfm]} skipHtml>
              {result.content}
            </ReactMarkdown>
          </div>
          {result.note ? (
            <p className="mt-2 text-[11px] leading-5 text-zinc-600">
              {result.note}
            </p>
          ) : null}
          <button
            type="button"
            onClick={() => {
              setResult(null);
              setError(null);
            }}
            className="mt-2 text-xs font-medium text-zinc-400 underline underline-offset-4 transition-colors hover:text-[#E9C96B]"
          >
            Compare again with another model
          </button>
        </div>
      ) : (
        <div className="mt-3 space-y-2">
          <label className="block">
            <span className="mb-1 block text-[11px] font-medium text-zinc-500">
              Your OpenRouter key
              {needsKey ? " — required" : ""}
            </span>
            <input
              type="password"
              value={key}
              onChange={(event) => {
                setKey(event.target.value);
                setNeedsKey(false);
              }}
              placeholder="sk-or-v1-… (free key from openrouter.ai/keys)"
              autoComplete="off"
              className="
                w-full rounded-lg border border-white/10 bg-white/[0.04]
                px-2.5 py-2 text-[13px] text-zinc-100 outline-none
                placeholder:text-zinc-600
                focus-visible:ring-2 focus-visible:ring-[#D4AF37]/60
              "
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-[11px] font-medium text-zinc-500">
              Second model (free only)
            </span>
            <select
              value={model}
              onChange={(event) => setModel(event.target.value)}
              className="
                w-full rounded-lg border border-white/10 bg-[#18181B]
                px-2.5 py-2 text-[13px] text-zinc-100 outline-none
                focus-visible:ring-2 focus-visible:ring-[#D4AF37]/60
              "
            >
              {OPENROUTER_FREE_MODELS.map((entry) => (
                <option key={entry.id} value={entry.id}>
                  {entry.label} — {entry.blurb}
                </option>
              ))}
            </select>
          </label>

          <p className="text-[11px] leading-5 text-zinc-600">
            Your key stays in this browser only (it moves to ANVIX&apos;s
            encrypted key store when BYOK lands). Free OpenRouter models:
            50 requests/day per key, the lineup rotates, and only about
            half answer on a given day — free providers may also train
            on prompts.
          </p>

          {error ? (
            <p role="alert" className="text-[12px] leading-5 text-red-400">
              {error}
            </p>
          ) : null}

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => void handleCompare()}
              disabled={loading}
              className="
                rounded-lg bg-[#D4AF37] px-3 py-2 text-xs
                font-semibold text-black transition-colors
                hover:bg-[#E0BB4C] disabled:cursor-not-allowed
                disabled:opacity-40
                focus-visible:outline-none focus-visible:ring-2
                focus-visible:ring-[#D4AF37]
              "
            >
              {loading ? "Asking second model…" : "Get second answer"}
            </button>
            <button
              type="button"
              onClick={() => saveStoredOpenRouterKey("")}
              disabled={loading || !key.trim()}
              className="
                rounded-lg border border-white/10 px-3 py-2
                text-xs font-medium text-zinc-400 transition-colors
                hover:text-zinc-200 disabled:cursor-not-allowed
                disabled:opacity-40
              "
            >
              Forget key
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
