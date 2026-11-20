
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
        group relative isolate flex h-full min-w-0 flex-col
        overflow-hidden rounded-2xl
        border border-border
        bg-surface-1
        p-5 sm:p-6
        transition-[transform,border-color,background-color,box-shadow]
        duration-300 ease-out
        hover:-translate-y-1
        hover:border-white/15
        hover:shadow-[0_18px_50px_-24px_rgba(0,0,0,0.6)]
        motion-reduce:transform-none
        motion-reduce:transition-none
      "
    >
      {/* Header */}
      <div className="flex min-w-0 items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <div
            aria-hidden="true"
            className="
              flex h-11 w-11 shrink-0 items-center justify-center
              rounded-xl border border-border
              bg-surface-2 text-ink-muted
              transition-[border-color,background-color]
              duration-300
              group-hover:border-white/15
              group-hover:bg-surface-3
              motion-reduce:transition-none
            "
          >
            <Sparkles
              className="
                h-[18px] w-[18px]
                transition-transform duration-300
                group-hover:rotate-12
                motion-reduce:transition-none
              "
              strokeWidth={1.7}
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
              <time className="truncate" title={updatedAt}>
                {updatedAt}
              </time>
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
            group-hover:border-white/15
            group-hover:text-ink
            sm:text-[11px]
            motion-reduce:transition-none
          "
          title={accent}
        >
          {accent}
        </span>
      </div>

      {/* Description */}
      <p
        className="
          mt-5 line-clamp-3 min-h-[3.75rem]
          text-[13px] leading-5
          text-zinc-400
          transition-colors duration-300
          group-hover:text-zinc-300
          motion-reduce:transition-none
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
          aria-label={`Open workspace: ${title}`}
          className="
            inline-flex min-h-11 w-full items-center
            justify-between gap-3 rounded-xl
            border border-white/[0.07]
            bg-white/[0.025] px-3.5 py-2.5
            text-sm font-medium text-zinc-300
            transition-[border-color,background-color,color]
            duration-200
            hover:border-white/15
            hover:bg-white/[0.04]
            hover:text-white
            focus-visible:outline-none
            focus-visible:ring-2
            focus-visible:ring-action
            focus-visible:ring-offset-2
            focus-visible:ring-offset-surface-1
            motion-reduce:transition-none
          "
        >
          <span>Open workspace</span>

          <span
            aria-hidden="true"
            className="
              flex h-7 w-7 shrink-0 items-center justify-center
              rounded-lg border border-white/[0.07]
              bg-white/[0.03]
              transition-[transform,border-color,background-color]
              duration-200
              group-hover:translate-x-0.5
              group-hover:border-white/15
              group-hover:bg-white/[0.04]
              motion-reduce:transition-none
            "
          >
            <ArrowRight className="h-4 w-4" />
          </span>
        </Link>
      </div>
    </article>
  );
}