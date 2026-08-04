"use client";

export default function ChatInput() {
  return (
    <div className="mx-auto w-full max-w-3xl p-4">
      <textarea
        rows={1}
        placeholder="Message ANVIX AI..."
        className="w-full resize-none rounded-2xl border border-zinc-700 bg-[#111111] px-4 py-3 text-white outline-none focus:border-zinc-500"
      />
    </div>
  );
}