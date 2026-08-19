import { and, desc, eq, inArray, isNull } from "drizzle-orm";
import { getAppUrl } from "@/lib/app-url";
import { getDb } from "@/lib/db";
import { demoStore, isDemoMode } from "@/lib/db/demo-store";
import { notifications, users } from "@/lib/db/schema";
import { sendEmail } from "@/lib/email/send";

export function submissionNotifyEmail(input: {
  label: string;
  slug: string;
  requestId: string;
}): { subject: string; html: string; text: string } {
  const url = `${getAppUrl()}/dashboard/${input.requestId}`;
  const subject = `Sizing submitted: ${input.label}`;
  const text = `The customer has submitted the sizing questionnaire for "${input.label}".\n\nOpen results: ${url}\n`;
  const html = `
    <p>The customer has submitted the sizing questionnaire for <strong>${input.label}</strong>.</p>
    <p><a href="${url}">Open results</a></p>
  `.trim();
  return { subject, html, text };
}

export async function notifyCreatorOfSubmission(input: {
  toEmail: string;
  label: string;
  slug: string;
  requestId: string;
}) {
  const content = submissionNotifyEmail(input);
  return sendEmail({ to: input.toEmail, ...content });
}

export type InAppNotification = {
  id: string;
  userId: string;
  type: string;
  title: string;
  body: string | null;
  href: string | null;
  requestId: string | null;
  readAt: Date | null;
  createdAt: Date;
};

async function recipientUserIdsForSubmission(createdById: string): Promise<string[]> {
  const ids = new Set<string>([createdById]);

  if (isDemoMode()) {
    const staff = await demoStore.users.listByRoles([
      "sales_engineer",
      "admin",
    ]);
    for (const u of staff) ids.add(u.id);
    return [...ids];
  }

  const staff = await getDb()
    .select({ id: users.id })
    .from(users)
    .where(inArray(users.role, ["sales_engineer", "admin"]));
  for (const u of staff) ids.add(u.id);
  return [...ids];
}

async function insertInAppNotifications(input: {
  recipientIds: string[];
  type: string;
  title: string;
  body: string;
  href: string;
  requestId: string;
}): Promise<void> {
  if (input.recipientIds.length === 0) return;

  if (isDemoMode()) {
    for (const userId of input.recipientIds) {
      await demoStore.notifications.create({
        userId,
        type: input.type,
        title: input.title,
        body: input.body,
        href: input.href,
        requestId: input.requestId,
      });
    }
    return;
  }

  await getDb()
    .insert(notifications)
    .values(
      input.recipientIds.map((userId) => ({
        userId,
        type: input.type,
        title: input.title,
        body: input.body,
        href: input.href,
        requestId: input.requestId,
      })),
    );
}

/** Persist in-app notifications for the request creator and SE/admin staff. */
export async function createSubmissionInAppNotifications(input: {
  createdById: string;
  label: string;
  requestId: string;
}): Promise<void> {
  const recipientIds = await recipientUserIdsForSubmission(input.createdById);
  await insertInAppNotifications({
    recipientIds,
    type: "submission",
    title: `Sizing submitted: ${input.label}`,
    body: "The customer completed the sizing questionnaire.",
    href: `/dashboard/${input.requestId}`,
    requestId: input.requestId,
  });
}

async function staffRecipientUserIds(): Promise<string[]> {
  if (isDemoMode()) {
    const staff = await demoStore.users.listByRoles([
      "sales_engineer",
      "admin",
    ]);
    return staff.map((u) => u.id);
  }

  const staff = await getDb()
    .select({ id: users.id })
    .from(users)
    .where(inArray(users.role, ["sales_engineer", "admin"]));
  return staff.map((u) => u.id);
}

/** Notify SE/admin staff that an AM flagged a request for review. */
export async function createPendingSeReviewNotifications(input: {
  label: string;
  requestId: string;
  note?: string | null;
}): Promise<void> {
  const recipientIds = await staffRecipientUserIds();
  const note = input.note?.trim();
  await insertInAppNotifications({
    recipientIds,
    type: "pending_se_review",
    title: `Pending SE Review: ${input.label}`,
    body: note
      ? `Flagged for Sales Engineer review — ${note}`
      : "Flagged for Sales Engineer review.",
    href: `/dashboard/${input.requestId}`,
    requestId: input.requestId,
  });
}

export async function listNotificationsForUser(
  userId: string,
  opts?: { unreadOnly?: boolean; limit?: number },
): Promise<InAppNotification[]> {
  const limit = opts?.limit ?? 20;

  if (isDemoMode()) {
    return demoStore.notifications.listByUser(userId, {
      unreadOnly: opts?.unreadOnly,
      limit,
    });
  }

  const conditions = [eq(notifications.userId, userId)];
  if (opts?.unreadOnly) {
    conditions.push(isNull(notifications.readAt));
  }

  return getDb()
    .select()
    .from(notifications)
    .where(and(...conditions))
    .orderBy(desc(notifications.createdAt))
    .limit(limit);
}

export async function countUnreadNotifications(userId: string): Promise<number> {
  if (isDemoMode()) {
    return demoStore.notifications.countUnread(userId);
  }

  const rows = await getDb()
    .select({ id: notifications.id })
    .from(notifications)
    .where(
      and(eq(notifications.userId, userId), isNull(notifications.readAt)),
    );
  return rows.length;
}

export async function markNotificationRead(
  userId: string,
  notificationId: string,
): Promise<void> {
  if (isDemoMode()) {
    await demoStore.notifications.markRead(userId, notificationId);
    return;
  }

  await getDb()
    .update(notifications)
    .set({ readAt: new Date() })
    .where(
      and(
        eq(notifications.id, notificationId),
        eq(notifications.userId, userId),
      ),
    );
}

export async function markAllNotificationsRead(userId: string): Promise<void> {
  if (isDemoMode()) {
    await demoStore.notifications.markAllRead(userId);
    return;
  }

  await getDb()
    .update(notifications)
    .set({ readAt: new Date() })
    .where(
      and(eq(notifications.userId, userId), isNull(notifications.readAt)),
    );
}
