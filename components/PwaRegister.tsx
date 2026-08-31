"use client";

import { useEffect } from "react";

export default function PwaRegister() {
  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const isSecureContext =
      window.location.protocol === "https:" ||
      window.location.hostname === "localhost";

    if (!("serviceWorker" in navigator) || !isSecureContext) {
      return;
    }

    navigator.serviceWorker
      .register("/sw.js")
      .catch((error) => {
        console.error("Service worker registration failed:", error);
      });
  }, []);

  return null;
}
