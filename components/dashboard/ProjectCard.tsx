
import Link from "next/link";
import {
  ArrowRight,
  Sparkles,
  Clock3,
} from "lucide-react";

interface ProjectCardProps {
  title: string;
  description: string;
  updatedAt: string;
  href: string;
  accent: string;
}

export default function ProjectCard({
  title,
  description,
  updatedAt,
  href,
  accent,
}: ProjectCardProps) {
  return (
    <article
      className="
        group relative isolate flex h-full flex-col
        overflow-hidden rounded-2xl
        border border-white/[0.08]
        bg-[#101012]
        p-5 sm:p-6
        transition-all duration-300 ease-out
        hover:-translate-y-1
        hover:border-[#D4AF37]/25
        hover:bg-[#121214]
        hover:shadow-[0_18px_50px_-24px_rgba(212,175,55,0.14)]
        motion-reduce:transform-none
        motion-reduce:transition-none
      "
    >
      {/* Ambient glow */}
      <div
        aria-hidden="true"
        className="
          pointer-events-none absolute -right-16 -top-20
          -z-10 h-40 w-40 rounded-full
          bg-[#D4AF37]/[0.07] blur-[70px]
          opacity-0 transition-opacity duration-500
          group-hover:opacity-100
        "
      />

      {/* Top accent */}
      <div
        aria-hidden="true"
        className="
          pointer-events-none absolute inset-x-8 top-0 h-px
          bg-gradient-to-r from-transparent
          via-[#D4AF37]/0 to-transparent
          transition-all duration-500
          group-hover:via-[#D4AF37]/50
        "
      />

      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <div
            className="
              flex h-11 w-11 shrink-0 items-center justify-center
              rounded-xl border border-[#D4AF37]/15
              bg-[#D4AF37]/[0.07] text-[#D4AF37]
              transition-all duration-300
              group-hover:border-[#D4AF37]/30
              group-hover:bg-[#D4AF37]/[0.12]
              group-hover:shadow-[0_0_24px_rgba(212,175,55,0.08)]
            "
          >
            <Sparkles
              className="h-[18px] w-[18px] transition-transform duration-300 group-hover:rotate-12"
              strokeWidth={1.7}
              aria-hidden="true"
            />
          </div>

          <div className="min-w-0">
            <h3
              className="
                truncate text-[15px] font-semibold
                tracking-tight text-zinc-100
                transition-colors duration-200
                group-hover:text-white
              "
              title={title}
            >
              {title}
            </h3>

            <div className="mt-1.5 flex min-w-0 items-center gap-1.5 text-xs text-zinc-500">
              <Clock3
                className="h-3 w-3 shrink-0"
                aria-hidden="true"
              />
              <span className="truncate">{updatedAt}</span>
            </div>
          </div>
        </div>

        <span
          className="
            max-w-[45%] shrink-0 truncate
            rounded-full border border-white/[0.08]
            bg-white/[0.03] px-2.5 py-1
            text-[10px] font-medium tracking-wide
            text-zinc-400
            transition-colors duration-300
            group-hover:border-[#D4AF37]/20
            group-hover:text-[#D4AF37]
            sm:text-[11px]
          "
          title={accent}
        >
          {accent}
        </span>
      </div>

      {/* Description */}
      <p
        className="
          mt-5 line-clamp-2 min-h-10
          text-[13px] leading-5
          text-zinc-400
          transition-colors duration-300
          group-hover:text-zinc-300
        "
      >
        {description}
      </p>

      {/* Footer */}
      <div className="mt-auto pt-6">
        <div
          aria-hidden="true"
          className="
            mb-4 h-px w-full
            bg-gradient-to-r from-white/[0.08]
            via-white/[0.04] to-transparent
          "
        />

        <Link
          href={href}
          className="
            inline-flex min-h-10 w-full items-center
            justify-between gap-3 rounded-xl
            border border-white/[0.07]
            bg-white/[0.025] px-3.5 py-2.5
            text-sm font-medium text-zinc-300
            transition-all duration-300
            hover:border-[#D4AF37]/25
            hover:bg-[#D4AF37]/[0.06]
            hover:text-[#D4AF37]
            focus-visible:outline-none
            focus-visible:ring-2
            focus-visible:ring-[#D4AF37]/60
            focus-visible:ring-offset-2
            focus-visible:ring-offset-[#101012]
            motion-reduce:transition-none
          "
        >
          <span>Open workspace</span>

          <span
            className="
              flex h-7 w-7 items-center justify-center
              rounded-lg border border-white/[0.07]
              bg-white/[0.03]
              transition-all duration-300
              group-hover:translate-x-0.5
              group-hover:border-[#D4AF37]/20
              group-hover:bg-[#D4AF37]/[0.08]
            "
          >
            <ArrowRight
              className="h-4 w-4"
              aria-hidden="true"
            />
          </span>
        </Link>
      </div>

      {/* Bottom accent */}
      <div
        aria-hidden="true"
        className="
          pointer-events-none absolute bottom-0 left-6
          h-px w-0 bg-[#D4AF37]/60
          transition-all duration-500
          group-hover:w-20
        "
      />
    </article>
  );
}