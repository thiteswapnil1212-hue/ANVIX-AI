
const stats = [
  {
    label: "AI Models",
    value: "12+",
    description: "Models listed in the demo",
    icon: "✳",
    accent: "gold",
    valueClass: "text-white",
  },
  {
    label: "Requests Today",
    value: "24.8K",
    description: "Illustrative daily request volume",
    icon: "↗",
    accent: "gold",
    valueClass: "text-[#D4AF37]",
  },
  {
    label: "System Uptime",
    value: "99.98%",
    description: "Illustrative 30-day uptime",
    icon: "✓",
    accent: "green",
    valueClass: "text-emerald-400",
  },
] as const;

function MetricIcon({ icon }: { icon: string }) {
  return (
    <span
      aria-hidden="true"
      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/[0.07] bg-white/[0.03] text-base text-zinc-400 transition-colors duration-300 group-hover:border-[#D4AF37]/20 group-hover:text-[#D4AF37]"
    >
      {icon}
    </span>
  );
}

export default function AIStatus() {
  return (
    <section
      aria-labelledby="ai-status-heading"
      className="mx-auto mt-16 w-full max-w-6xl px-4 sm:mt-24 sm:px-6"
    >
      <div className="relative isolate overflow-hidden rounded-3xl border border-white/[0.08] bg-[#101012] p-5 shadow-[0_20px_80px_-35px_rgba(0,0,0,0.8)] sm:p-8 lg:p-10">
        {/* Background atmosphere */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-24 -top-28 -z-10 h-72 w-72 rounded-full bg-[#D4AF37]/[0.07] blur-[100px]"
        />

        <div
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-32 -left-20 -z-10 h-72 w-72 rounded-full bg-emerald-500/[0.05] blur-[100px]"
        />

        {/* Header */}
        <div className="mb-8 flex flex-col gap-5 sm:mb-10 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-3.5">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-[#D4AF37]/20 bg-[#D4AF37]/[0.07]">
              <span
                aria-hidden="true"
                className="text-xl text-[#D4AF37]"
              >
                ✳
              </span>
            </div>

            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-500">
                ANVIX <span className="text-zinc-700">/</span> SYSTEM
              </p>

              <h2
                id="ai-status-heading"
                className="mt-1 text-lg font-semibold tracking-tight text-white sm:text-xl"
              >
                AI Engine
              </h2>

              <p className="mt-1 text-xs text-zinc-500">
                Infrastructure overview
              </p>
            </div>
          </div>

          {/* Demo status: not a live health check */}
          <div className="flex w-fit items-center gap-2 rounded-full border border-zinc-700/70 bg-white/[0.025] px-3.5 py-2">
            <span
              aria-hidden="true"
              className="h-1.5 w-1.5 rounded-full bg-[#D4AF37]"
            />

            <span className="text-xs font-medium text-zinc-300">
              Demo overview
            </span>
          </div>
        </div>

        {/* Metric cards */}
        <div className="grid gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3">
          {stats.map((stat) => (
            <article
              key={stat.label}
              className="group relative isolate overflow-hidden rounded-2xl border border-white/[0.07] bg-white/[0.02] p-5 transition-[transform,border-color,background-color] duration-300 hover:-translate-y-1 hover:border-[#D4AF37]/25 hover:bg-white/[0.035] motion-reduce:transform-none motion-reduce:transition-none sm:p-6"
            >
              {/* Card glow */}
              <div
                aria-hidden="true"
                className={`pointer-events-none absolute inset-x-0 top-0 -z-10 h-28 opacity-60 ${
                  stat.accent === "green"
                    ? "bg-gradient-to-b from-emerald-400/[0.08] to-transparent"
                    : "bg-gradient-to-b from-[#D4AF37]/[0.08] to-transparent"
                }`}
              />

              <div className="flex items-center justify-between gap-3">
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-500 sm:text-[11px]">
                  {stat.label}
                </p>

                <MetricIcon icon={stat.icon} />
              </div>

              <p
                className={`mt-6 break-words text-3xl font-semibold tracking-[-0.045em] sm:text-4xl ${stat.valueClass}`}
              >
                {stat.value}
              </p>

              <p className="mt-2 min-h-8 text-xs leading-relaxed text-zinc-500">
                {stat.description}
              </p>

              {/* Decorative progress accent */}
              <div
                aria-hidden="true"
                className="mt-6 h-px w-full overflow-hidden bg-white/[0.06]"
              >
                <div className="h-full w-1/3 bg-gradient-to-r from-[#D4AF37]/0 via-[#D4AF37]/60 to-[#D4AF37]/0 transition-all duration-500 group-hover:w-full motion-reduce:transition-none" />
              </div>
            </article>
          ))}
        </div>

        {/* Footer */}
        <div className="mt-6 flex flex-col gap-3 border-t border-white/[0.07] pt-5 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs leading-relaxed text-zinc-500">
            Illustrative metrics for the ANVIX AI interface.
          </p>

          <div className="flex w-fit items-center gap-2 rounded-lg border border-white/[0.06] bg-white/[0.02] px-2.5 py-1.5 text-[10px] text-zinc-500">
            <span
              aria-hidden="true"
              className="h-1.5 w-1.5 rounded-full bg-zinc-600"
            />
            Static demo data
          </div>
        </div>
      </div>
    </section>
  );
}