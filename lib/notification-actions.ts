"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import {
  countUnreadNotifications,
  listNotificationsForUser,
  markAllNotificationsRead,
  markNotificationRead,
  type InAppNotification,
} from "@/lib/notifications";

export async function getMyNotifications(opts?: {
  unreadOnly?: boolean;
  limit?: number;
}): Promise<InAppNotification[]> {
  const session = await auth();
  if (!session?.user?.id) return [];
  return listNotificationsForUser(session.user.id, opts);
}

export async function getMyUnreadNotificationCount(): Promise<number> {
  const session = await auth();
  if (!session?.user?.id) return 0;
  return countUnreadNotifications(session.user.id);
}

export async function markMyNotificationReadAction(
  notificationId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const session = await auth();
  if (!session?.user?.id) return { ok: false, error: "Unauthorized" };
  await markNotificationRead(session.user.id, notificationId);
  revalidatePath("/dashboard");
  return { ok: true };
}

export async function markAllMyNotificationsReadAction(): Promise<
  { ok: true } | { ok: false; error: string }
> {
  const session = await auth();
  if (!session?.user?.id) return { ok: false, error: "Unauthorized" };
  await markAllNotificationsRead(session.user.id);
  revalidatePath("/dashboard");
  return { ok: true };
}
