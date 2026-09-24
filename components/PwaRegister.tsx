"use client";

import { useEffect } from "react";

const SERVICE_WORKER_PATH = "/sw.js";
const SERVICE_WORKER_SCOPE = "/";

export default function PwaRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) {
      return;
    }

    let cancelled = false;

    const manageServiceWorker = async () => {
      try {
        if (process.env.NODE_ENV !== "production") {
          const registration =
            await navigator.serviceWorker.getRegistration(
              SERVICE_WORKER_SCOPE
            );

          if (!registration) {
            return;
          }

          await registration.unregister();

          if (!cancelled) {
            console.info(
              "Development mode: ANVIX service worker unregistered."
            );
          }

          return;
        }

        if (!window.isSecureContext) {
          console.warn(
            "Production service worker skipped: secure context required."
          );
          return;
        }

        const registration =
          await navigator.serviceWorker.register(
            SERVICE_WORKER_PATH,
            {
              scope: SERVICE_WORKER_SCOPE,
            }
          );

        if (cancelled) {
          return;
        }

        console.info(
          "Service worker registered:",
          registration.scope
        );
      } catch (error) {
        if (!cancelled) {
          console.error(
            "Service worker setup failed:",
            error
          );
        }
      }
    };

    void manageServiceWorker();

    return () => {
      cancelled = true;
    };
  }, []);

  return null;
}