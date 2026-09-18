const stats = [
  {
    label: "AI Models",
    value: "12+",
    description: "Available in the AI engine",
    accent: "from-[#D4AF37]/20",
    valueClass: "text-white",
    icon: "✳",
  },
  {
    label: "Requests Today",
    value: "24.8K",
    description: "Daily request volume",
    accent: "from-[#D4AF37]/20",
    valueClass: "text-[#D4AF37]",
    icon: "↗",
  },
  {
    label: "System Uptime",
    value: "99.98%",
    description: "Reported over 30 days",
    accent: "from-emerald-400/15",
    valueClass: "text-emerald-400",
    icon: "✓",
  },
];

export default function AIStatus() {
  return (
    <section
      aria-labelledby="ai-status-heading"
      className="mx-auto mt-20 w-full max-w-6xl px-4 sm:mt-24 sm:px-6"
    >
      <div className="relative isolate overflow-hidden rounded-3xl border border-white/[0.08] bg-[#101012] p-5 shadow-[0_20px_80px_-35px_rgba(0,0,0,0.8)] sm:p-8 lg:p-10">
        {/* Ambient background */}
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
          <div className="flex items-center gap-3.5">
            <div className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-[#D4AF37]/20 bg-[#D4AF37]/[0.07]">
              <span className="text-xl text-[#D4AF37]">✳</span>
            </div>

            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-500">
                ANVIX / SYSTEM
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

          <div className="flex w-fit items-center gap-2.5 rounded-full border border-emerald-400/15 bg-emerald-400/[0.06] px-3.5 py-2">
            <span
              aria-hidden="true"
              className="relative flex h-2 w-2"
            >
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400/50 motion-reduce:animate-none" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
            </span>

            <span className="text-xs font-medium text-emerald-300">
              System overview
            </span>
          </div>
        </div>

        {/* Stats */}
        <div className="grid gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3">
          {stats.map((stat, index) => (
            <div
              key={stat.label}
              className="group relative overflow-hidden rounded-2xl border border-white/[0.07] bg-white/[0.02] p-5 transition-all duration-300 hover:-translate-y-1 hover:border-[#D4AF37]/25 hover:bg-white/[0.035] motion-reduce:transform-none motion-reduce:transition-none sm:p-6"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              {/* Card glow */}
              <div
                aria-hidden="true"
                className={`pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b ${stat.accent} to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100`}
              />

              <div className="relative flex items-center justify-between gap-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-500">
                  {stat.label}
                </p>

                <span className="flex h-8 w-8 items-center justify-center rounded-xl border border-white/[0.07] bg-white/[0.03] text-sm text-zinc-400 transition-colors duration-300 group-hover:border-[#D4AF37]/20 group-hover:text-[#D4AF37]">
                  {stat.icon}
                </span>
              </div>

              <p
                className={`relative mt-6 text-3xl font-semibold tracking-[-0.04em] sm:text-4xl ${stat.valueClass}`}
              >
                {stat.value}
              </p>

              <p className="relative mt-2 text-xs leading-relaxed text-zinc-500">
                {stat.description}
              </p>

              <div
                aria-hidden="true"
                className="relative mt-6 h-px w-full bg-white/[0.06]"
              >
                <div className="h-px w-0 bg-[#D4AF37]/60 transition-all duration-500 group-hover:w-full" />
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="mt-6 flex flex-col gap-3 border-t border-white/[0.07] pt-5 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs leading-relaxed text-zinc-500">
            Performance metrics for the ANVIX AI engine.
          </p>

          <div className="flex items-center gap-2 text-xs text-zinc-600">
            <span className="h-1 w-1 rounded-full bg-zinc-500" />
            <span>Static dashboard metrics</span>
          </div>
        </div>
      </div>
    </section>
  );
}