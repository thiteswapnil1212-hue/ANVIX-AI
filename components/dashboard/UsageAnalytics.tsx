import {
  Activity,
  ArrowUpRight,
  BarChart3,
  FolderKanban,
  Sparkles,
  Zap,
} from "lucide-react";

const metrics = [
  {
    label: "AI Generations",
    value: "1,284",
    change: "+12.4%",
    icon: Sparkles,
    description: "vs. last month",
    progress: 72,
  },
  {
    label: "Tokens Used",
    value: "842K",
    change: "+8.2%",
    icon: Zap,
    description: "of 1M monthly limit",
    progress: 84,
  },
  {
    label: "API Requests",
    value: "8,492",
    change: "+18.7%",
    icon: Activity,
    description: "vs. last month",
    progress: 68,
  },
  {
    label: "Projects",
    value: "24",
    change: "+4.1%",
    icon: FolderKanban,
    description: "active workspaces",
    progress: 48,
  },
];

export default function UsageAnalytics() {
  return (
    <section
      className="
        relative
        overflow-hidden
        rounded-3xl
        border border-zinc-800
        bg-[#111111]
        p-6

        shadow-[0_12px_40px_rgba(0,0,0,0.18)]
      "
    >
      {/* Background glow */}

      <div
        className="
          pointer-events-none
          absolute
          -right-24
          -top-24
          h-64
          w-64
          rounded-full
          bg-[#D4AF37]/[0.04]
          blur-3xl
        "
      />

      <div
        className="
          pointer-events-none
          absolute
          -bottom-32
          -left-20
          h-56
          w-56
          rounded-full
          bg-[#D4AF37]/[0.025]
          blur-3xl
        "
      />

      {/* Header */}

      <div className="relative z-10 mb-6 flex items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <BarChart3
              className="h-4 w-4 text-[#D4AF37]"
              strokeWidth={1.8}
            />

            <h2 className="text-xl font-semibold tracking-tight text-white">
              Usage Analytics
            </h2>
          </div>

          <p className="mt-1 text-sm text-zinc-500">
            Your AI workspace activity.
          </p>
        </div>

        <div
          className="
            hidden
            rounded-full
            border
            border-zinc-800
            bg-zinc-900/60
            px-3
            py-1.5
            text-[11px]
            font-medium
            text-zinc-500
            sm:block
          "
        >
          This month
        </div>
      </div>

      {/* Metrics */}

      <div className="relative z-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {metrics.map((metric) => {
          const Icon = metric.icon;

          return (
            <div
              key={metric.label}
              className="
                group
                relative
                overflow-hidden
                rounded-2xl
                border
                border-zinc-800
                bg-[#0D0D0D]
                p-5

                transition-all
                duration-300
                ease-out

                hover:-translate-y-1
                hover:border-[#D4AF37]/20
                hover:bg-[#101010]
                hover:shadow-[0_14px_35px_rgba(0,0,0,0.28)]
              "
            >
              {/* Card top shine */}

              <div
                className="
                  pointer-events-none
                  absolute
                  inset-x-6
                  top-0
                  h-px
                  bg-gradient-to-r
                  from-transparent
                  via-[#D4AF37]/0
                  to-transparent
                  transition-all
                  duration-500
                  group-hover:via-[#D4AF37]/30
                "
              />

              {/* Icon + trend */}

              <div className="flex items-start justify-between">
                <div
                  className="
                    flex
                    h-10
                    w-10
                    items-center
                    justify-center
                    rounded-xl
                    border
                    border-[#D4AF37]/10
                    bg-[#D4AF37]/[0.08]
                    text-[#D4AF37]

                    transition-all
                    duration-300

                    group-hover:scale-105
                    group-hover:border-[#D4AF37]/20
                    group-hover:bg-[#D4AF37]/[0.12]
                    group-hover:shadow-[0_0_20px_rgba(212,175,55,0.08)]
                  "
                >
                  <Icon
                    className="
                      h-4
                      w-4

                      transition-transform
                      duration-300

                      group-hover:scale-110
                    "
                    strokeWidth={1.8}
                  />
                </div>

                <div
                  className="
                    flex
                    items-center
                    gap-0.5
                    rounded-full
                    border
                    border-emerald-500/10
                    bg-emerald-500/[0.04]
                    px-2
                    py-1
                    text-[10px]
                    font-medium
                    text-emerald-400
                  "
                >
                  <ArrowUpRight
                    className="h-3 w-3"
                    strokeWidth={1.8}
                  />

                  {metric.change}
                </div>
              </div>

              {/* Label */}

              <p className="mt-5 text-sm font-medium text-zinc-500">
                {metric.label}
              </p>

              {/* Value */}

              <p
                className="
                  mt-2
                  text-3xl
                  font-semibold
                  tracking-tight
                  text-white
                "
              >
                {metric.value}
              </p>

              {/* Description */}

              <p className="mt-1 text-[11px] text-zinc-600">
                {metric.description}
              </p>

              {/* Progress */}

              <div className="mt-5">
                <div className="mb-1.5 flex items-center justify-between">
                  <span className="text-[10px] uppercase tracking-[0.08em] text-zinc-700">
                    Activity
                  </span>

                  <span className="text-[10px] text-zinc-600">
                    {metric.progress}%
                  </span>
                </div>

                <div className="h-1 overflow-hidden rounded-full bg-zinc-800">
                  <div
                    className="
                      h-full
                      rounded-full
                      bg-[#D4AF37]/70

                      transition-all
                      duration-700
                      ease-out

                      group-hover:bg-[#D4AF37]
                    "
                    style={{
                      width: `${metric.progress}%`,
                    }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}