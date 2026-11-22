import { createSerwistRoute } from "@serwist/turbopack";

/**
 * Serves the compiled service worker at `/serwist/sw.js`.
 *
 * Turbopack build note: unlike the webpack plugin (`@serwist/next`),
 * the Turbopack integration does not write a file into `public/` — the
 * worker is compiled by esbuild inside this route handler and prerendered
 * as a static file at build time. `PwaRegister` registers `/serwist/sw.js`
 * with scope `/` (the route sets `Service-Worker-Allowed: /`).
 *
 * Precache glob: only the tiny brand assets. The default glob would
 * precache all of `public/` — including the 11 MB background video —
 * and every build chunk; the install would download megabytes for
 * assets the worker never needs offline. Build chunks are instead
 * runtime-cached on first fetch (CacheFirst, `/_next/static/`, see
 * `app/sw.ts`), which is the same guarantee with no install cost.
 */
export const { dynamic, dynamicParams, revalidate, generateStaticParams, GET } =
  createSerwistRoute({
    swSrc: "app/sw.ts",
    useNativeEsbuild: true,
    globPatterns: [
      "public/icon-192.png",
      "public/icon-512.png",
      "public/logo.png",
      "public/*.svg",
    ],
  });
