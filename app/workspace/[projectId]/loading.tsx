/**
 * Workspace loading shell (perf §4): same background colour + pulsing
 * placeholders for the file sidebar and the preview pane. Minimal —
 * no client-heavy imports.
 */
export default function Loading() {
  return (
    <div className="flex min-h-screen bg-[#090909]">
      <div className="hidden w-64 shrink-0 flex-col gap-3 border-r border-white/10 p-4 md:flex">
        <div className="h-4 w-3/4 animate-pulse rounded-full bg-white/10" />
        <div className="h-4 w-1/2 animate-pulse rounded-full bg-white/10" />
        <div className="h-4 w-2/3 animate-pulse rounded-full bg-white/10" />
      </div>
      <div className="flex-1 p-4">
        <div className="h-full min-h-[70vh] animate-pulse rounded-2xl bg-white/10" />
      </div>
    </div>
  );
}
