
"use client";

import { useEffect } from "react";

export default function PwaRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) {
      return;
    }

    let isActive = true;

    async function manageServiceWorker() {
      try {
        if (process.env.NODE_ENV !== "production") {
          const registrations =
            await navigator.serviceWorker.getRegistrations();

          if (!isActive) return;

          await Promise.all(
            registrations.map((registration) =>
              registration.unregister()
            )
          );

          console.info(
            "Development mode: service workers unregistered."
          );

          return;
        }

        if (!window.isSecureContext) {
          console.warn(
            "Service workers require a secure context."
          );
          return;
        }

        await navigator.serviceWorker.register("/sw.js", {
          scope: "/",
        });

        if (isActive) {
          console.info("Service worker registered.");
        }
      } catch (error) {
        if (isActive) {
          console.error(
            "Service worker setup failed:",
            error
          );
        }
      }
    }

    void manageServiceWorker();

    return () => {
      isActive = false;
    };
  }, []);

  return null;
}