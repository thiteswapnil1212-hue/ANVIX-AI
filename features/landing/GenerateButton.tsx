
"use client";

import { ArrowRight, Loader2 } from "lucide-react";

interface GenerateButtonProps {
  onClick?: () => void;
  loading?: boolean;
  disabled?: boolean;
}

export default function GenerateButton({
  onClick,
  loading = false,
  disabled = false,
}: GenerateButtonProps) {
  const isDisabled = loading || disabled;

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={isDisabled}
      aria-busy={loading}
      className="
        group relative mt-6 flex min-h-14 w-full
        items-center justify-center gap-2.5
        overflow-hidden rounded-2xl
        border border-[#F3D878]/40
        bg-[#D4AF37] px-6 py-4
        font-semibold text-black
        shadow-[0_6px_24px_rgba(212,175,55,0.12)]
        transition-[transform,background-color,box-shadow]
        duration-200
        hover:bg-[#E5C158]
        hover:shadow-[0_0_30px_rgba(212,175,55,0.28)]
        focus-visible:outline-none
        focus-visible:ring-2
        focus-visible:ring-[#F3D878]
        focus-visible:ring-offset-2
        focus-visible:ring-offset-[#09090B]
        active:scale-[0.98]
        disabled:cursor-not-allowed
        disabled:opacity-55
        disabled:shadow-none
        disabled:active:scale-100
        motion-reduce:transition-none
      "
    >
      {/* Subtle shimmer */}
      {!isDisabled && (
        <span
          aria-hidden="true"
          className="
            pointer-events-none absolute inset-0
            -translate-x-full
            bg-gradient-to-r
            from-transparent via-white/25 to-transparent
            transition-transform duration-700
            group-hover:translate-x-full
            motion-reduce:hidden
          "
        />
      )}

      <span
        className="relative z-10 inline-flex items-center justify-center gap-2.5"
      >
        {loading ? (
          <>
            <Loader2
              aria-hidden="true"
              className="h-5 w-5 animate-spin motion-reduce:animate-none"
              strokeWidth={2}
            />
            <span>Generating...</span>
          </>
        ) : (
          <>
            <span>{disabled ? "Generate App" : "Generate App"}</span>
            <ArrowRight
              aria-hidden="true"
              className="
                h-5 w-5
                transition-transform duration-200
                group-hover:translate-x-1
                motion-reduce:transition-none
              "
              strokeWidth={2}
            />
          </>
        )}
      </span>

      {/* Screen-reader status */}
      <span className="sr-only" role="status" aria-live="polite">
        {loading ? "App generation is in progress." : ""}
      </span>
    </button>
  );
}