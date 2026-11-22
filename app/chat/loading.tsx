/**
 * Chat loading shell (perf §4): same background colour + pulsing
 * placeholders for the message area and the input bar. Minimal — no
 * client-heavy imports.
 */
export default function Loading() {
  return (
    <div className="flex min-h-screen flex-col bg-[#090909]">
      <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center gap-6 px-4 py-8">
        <div className="h-4 w-3/4 animate-pulse rounded-full bg-white/10" />
        <div className="ml-auto h-4 w-1/2 animate-pulse rounded-full bg-white/10" />
        <div className="h-4 w-2/3 animate-pulse rounded-full bg-white/10" />
      </div>
      <div className="mx-auto w-full max-w-3xl px-4 pb-6">
        <div className="h-12 animate-pulse rounded-full bg-white/10" />
      </div>
    </div>
  );
}
