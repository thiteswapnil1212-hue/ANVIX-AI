import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";

interface ProjectCardProps {
  title: string;
  description: string;
  updatedAt: string;
  href: string;
  accent: string;
}

export default function ProjectCard({ title, description, updatedAt, href, accent }: ProjectCardProps) {
  return (
    <article className="group rounded-3xl border border-zinc-800/80 bg-[#0D0D0D] p-5 transition hover:border-[#D4AF37]/30 hover:bg-[#111111]">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#D4AF37]/10 text-[#D4AF37]">
            <Sparkles className="h-4 w-4" />
          </div>
          <div>
            <h3 className="font-semibold text-white">{title}</h3>
            <p className="mt-1 text-sm text-zinc-500">{updatedAt}</p>
          </div>
        </div>
        <span className="rounded-full border border-zinc-800 px-3 py-1 text-xs text-zinc-400">{accent}</span>
      </div>

      <p className="mt-4 text-sm leading-6 text-zinc-400">{description}</p>

      <Link href={href} className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-[#D4AF37] transition group-hover:translate-x-1">
        Open workspace
        <ArrowRight className="h-4 w-4" />
      </Link>
    </article>
  );
}
