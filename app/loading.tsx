/**
 * Global loading shell (perf §4): shown while a route segment loads.
 * Minimal by design — same background colour + a pulsing placeholder.
 * It must not import any client-heavy component, or it becomes part
 * of the problem it is meant to hide.
 */
export default function Loading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#090909]">
      <div className="flex flex-col items-center gap-4">
        <div className="h-3 w-3 animate-pulse rounded-full bg-white/60" />
        <div className="h-3 w-40 animate-pulse rounded-full bg-white/10" />
      </div>
    </div>
  );
}
