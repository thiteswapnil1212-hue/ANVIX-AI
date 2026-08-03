"use client";

import { motion, AnimatePresence } from "framer-motion";
import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";

interface GenerationStatusProps {
  status: "idle" | "loading" | "success" | "error";
  message: string;
  detail?: string;
}

export default function GenerationStatus({ status, message, detail }: GenerationStatusProps) {
  return (
    <AnimatePresence mode="wait">
      {status !== "idle" ? (
        <motion.div
          key={status}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className={`mt-6 rounded-2xl border p-4 text-sm ${
            status === "error"
              ? "border-red-500/30 bg-red-500/10 text-red-200"
              : status === "success"
                ? "border-[#D4AF37]/20 bg-[#D4AF37]/10 text-[#F3D37C]"
                : "border-zinc-800 bg-[#111111] text-zinc-300"
          }`}
        >
          <div className="flex items-start gap-3">
            {status === "loading" ? (
              <Loader2 className="mt-0.5 h-4 w-4 animate-spin" />
            ) : status === "success" ? (
              <CheckCircle2 className="mt-0.5 h-4 w-4" />
            ) : (
              <AlertCircle className="mt-0.5 h-4 w-4" />
            )}
            <div>
              <p className="font-medium">{message}</p>
              {detail ? <p className="mt-1 text-xs opacity-90">{detail}</p> : null}
            </div>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
