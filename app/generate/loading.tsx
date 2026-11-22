/**
 * Generate loading shell (perf §4): same background colour + a
 * pulsing placeholder for the prompt box. Minimal — no client-heavy
 * imports.
 */
export default function Loading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#090909] px-4">
      <div className="w-full max-w-2xl">
        <div className="mx-auto mb-6 h-4 w-48 animate-pulse rounded-full bg-white/10" />
        <div className="h-32 animate-pulse rounded-3xl bg-white/10" />
      </div>
    </div>
  );
}
