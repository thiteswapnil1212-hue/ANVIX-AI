
"use client";

import { motion, AnimatePresence } from "framer-motion";
import {
  AlertCircle,
  CheckCircle2,
  Loader2,
} from "lucide-react";

interface GenerationStatusProps {
  status: "idle" | "loading" | "success" | "error";
  message: string;
  detail?: string;
}

const statusStyles = {
  loading: {
    container: "border-zinc-800 bg-[#111111]",
    icon: "text-[#D4AF37]",
    title: "text-zinc-100",
    detail: "text-zinc-400",
  },
  success: {
    container: "border-emerald-500/20 bg-emerald-500/5",
    icon: "text-emerald-400",
    title: "text-emerald-300",
    detail: "text-emerald-200/70",
  },
  error: {
    container: "border-red-500/20 bg-red-500/5",
    icon: "text-red-400",
    title: "text-red-300",
    detail: "text-red-200/70",
  },
};

export default function GenerationStatus({
  status,
  message,
  detail,
}: GenerationStatusProps) {
  const styles = status === "idle" ? null : statusStyles[status];

  const Icon =
    status === "loading"
      ? Loader2
      : status === "success"
        ? CheckCircle2
        : AlertCircle;

  return (
    <AnimatePresence mode="wait">
      {status !== "idle" && styles && (
        <motion.div
          key={status}
          role={status === "error" ? "alert" : "status"}
          aria-live={status === "error" ? "assertive" : "polite"}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className={`mt-5 rounded-2xl border px-4 py-3.5 ${styles.container}`}
        >
          <div className="flex items-start gap-3">
            <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-black/20">
              <Icon
                size={17}
                className={`${styles.icon} ${
                  status === "loading" ? "animate-spin" : ""
                }`}
                aria-hidden="true"
              />
            </div>

            <div className="min-w-0 flex-1 pt-0.5">
              <p className={`text-sm font-medium ${styles.title}`}>
                {message}
              </p>

              {detail && (
                <p className={`mt-1 text-xs leading-5 ${styles.detail}`}>
                  {detail}
                </p>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}