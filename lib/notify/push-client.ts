import { getAuthHeaders } from "@/lib/api/auth-headers";

/**
 * Web Push — browser side.
 *
 * Subscribes this browser via the service worker's PushManager and posts
 * the subscription to `/api/push/subscribe`. Nothing here invents a
 * subscription: if PushManager, the service worker, or Notification
 * permission is unavailable, the caller gets `false` with a reason and
 * the Settings UI reports it honestly.
 */

export function isPushSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

export function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, "+")
    .replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i += 1) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export type PushSubscribeResult =
  | { ok: true }
  | { ok: false; error: string };

async function postJson(path: string, body: unknown): Promise<Response> {
  const headers = await getAuthHeaders();
  return fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
}

export async function getPushSubscriptionState(): Promise<{
  subscribed: boolean;
  permission: NotificationPermission;
}> {
  if (!isPushSupported()) {
    return { subscribed: false, permission: "default" };
  }
  const registration = await navigator.serviceWorker.getRegistration("/");
  const subscription =
    (await registration?.pushManager.getSubscription()) ?? null;
  return {
    subscribed: subscription !== null,
    permission: Notification.permission,
  };
}

export async function subscribeToPush(
  vapidPublicKey: string
): Promise<PushSubscribeResult> {
  if (!isPushSupported()) {
    return { ok: false, error: "Web Push is not supported in this browser." };
  }

  const permission = await Notification.requestPermission();
  if (permission !== "granted") {
    return { ok: false, error: "Notification permission was not granted." };
  }

  try {
    const registration = await navigator.serviceWorker.register(
      "/serwist/sw.js",
      { scope: "/" }
    );
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
    });

    const response = await postJson("/api/push/subscribe", {
      subscription: subscription.toJSON(),
    });
    if (!response.ok) {
      await subscription.unsubscribe();
      const data = (await response.json().catch(() => null)) as {
        error?: string;
      } | null;
      return {
        ok: false,
        error: data?.error ?? "Could not save the push subscription.",
      };
    }
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error
          ? error.message
          : "Could not subscribe to push notifications.",
    };
  }
}

export async function unsubscribeFromPush(): Promise<PushSubscribeResult> {
  if (!isPushSupported()) {
    return { ok: false, error: "Web Push is not supported in this browser." };
  }
  try {
    const registration = await navigator.serviceWorker.getRegistration("/");
    const subscription =
      (await registration?.pushManager.getSubscription()) ?? null;
    if (!subscription) return { ok: true };

    const endpoint = subscription.endpoint;
    await subscription.unsubscribe();
    const response = await postJson("/api/push/unsubscribe", { endpoint });
    if (!response.ok) {
      const data = (await response.json().catch(() => null)) as {
        error?: string;
      } | null;
      return {
        ok: false,
        error: data?.error ?? "Could not remove the push subscription.",
      };
    }
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error
          ? error.message
          : "Could not unsubscribe from push notifications.",
    };
  }
}
