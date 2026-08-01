export default function AIStatus() {
  return (
    <section className="mx-auto mt-24 max-w-6xl px-6">
      <div className="rounded-3xl border border-zinc-800 bg-zinc-900/50 p-8 backdrop-blur">

        <div className="mb-6 flex items-center gap-3">
          <div className="h-3 w-3 rounded-full bg-green-500 animate-pulse" />

          <span className="text-sm text-zinc-400">
            AI Engine Status
          </span>
        </div>

        <div className="grid gap-6 md:grid-cols-3">

          <div className="rounded-2xl border border-zinc-800 bg-black/30 p-6">
            <h3 className="text-zinc-400 text-sm">
              Models
            </h3>

            <p className="mt-3 text-3xl font-bold text-white">
              12+
            </p>
          </div>

          <div className="rounded-2xl border border-zinc-800 bg-black/30 p-6">
            <h3 className="text-zinc-400 text-sm">
              Requests Today
            </h3>

            <p className="mt-3 text-3xl font-bold text-[#D4AF37]">
              24.8K
            </p>
          </div>

          <div className="rounded-2xl border border-zinc-800 bg-black/30 p-6">
            <h3 className="text-zinc-400 text-sm">
              Uptime
            </h3>

            <p className="mt-3 text-3xl font-bold text-green-400">
              99.98%
            </p>
          </div>

        </div>
      </div>
    </section>
  );
}