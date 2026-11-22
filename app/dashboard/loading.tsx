/**
 * Dashboard loading shell (perf §4): same background colour + pulsing
 * card placeholders. Minimal — no client-heavy imports.
 */
export default function Loading() {
  return (
    <div className="min-h-screen bg-[#090909] px-4 py-8">
      <div className="mx-auto max-w-5xl">
        <div className="mb-8 h-6 w-56 animate-pulse rounded-full bg-white/10" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="h-36 animate-pulse rounded-2xl bg-white/10" />
          <div className="h-36 animate-pulse rounded-2xl bg-white/10" />
          <div className="h-36 animate-pulse rounded-2xl bg-white/10" />
        </div>
      </div>
    </div>
  );
}
