"use client";

import { useState } from "react";
import Link from "next/link";
import {
  markAllMyNotificationsReadAction,
  markMyNotificationReadAction,
} from "@/lib/notification-actions";
import type { InAppNotification } from "@/lib/notifications";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

export function UnreadNotificationsBanner({
  notifications,
}: {
  notifications: InAppNotification[];
}) {
  const [items, setItems] = useState(notifications);
  const [dismissed, setDismissed] = useState(false);

  if (dismissed || items.length === 0) return null;

  const latest = items[0]!;
  const more = items.length - 1;

  async function dismissOne() {
    await markMyNotificationReadAction(latest.id);
    const next = items.slice(1);
    setItems(next);
    if (next.length === 0) setDismissed(true);
  }

  async function dismissAll() {
    await markAllMyNotificationsReadAction();
    setItems([]);
    setDismissed(true);
  }

  return (
    <Alert className="mb-6 border-[var(--sophos-blue)]/30 bg-white shadow-sm">
      <AlertTitle className="text-[var(--sophos-navy)]">
        {latest.title}
      </AlertTitle>
      <AlertDescription>
        <p>
          {latest.body ?? "You have a new dashboard update."}
          {more > 0 ? ` (+${more} more unread)` : ""}
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {latest.href && (
            <Link href={latest.href}>
              <Button size="sm">Open</Button>
            </Link>
          )}
          <Button
            size="sm"
            variant="outline"
            onClick={() => void dismissOne()}
          >
            Dismiss
          </Button>
          {more > 0 && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => void dismissAll()}
            >
              Mark all read
            </Button>
          )}
        </div>
      </AlertDescription>
    </Alert>
  );
}
