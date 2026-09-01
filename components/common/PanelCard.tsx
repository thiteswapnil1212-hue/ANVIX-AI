import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

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
        `
          rounded-3xl
          border
          border-white/[0.09]
          bg-white/[0.025]
          p-6
          shadow-[0_12px_40px_rgba(0,0,0,0.18)]
          backdrop-blur-sm
          transition-colors
          duration-200
          hover:border-white/[0.13]
        `,
        className
      )}
    >
      <div className="mb-5 flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h2 className="text-lg font-semibold text-white">
            {title}
          </h2>

          {description ? (
            <p className="mt-2 text-sm leading-6 text-zinc-400">
              {description}
            </p>
          ) : null}
        </div>

        {action ? (
          <div className="shrink-0">
            {action}
          </div>
        ) : null}
      </div>

      {children}
    </section>
  );
}