/// <reference lib="webworker" />

/**
 * ANVIX service worker (Serwist, Turbopack build).
 *
 * CACHING STRATEGY — deliberately boring, because a stale app shell is
 * worse than no offline support at all:
 *
 * - PRECACHE: only the tiny brand assets (icons + logo) from
 *   `__SW_MANIFEST`. The glob is set in `app/serwist/[path]/route.ts`
 *   and intentionally excludes the 11 MB background video and every
 *   page. Precached entries are revisioned, so a new deploy replaces
 *   them instead of serving the old ones.
 * - `/_next/static/*`: CacheFirst. These files are content-hashed by
 *   the build, so a cached copy can never be stale — a new deploy has
 *   new URLs. This is the only aggressively cached bucket.
 * - Same-origin images/fonts: StaleWhileRevalidate (fast, self-healing).
 * - `/api/*`: NetworkOnly, ALWAYS. API responses (chat, auth, rate
 *   limits) must never be served from a cache.
 * - Navigations (pages + RSC): NO route is registered, so they go
 *   straight to the network like there were no service worker. ANVIX
 *   pages are per-user and change every deploy; caching them would
 *   serve a stale shell or another deploy's RSC payload. Offline page
 *   loads therefore fail with the browser's own offline page — that is
 *   the honest trade-off, documented here rather than hidden.
 *
 * PUSH: the `push` / `notificationclick` handlers below render Web Push
 * notifications sent via `/api/push/send`. Payload is JSON:
 * `{ "title", "body", "url", "tag" }`. A push with no (or unparsable)
 * payload shows a generic "ANVIX" notification instead of crashing.
 */

import type { PrecacheEntry, RuntimeCaching, SerwistGlobalConfig } from "serwist";
import {
  CacheFirst,
  NetworkOnly,
  Serwist,
  StaleWhileRevalidate,
} from "serwist";

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

const runtimeCaching: RuntimeCaching[] = [
  {
    // API routes are never cached — see the header comment.
    matcher: ({ url }) => url.pathname.startsWith("/api/"),
    handler: new NetworkOnly(),
  },
  {
    // Content-hashed build assets: safe to cache forever.
    matcher: ({ url }) => url.pathname.startsWith("/_next/static/"),
    handler: new CacheFirst({ cacheName: "anvix-next-static" }),
  },
  {
    // Same-origin images and fonts: serve fast, refresh in background.
    matcher: ({ request, sameOrigin }) =>
      sameOrigin &&
      (request.destination === "image" || request.destination === "font"),
    handler: new StaleWhileRevalidate({ cacheName: "anvix-media" }),
  },
];

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: false,
  runtimeCaching,
});

serwist.addEventListeners();

// ------------------------------------------------------------------ Web Push

interface PushPayload {
  title?: unknown;
  body?: unknown;
  url?: unknown;
  tag?: unknown;
}

function parsePushPayload(data: PushEvent["data"]): PushPayload {
  if (!data) return {};
  try {
    const parsed: unknown = data.json();
    if (parsed && typeof parsed === "object") return parsed as PushPayload;
    return {};
  } catch {
    return { body: data.text() };
  }
}

self.addEventListener("push", (event) => {
  const payload = parsePushPayload(event.data);
  const title =
    typeof payload.title === "string" && payload.title
      ? payload.title
      : "ANVIX";
  const body =
    typeof payload.body === "string" && payload.body
      ? payload.body
      : "You have a new notification.";
  const url =
    typeof payload.url === "string" && payload.url.startsWith("/")
      ? payload.url
      : "/dashboard";
  const tag =
    typeof payload.tag === "string" && payload.tag
      ? payload.tag
      : "anvix-default";

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon: "/icon-192.png",
      badge: "/icon-192.png",
      tag,
      data: { url },
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url =
    typeof event.notification.data?.url === "string"
      ? event.notification.data.url
      : "/dashboard";

  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clients) => {
        const target = new URL(url, self.location.origin).href;
        for (const client of clients) {
          if (client.url === target && "focus" in client) {
            return client.focus();
          }
        }
        return self.clients.openWindow(url);
      })
  );
});
