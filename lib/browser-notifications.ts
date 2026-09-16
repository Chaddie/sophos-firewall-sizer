"use client";

import {
  getWebPushPublicKeyAction,
  saveWebPushSubscriptionAction,
} from "@/lib/push-actions";

const SEEN_KEY = "sophos-notif-seen-ids";

function loadSeenIds(): Set<string> {
  try {
    const raw = sessionStorage.getItem(SEEN_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw) as string[];
    return new Set(Array.isArray(parsed) ? parsed : []);
  } catch {
    return new Set();
  }
}

function saveSeenIds(ids: Set<string>) {
  try {
    sessionStorage.setItem(SEEN_KEY, JSON.stringify([...ids].slice(-100)));
  } catch {
    // ignore quota / private mode
  }
}

export function browserNotificationsSupported(): boolean {
  return typeof window !== "undefined" && "Notification" in window;
}

export function webPushSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

export async function ensureBrowserNotificationPermission(): Promise<
  NotificationPermission | "unsupported"
> {
  if (!browserNotificationsSupported()) return "unsupported";
  if (Notification.permission === "granted") return "granted";
  if (Notification.permission === "denied") return "denied";
  try {
    return await Notification.requestPermission();
  } catch {
    return Notification.permission;
  }
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = window.atob(base64);
  const output = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i += 1) {
    output[i] = raw.charCodeAt(i);
  }
  return output;
}

export async function registerPushServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!webPushSupported()) return null;
  try {
    return await navigator.serviceWorker.register("/sw.js", { scope: "/" });
  } catch {
    return null;
  }
}

/**
 * Request permission, register the service worker, and save a Web Push
 * subscription so Chrome can notify even when the dashboard tab is closed.
 */
export async function enableChromePushNotifications(): Promise<{
  permission: NotificationPermission | "unsupported";
  pushSubscribed: boolean;
  error?: string;
}> {
  const permission = await ensureBrowserNotificationPermission();
  if (permission !== "granted") {
    return { permission, pushSubscribed: false };
  }

  if (!webPushSupported()) {
    return { permission, pushSubscribed: false };
  }

  const { configured, publicKey } = await getWebPushPublicKeyAction();
  if (!configured || !publicKey) {
    return {
      permission,
      pushSubscribed: false,
      error:
        "Desktop alerts while the tab is open still work. Server Web Push keys are not configured yet.",
    };
  }

  const registration = await registerPushServiceWorker();
  if (!registration) {
    return {
      permission,
      pushSubscribed: false,
      error: "Could not register the notification service worker.",
    };
  }

  await navigator.serviceWorker.ready;

  let subscription = await registration.pushManager.getSubscription();
  if (!subscription) {
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey) as BufferSource,
    });
  }

  const json = subscription.toJSON();
  if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) {
    return {
      permission,
      pushSubscribed: false,
      error: "Browser returned an incomplete push subscription.",
    };
  }

  const saved = await saveWebPushSubscriptionAction({
    endpoint: json.endpoint,
    keys: { p256dh: json.keys.p256dh, auth: json.keys.auth },
  });

  if (!saved.ok) {
    return {
      permission,
      pushSubscribed: false,
      error: saved.error,
    };
  }

  return { permission, pushSubscribed: true };
}

/**
 * Show Chromium/desktop notifications for newly arrived unread in-app items
 * while this tab is open (fallback when remote push is unavailable).
 */
export function notifyBrowserOfNewItems(
  items: Array<{
    id: string;
    title: string;
    body: string | null;
    href: string | null;
    readAt: Date | string | null;
  }>,
): void {
  if (!browserNotificationsSupported()) return;
  if (Notification.permission !== "granted") return;

  const seen = loadSeenIds();
  const unreadNew = items.filter(
    (item) => !item.readAt && !seen.has(item.id),
  );

  for (const item of unreadNew) {
    seen.add(item.id);
    try {
      const n = new Notification(item.title, {
        body: item.body ?? undefined,
        tag: item.id,
      });
      n.onclick = () => {
        window.focus();
        if (item.href) {
          window.location.href = item.href;
        }
        n.close();
      };
    } catch {
      // Some Chromium contexts block Notification construction.
    }
  }

  for (const item of items) {
    seen.add(item.id);
  }
  saveSeenIds(seen);
}
