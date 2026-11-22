
"use client";

import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import Navbar from "@/components/layout/Navbar";

interface AppShellProps {
  children: ReactNode;
  title?: string;
  description?: string;
  /** Skip the background video (e.g. /chat renders its own video). */
  hideVideo?: boolean;
}

export default function AppShell({
  children,
  title,
  description,
  hideVideo = false,
}: AppShellProps) {
  const [reduceMotion, setReduceMotion] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    const mediaQuery = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    );

    const updatePreference = () => {
      setReduceMotion(mediaQuery.matches);
    };

    updatePreference();
    mediaQuery.addEventListener("change", updatePreference);

    return () => {
      mediaQuery.removeEventListener("change", updatePreference);
    };
  }, []);

  // Pause the background video while the tab is hidden — it decodes
  // forever otherwise, burning GPU/battery in background tabs.
  useEffect(() => {
    const onVisibility = () => {
      const video = videoRef.current;
      if (!video) return;
      if (document.hidden) video.pause();
      else video.play().catch(() => {});
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  return (
    <div className="relative isolate flex min-h-screen w-full flex-col overflow-x-clip bg-[#09090B] text-white">
      {/* Cinematic background */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-[#09090B]"
      >
        {!reduceMotion && !hideVideo && (
          <video
            ref={videoRef}
            autoPlay
            loop
            muted
            playsInline
            preload="metadata"
            className="absolute inset-0 h-full w-full object-cover"
          >
            <source src="/anvix-bg.mp4" type="video/mp4" />
          </video>
        )}

        {/* Contrast layer for readable content */}
        <div className="absolute inset-0 bg-black/45" />

        {/* Subtle gold atmosphere */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(212,175,55,0.08),transparent_55%)]" />
      </div>

      {/* Site navigation */}
      <Navbar />

      {/* Main page */}
      <main className="relative z-0 flex w-full flex-1 flex-col">
        {(title || description) && (
          <div className="sr-only">
            {title && <h1>{title}</h1>}
            {description && <p>{description}</p>}
          </div>
        )}

        {children}
      </main>
    </div>
  );
}