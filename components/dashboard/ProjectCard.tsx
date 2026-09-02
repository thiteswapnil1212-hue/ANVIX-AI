import Link from "next/link";
import {
  ArrowRight,
  Sparkles,
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
        group
        relative
        overflow-hidden
        rounded-3xl

        border
        border-zinc-800/80

        bg-[#0D0D0D]

        p-5

        transition-all
        duration-300
        ease-out

        hover:-translate-y-1
        hover:border-[#D4AF37]/25
        hover:bg-[#101010]
        hover:shadow-[0_16px_40px_rgba(0,0,0,0.32)]
      "
    >
      {/* --------------------------------
          SUBTLE TOP GLOW
      -------------------------------- */}

      <div
        className="
          pointer-events-none
          absolute
          inset-x-8
          top-0
          h-px

          bg-gradient-to-r
          from-transparent
          via-[#D4AF37]/0
          to-transparent

          transition-all
          duration-500

          group-hover:via-[#D4AF37]/40
        "
      />

      {/* --------------------------------
          CONTENT
      -------------------------------- */}

      <div className="relative z-10">
        {/* HEADER */}

        <div className="flex items-start justify-between gap-4">
          {/* PROJECT INFO */}

          <div className="flex min-w-0 items-center gap-3">
            {/* ICON */}

            <div
              className="
                flex
                h-10
                w-10
                shrink-0
                items-center
                justify-center

                rounded-2xl

                border
                border-[#D4AF37]/10

                bg-[#D4AF37]/10
                text-[#D4AF37]

                transition-all
                duration-300

                group-hover:scale-105
                group-hover:border-[#D4AF37]/20
                group-hover:bg-[#D4AF37]/15
                group-hover:shadow-[0_0_20px_rgba(212,175,55,0.10)]
              "
            >
              <Sparkles
                className="
                  h-4
                  w-4

                  transition-transform
                  duration-300

                  group-hover:rotate-6
                "
                strokeWidth={1.8}
              />
            </div>

            {/* TITLE */}

            <div className="min-w-0">
              <h3
                className="
                  truncate
                  font-semibold
                  text-white
                  transition-colors
                  duration-200
                  group-hover:text-zinc-50
                "
              >
                {title}
              </h3>

              <p className="mt-1 text-sm text-zinc-500">
                {updatedAt}
              </p>
            </div>
          </div>

          {/* ACCENT */}

          <span
            className="
              shrink-0
              rounded-full

              border
              border-zinc-800

              bg-zinc-900/50

              px-3
              py-1

              text-xs
              font-medium
              text-zinc-400

              transition-all
              duration-300

              group-hover:border-[#D4AF37]/20
              group-hover:text-[#D4AF37]
            "
          >
            {accent}
          </span>
        </div>

        {/* DESCRIPTION */}

        <p
          className="
            mt-4

            text-sm
            leading-6
            text-zinc-400

            transition-colors
            duration-300

            group-hover:text-zinc-300
          "
        >
          {description}
        </p>

        {/* CTA */}

        <Link
          href={href}
          className="
            mt-5
            inline-flex
            items-center
            gap-2

            text-sm
            font-semibold
            text-[#D4AF37]

            transition-all
            duration-300

            hover:text-[#E0BB4C]
            focus:outline-none
            focus-visible:ring-2
            focus-visible:ring-[#D4AF37]/40
            focus-visible:ring-offset-2
            focus-visible:ring-offset-[#0D0D0D]
          "
        >
          <span>Open workspace</span>

          <ArrowRight
            className="
              h-4
              w-4

              transition-transform
              duration-300

              group-hover:translate-x-1
            "
          />
        </Link>
      </div>

      {/* --------------------------------
          BOTTOM ACCENT
      -------------------------------- */}

      <div
        className="
          pointer-events-none
          absolute
          bottom-0
          left-5
          h-px
          w-0

          bg-[#D4AF37]/50

          transition-all
          duration-500

          group-hover:w-16
        "
      />
    </article>
  );
}