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
  return (
    <button
      onClick={onClick}
      disabled={loading || disabled}
      className="
        group
        relative
        mt-6
        flex
        w-full
        items-center
        justify-center
        gap-2
        overflow-hidden
        rounded-2xl
        bg-[#D4AF37]
        px-6
        py-4
        font-semibold
        text-black
        transition-all
        duration-300
        hover:scale-[1.02]
        hover:bg-[#E5C158]
        hover:shadow-[0_0_30px_rgba(212,175,55,0.35)]
        active:scale-[0.98]
        disabled:cursor-not-allowed
        disabled:opacity-50
        disabled:hover:scale-100
        disabled:hover:shadow-none
      "
    >
      {loading ? (
        <>
          <Loader2 className="h-5 w-5 animate-spin" />
          Generating...
        </>
      ) : (
        <>
          Generate App
          <ArrowRight className="h-5 w-5 transition-transform duration-300 group-hover:translate-x-1" />
        </>
      )}
    </button>
  );
}