"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Volume2, Square } from "lucide-react";
import {
  startReadAloud,
  type ReadAloudHandle,
} from "@/lib/tts-client";

/**
 * "Listen" on an assistant reply.
 *
 * Tries Gemini TTS first (free through 31 Dec 2026, 5/day); when
 * Gemini voice is unavailable, expired, or the cap is hit, it falls
 * back to the browser's built-in voice automatically and says so in
 * a small note — the button never silently dies on 1 Jan 2027.
 * Tapping while playing stops playback.
 */
export default function ListenButton({ text }: { text: string }) {
  const [state, setState] = useState<
    "idle" | "loading" | "playing" | "error"
  >("idle");
  const [source, setSource] = useState<"gemini" | "browser" | null>(null);
  const handleRef = useRef<ReadAloudHandle | null>(null);

  const stop = useCallback(() => {
    handleRef.current?.stop();
    handleRef.current = null;
    setState("idle");
    setSource(null);
  }, []);

  useEffect(() => stop, [stop]);

  const handleClick = useCallback(async () => {
    if (state === "playing" || state === "loading") {
      stop();
      return;
    }

    if (!text.trim()) return;

    // No pre-gate on browser speech: Gemini TTS plays through
    // <audio> and works even where speechSynthesis is missing.
    // startReadAloud throws only when no voice path works at all,
    // and the catch below turns that into "Voice unavailable".
    setState("loading");
    setSource(null);

    try {
      const handle = await startReadAloud(text, () => {
        handleRef.current = null;
        setState("idle");
        setSource(null);
      });
      handleRef.current = handle;
      setSource(handle.source);
      setState("playing");
    } catch {
      setState("error");
    }
  }, [state, stop, text]);

  const label =
    state === "playing"
      ? "Stop"
      : state === "loading"
        ? "Loading voice…"
        : state === "error"
          ? "Voice unavailable"
          : "Listen";

  return (
    <span className="inline-flex items-center gap-1.5">
      <button
        type="button"
        onClick={() => void handleClick()}
        disabled={state === "error"}
        aria-label={label}
        title={
          state === "playing"
            ? "Stop reading aloud"
            : "Listen to this reply"
        }
        className="
          inline-flex min-h-8 items-center justify-center gap-1.5
          rounded-lg border border-white/10 bg-white/[0.04]
          px-2.5 text-xs font-medium text-zinc-400
          transition-colors hover:border-[#D4AF37]/30
          hover:bg-[#D4AF37]/[0.08] hover:text-[#E9C96B]
          focus-visible:outline-none focus-visible:ring-2
          focus-visible:ring-[#D4AF37]/60
          disabled:cursor-not-allowed disabled:opacity-50
        "
      >
        {state === "playing" ? (
          <Square
            className="h-3.5 w-3.5"
            fill="currentColor"
            aria-hidden="true"
          />
        ) : (
          <Volume2 className="h-3.5 w-3.5" aria-hidden="true" />
        )}
        <span>{label}</span>
      </button>
      {state === "playing" && source === "browser" ? (
        <span className="text-[11px] text-zinc-500">
          Browser voice — Gemini voice unavailable
        </span>
      ) : null}
    </span>
  );
}
