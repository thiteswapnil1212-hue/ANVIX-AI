const metrics = [
  { label: "AI Generations", value: "1,284", change: "+12.4%" },
  { label: "Tokens Used", value: "842K", change: "+8.2%" },
  { label: "API Requests", value: "8,492", change: "+18.7%" },
  { label: "Projects", value: "24", change: "+4.1%" },
];

export default function UsageAnalytics() {
  return (
    <section className="rounded-3xl border border-zinc-800 bg-[#111111] p-6">
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-white">
          Usage Analytics
        </h2>
        <p className="mt-1 text-sm text-zinc-500">
          your AI workspace activity.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {metrics.map((metric) => (
          <div
            key={metric.label}
            className="rounded-2xl border border-zinc-800 bg-[#0D0D0D] p-5"
          >
            <p className="text-sm text-zinc-500">{metric.label}</p>
            <p className="mt-3 text-2xl font-semibold text-white">
              {metric.value}
            </p>
            <p className="mt-2 text-xs text-emerald-400">
              {metric.change} this month
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}