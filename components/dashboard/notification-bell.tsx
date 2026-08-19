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
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const [items, setItems] = useState<InAppNotification[]>([]);
  const [pending, startTransition] = useTransition();
  const rootRef = useRef<HTMLDivElement>(null);

  function refresh() {
    startTransition(async () => {
      const [count, list] = await Promise.all([
        getMyUnreadNotificationCount(),
        getMyNotifications({ limit: 12 }),
      ]);
      setUnread(count);
      setItems(list);
    });
  }

  useEffect(() => {
    refresh();
  }, []);

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
    if (next) refresh();
  }

  async function onMarkAll() {
    await markAllMyNotificationsReadAction();
    refresh();
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
