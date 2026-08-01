"use client";

export default function BackgroundGlow() {
  return (
    <>
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">

        <div className="absolute left-1/2 top-[-250px] h-[600px] w-[600px] -translate-x-1/2 rounded-full bg-[#D4AF37]/10 blur-[180px]" />

        <div className="absolute bottom-[-250px] right-[-150px] h-[500px] w-[500px] rounded-full bg-yellow-500/5 blur-[180px]" />

        <div className="absolute left-[-150px] top-1/2 h-[450px] w-[450px] -translate-y-1/2 rounded-full bg-white/5 blur-[180px]" />

      </div>
    </>
  );
}