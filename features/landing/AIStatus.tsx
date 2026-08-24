export default function AIStatus() {
  const stats = [
    {
      label: "AI Models",
      value: "12+",
      description: "Ready to deploy",
      valueClass: "text-white",
    },
    {
      label: "Requests Today",
      value: "24.8K",
      description: "Processed successfully",
      valueClass: "text-[#D4AF37]",
    },
    {
      label: "System Uptime",
      value: "99.98%",
      description: "Last 30 days",
      valueClass: "text-emerald-400",
    },
  ];

  return (
    <section className="mx-auto mt-24 max-w-6xl px-6">
      <div className="relative overflow-hidden rounded-3xl border border-zinc-800/80 bg-[#111113] p-8 backdrop-blur-xl sm:p-10">
        {/* Ambient glow */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-[#D4AF37]/5 blur-[100px]"
        />

        <div
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-32 -left-24 h-64 w-64 rounded-full bg-emerald-500/5 blur-[100px]"
        />

        {/* HEADER */}
        <div className="relative mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <div className="relative flex h-8 w-8 items-center justify-center rounded-lg border border-emerald-500/20 bg-emerald-500/5">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
                <span className="absolute h-2.5 w-2.5 animate-ping rounded-full bg-emerald-400/40" />
              </div>

              <div>
                <p className="text-sm font-semibold text-white">
                  AI Engine
                </p>

                <p className="text-xs text-zinc-500">
                  Infrastructure & performance
                </p>
              </div>
            </div>
          </div>

          <div className="flex w-fit items-center gap-2 rounded-full border border-emerald-500/15 bg-emerald-500/5 px-3 py-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />

            <span className="text-[11px] font-medium text-emerald-400">
              All systems operational
            </span>
          </div>
        </div>

        {/* STATS */}
        <div className="relative grid gap-4 md:grid-cols-3">
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="group rounded-2xl border border-zinc-800/80 bg-black/20 p-6 transition-all duration-300 hover:-translate-y-1 hover:border-zinc-700 hover:bg-black/30"
            >
              <div className="flex items-start justify-between">
                <p className="text-xs font-medium uppercase tracking-[0.14em] text-zinc-500">
                  {stat.label}
                </p>

                <div className="h-1.5 w-1.5 rounded-full bg-zinc-700 transition-colors duration-300 group-hover:bg-[#D4AF37]" />
              </div>

              <p
                className={`mt-4 text-3xl font-semibold tracking-tight ${stat.valueClass}`}
              >
                {stat.value}
              </p>

              <p className="mt-2 text-xs text-zinc-600">
                {stat.description}
              </p>
            </div>
          ))}
        </div>

        {/* FOOTER */}
        <div className="relative mt-6 flex flex-col gap-3 border-t border-zinc-800/70 pt-5 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-zinc-600">
            AI infrastructure is monitored continuously.
          </p>

          <div className="flex items-center gap-2 text-xs text-zinc-500">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            Live monitoring
          </div>
        </div>
      </div>
    </section>
  );
}