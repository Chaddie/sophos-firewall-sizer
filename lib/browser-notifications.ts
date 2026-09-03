"use client";

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

/**
 * Show Chromium/desktop notifications for newly arrived unread in-app items.
 * Relies on dashboard polling (not a remote push service).
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

  // Also mark already-read / displayed ids so we don't spam on first load forever.
  for (const item of items) {
    seen.add(item.id);
  }
  saveSeenIds(seen);
}
