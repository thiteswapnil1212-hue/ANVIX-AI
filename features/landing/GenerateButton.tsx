"use client";

import { ArrowRight } from "lucide-react";

interface GenerateButtonProps {
  onClick: () => void;
  disabled?: boolean;
}

export default function GenerateButton({
  onClick,
  disabled,
}: GenerateButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="
        mt-6
        flex
        w-full
        items-center
        justify-center
        gap-2
        rounded-2xl
        bg-[#D4AF37]
        px-6
        py-4
        font-semibold
        text-black
        transition
        hover:scale-[1.02]
        hover:bg-[#E5C158]
        disabled:cursor-not-allowed
        disabled:opacity-50
      "
    >
      Generate App
      <ArrowRight className="h-5 w-5" />
    </button>
  );
}