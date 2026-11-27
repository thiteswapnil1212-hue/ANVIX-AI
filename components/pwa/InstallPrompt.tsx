"use client";

import { useEffect, useState } from "react";
import { Download } from "lucide-react";

/**
 * "Install ANVIX" button, shown only when the browser offers installation.
 *
 * The `beforeinstallprompt` event fires only on installable browsers that
 * have not installed the app yet (Chrome/Edge on desktop + Android; iOS
 * Safari never fires it — on iOS the user installs via Share → Add to
 * Home Screen, which this component says in its hint). When the event
 * never fires, the button simply never appears — no fake install button.
 *
 * `quiet` is for surfaces like the home page: when the browser is not
 * offering installation (yet), render nothing instead of the hint
 * paragraph, so the page stays clean until the button can actually
 * appear.
 */
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export default function InstallPrompt({ quiet = false }: { quiet?: boolean }) {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia("(display-mode: standalone)").matches
  );
  const [installing, setInstalling] = useState(false);

  useEffect(() => {
    if (installed) return;
    const onBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
    };
    const onAppInstalled = () => {
      setInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    window.addEventListener("appinstalled", onAppInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
      window.removeEventListener("appinstalled", onAppInstalled);
    };
  }, [installed]);

  if (installed) {
    if (quiet) return null;
    return (
      <p className="text-xs leading-5 text-zinc-500">
        ANVIX is installed on this device.
      </p>
    );
  }

  if (!deferredPrompt) {
    if (quiet) return null;
    return (
      <p className="text-xs leading-5 text-zinc-500">
        Your browser will offer installation when ANVIX is installable here.
        On iPhone/iPad, use Share → Add to Home Screen instead.
      </p>
    );
  }

  const install = async () => {
    setInstalling(true);
    try {
      await deferredPrompt.prompt();
      await deferredPrompt.userChoice;
    } finally {
      setDeferredPrompt(null);
      setInstalling(false);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-3">
      <button
        type="button"
        onClick={() => void install()}
        disabled={installing}
        className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#D4AF37] px-4 text-xs font-semibold text-black transition hover:bg-[#E2C259] disabled:opacity-60"
      >
        <Download className="h-4 w-4" />
        {installing ? "Installing…" : "Install ANVIX"}
      </button>
      <p className="text-xs leading-5 text-zinc-500">
        Adds ANVIX to your home screen for full-screen, app-like use.
      </p>
    </div>
  );
}
