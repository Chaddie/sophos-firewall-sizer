"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { Bell } from "lucide-react";
import {
  getMyNotifications,
  getMyUnreadNotificationCount,
  markAllMyNotificationsReadAction,
  markMyNotificationReadAction,
} from "@/lib/notification-actions";
import type { InAppNotification } from "@/lib/notifications";
import {
  enableChromePushNotifications,
  notifyBrowserOfNewItems,
} from "@/lib/browser-notifications";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const POLL_MS = 45_000;

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const [items, setItems] = useState<InAppNotification[]>([]);
  const [pending, startTransition] = useTransition();
  const [pushPermission, setPushPermission] = useState<
    NotificationPermission | "unsupported"
  >(() => {
    if (typeof window === "undefined") return "default";
    if (!("Notification" in window)) return "unsupported";
    return Notification.permission;
  });
  const [pushStatus, setPushStatus] = useState<string | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const hydratedRef = useRef(false);

  function refresh(opts?: { announce?: boolean }) {
    startTransition(async () => {
      const [count, list] = await Promise.all([
        getMyUnreadNotificationCount(),
        getMyNotifications({ limit: 12 }),
      ]);
      setUnread(count);
      setItems(list);
      if (opts?.announce && hydratedRef.current) {
        notifyBrowserOfNewItems(list);
      } else if (!hydratedRef.current) {
        // Seed seen IDs on first load so we don't notify for historical unread.
        notifyBrowserOfNewItems(
          list.map((item) => ({ ...item, readAt: item.readAt ?? new Date() })),
        );
        hydratedRef.current = true;
      }
    });
  }

  useEffect(() => {
    refresh({ announce: false });
    const timer = window.setInterval(() => {
      refresh({ announce: true });
    }, POLL_MS);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (pushPermission !== "granted") return;
    void enableChromePushNotifications().then((result) => {
      if (result.pushSubscribed) {
        setPushStatus(
          "Chrome push enabled — you’ll get alerts even when this tab is closed.",
        );
      }
    });
  }, [pushPermission]);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [open]);

  async function onOpen() {
    const next = !open;
    setOpen(next);
    if (next) refresh({ announce: false });
  }

  async function onEnableDesktop() {
    setPushStatus(null);
    const result = await enableChromePushNotifications();
    setPushPermission(result.permission);
    if (result.permission === "granted") {
      setPushStatus(
        result.pushSubscribed
          ? "Chrome push enabled — you’ll get alerts even when this tab is closed."
          : result.error ??
              "Permission granted. Open-tab alerts are on; remote push needs server VAPID keys.",
      );
      refresh({ announce: true });
    }
  }

  async function onMarkAll() {
    await markAllMyNotificationsReadAction();
    refresh({ announce: false });
  }

  async function onClickItem(item: InAppNotification) {
    if (!item.readAt) {
      await markMyNotificationReadAction(item.id);
    }
    setOpen(false);
  }

  return (
    <div ref={rootRef} className="relative">
      <Button
        type="button"
        variant="outline"
        size="sm"
        aria-label={
          unread > 0
            ? `Notifications, ${unread} unread`
            : "Notifications"
        }
        className="relative border-white/30 bg-transparent px-2.5 text-white hover:bg-white/10 hover:text-white"
        onClick={() => void onOpen()}
      >
        <Bell className="size-4" />
        {unread > 0 && (
          <span className="absolute -top-1.5 -right-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--sophos-turquoise)] px-1 text-[10px] font-semibold text-[var(--sophos-navy)]">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </Button>

      {open && (
        <div className="absolute right-0 z-50 mt-2 w-[min(100vw-2rem,22rem)] overflow-hidden rounded-xl border border-[var(--sophos-grey-2)] bg-white shadow-lg">
          <div className="flex items-center justify-between border-b border-[var(--sophos-grey-2)] px-3 py-2">
            <p className="text-sm font-medium text-[var(--sophos-navy)]">
              Notifications
            </p>
            {unread > 0 && (
              <button
                type="button"
                className="text-xs text-[var(--sophos-blue)] hover:underline"
                disabled={pending}
                onClick={() => void onMarkAll()}
              >
                Mark all read
              </button>
            )}
          </div>
          {pushPermission !== "unsupported" && pushPermission !== "granted" && (
            <div className="border-b border-[var(--sophos-grey-2)] bg-[var(--sophos-grey-1)] px-3 py-2">
              {pushPermission === "denied" ? (
                <p className="text-xs text-[var(--sophos-grey-4)]">
                  Desktop notifications are blocked in Chrome. Open the site
                  settings lock icon → Notifications → Allow.
                </p>
              ) : (
                <button
                  type="button"
                  className="text-xs font-medium text-[var(--sophos-blue)] hover:underline"
                  onClick={() => void onEnableDesktop()}
                >
                  Enable Chrome push notifications
                </button>
              )}
            </div>
          )}
          {pushPermission === "granted" && (
            <div className="border-b border-[var(--sophos-grey-2)] bg-[var(--sophos-grey-1)] px-3 py-2">
              {pushStatus ? (
                <p className="text-xs text-[var(--sophos-grey-4)]">{pushStatus}</p>
              ) : (
                <button
                  type="button"
                  className="text-xs font-medium text-[var(--sophos-blue)] hover:underline"
                  onClick={() => void onEnableDesktop()}
                >
                  Sync Chrome push subscription
                </button>
              )}
            </div>
          )}
          <div className="max-h-80 overflow-y-auto">
            {items.length === 0 ? (
              <p className="px-3 py-6 text-center text-sm text-[var(--sophos-grey-4)]">
                No notifications yet.
              </p>
            ) : (
              <ul>
                {items.map((item) => (
                  <li key={item.id}>
                    <Link
                      href={item.href ?? "/dashboard"}
                      onClick={() => void onClickItem(item)}
                      className={cn(
                        "block border-b border-[var(--sophos-grey-2)] px-3 py-2.5 transition-colors hover:bg-[var(--sophos-grey-1)]",
                        !item.readAt && "bg-[var(--sophos-blue)]/5",
                      )}
                    >
                      <p className="text-sm font-medium text-[var(--sophos-navy)]">
                        {item.title}
                      </p>
                      {item.body && (
                        <p className="mt-0.5 text-xs text-[var(--sophos-grey-4)]">
                          {item.body}
                        </p>
                      )}
                      <p className="mt-1 text-[10px] text-[var(--sophos-grey-4)]">
                        {new Date(item.createdAt).toLocaleString()}
                      </p>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
