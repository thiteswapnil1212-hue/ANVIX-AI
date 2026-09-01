"use client";

export default function BackgroundGlow() {
  return (
    <div
      className="
        pointer-events-none
        fixed
        inset-0
        -z-10
        overflow-hidden
      "
      aria-hidden="true"
    >
      {/* Subtle top ambient light */}
      <div
        className="
          absolute
          left-1/2
          top-[-320px]
          h-[520px]
          w-[520px]
          -translate-x-1/2
          rounded-full
          bg-[#D4AF37]/[0.045]
          blur-[150px]
        "
      />

      {/* Very soft bottom light */}
      <div
        className="
          absolute
          bottom-[-300px]
          right-[-220px]
          h-[480px]
          w-[480px]
          rounded-full
          bg-[#D4AF37]/[0.025]
          blur-[160px]
        "
      />

      {/* Soft neutral side light */}
      <div
        className="
          absolute
          left-[-220px]
          top-1/2
          h-[420px]
          w-[420px]
          -translate-y-1/2
          rounded-full
          bg-white/[0.018]
          blur-[160px]
        "
      />
    </div>
  );
}