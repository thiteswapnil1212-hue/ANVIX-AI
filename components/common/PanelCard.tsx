
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Sparkles } from "lucide-react";

interface PanelCardProps {
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
  action?: ReactNode;
}

export default function PanelCard({
  title,
  description,
  children,
  className,
  action,
}: PanelCardProps) {
  return (
    <section
      className={cn(
        "group relative overflow-hidden rounded-3xl border border-white/[0.08] bg-[#0D0D0F]/90 p-4 shadow-[0_12px_40px_rgba(0,0,0,0.2)] backdrop-blur-xl transition-all duration-300 hover:border-[#D4AF37]/20 sm:p-6",
        className
      )}
    >
      {/* Subtle top accent */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-[#D4AF37]/30 to-transparent opacity-70 transition-opacity duration-300 group-hover:opacity-100"
      />

      {/* Ambient glow */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-20 -top-24 h-48 w-48 rounded-full bg-[#D4AF37]/[0.035] blur-3xl transition-opacity duration-300 group-hover:bg-[#D4AF37]/[0.06]"
      />

      <div className="relative mb-5 flex items-start justify-between gap-4 sm:mb-6">
        <div className="min-w-0">
          <div className="flex items-center gap-2.5">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-[#D4AF37]/15 bg-[#D4AF37]/[0.07]">
              <Sparkles
                size={14}
                className="text-[#D4AF37]"
                aria-hidden="true"
              />
            </span>

            <h2 className="text-base font-semibold tracking-tight text-white sm:text-lg">
              {title}
            </h2>
          </div>

          {description ? (
            <p className="mt-2.5 max-w-2xl text-sm leading-6 text-zinc-400">
              {description}
            </p>
          ) : null}
        </div>

        {action ? (
          <div className="relative shrink-0 [&>button]:transition-all [&>button]:duration-200">
            {action}
          </div>
        ) : null}
      </div>

      <div className="relative min-w-0">
        {children}
      </div>
    </section>
  );
}