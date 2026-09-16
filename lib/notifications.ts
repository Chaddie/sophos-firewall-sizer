import { and, desc, eq, inArray, isNull } from "drizzle-orm";
import { getAppUrl } from "@/lib/app-url";
import { getDb } from "@/lib/db";
import { demoStore, isDemoMode } from "@/lib/db/demo-store";
import { notifications, users } from "@/lib/db/schema";
import { sendEmail } from "@/lib/email/send";
import { sendWebPushToUsers } from "@/lib/web-push";

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
  } else {
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

  // Best-effort Chrome / Chromium push (requires VAPID + subscribed browsers).
  try {
    await sendWebPushToUsers({
      userIds: input.recipientIds,
      title: input.title,
      body: input.body,
      href: input.href,
      tag: input.requestId,
    });
  } catch {
    // Do not fail the primary notification write if push delivery fails.
  }
}

/** Persist in-app notifications for the request creator and SE/admin staff. */
export async function createSubmissionInAppNotifications(input: {
  createdById: string;
  label: string;
  requestId: string;
  alignedSeId?: string | null;
}): Promise<void> {
  const recipientIds = await recipientUserIdsForSubmission(input.createdById);
  if (input.alignedSeId) recipientIds.push(input.alignedSeId);
  await insertInAppNotifications({
    recipientIds: [...new Set(recipientIds)],
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
  alignedSeId?: string | null;
}): Promise<void> {
  const recipientIds = await staffRecipientUserIds();
  if (input.alignedSeId) recipientIds.push(input.alignedSeId);
  const note = input.note?.trim();
  await insertInAppNotifications({
    recipientIds: [...new Set(recipientIds)],
    type: "pending_se_review",
    title: `Pending SE Review: ${input.label}`,
    body: note
      ? `Flagged for Sales Engineer review — ${note}`
      : "Flagged for Sales Engineer review.",
    href: `/dashboard/${input.requestId}`,
    requestId: input.requestId,
  });
}

/** Email content for aligned SE when an AM/partner creates a sizing request.
 * Wired for when outbound email is configured (Resend); safe no-op otherwise. */
export function alignedSeRequestCreatedEmail(input: {
  label: string;
  requestId: string;
  creatorName: string;
  creatorEmail?: string | null;
}): { subject: string; html: string; text: string } {
  const url = `${getAppUrl()}/dashboard/${input.requestId}`;
  const who = input.creatorEmail
    ? `${input.creatorName} (${input.creatorEmail})`
    : input.creatorName;
  const subject = `Sizing request raised: ${input.label}`;
  const text = `One of your Account Managers has raised a sizing request through the Sophos Hardware Sizing portal.\n\nCustomer: ${input.label}\nRaised by: ${who}\n\nOpen request: ${url}\n`;
  const html = `
    <p>One of your Account Managers has raised a sizing request through the Sophos Hardware Sizing portal.</p>
    <p><strong>Customer:</strong> ${input.label}<br/>
    <strong>Raised by:</strong> ${who}</p>
    <p><a href="${url}">Open request</a></p>
  `.trim();
  return { subject, html, text };
}

/**
 * Notify the aligned SE that an AM/partner created a sizing link.
 * In-app always; email is attempted when Resend is configured (otherwise deferred).
 */
export async function notifyAlignedSeOfRequestCreated(input: {
  alignedSeId: string;
  label: string;
  requestId: string;
  creatorName: string;
  creatorEmail?: string | null;
}): Promise<void> {
  await insertInAppNotifications({
    recipientIds: [input.alignedSeId],
    type: "aligned_request_created",
    title: `Sizing request raised: ${input.label}`,
    body: `${input.creatorName} raised a sizing request and aligned you as SE.`,
    href: `/dashboard/${input.requestId}`,
    requestId: input.requestId,
  });

  // Email is wired for later / when RESEND_API_KEY + EMAIL_FROM are set.
  let toEmail: string | null = null;
  if (isDemoMode()) {
    const se = await demoStore.users.findById(input.alignedSeId);
    toEmail = se?.email ?? null;
  } else {
    const [se] = await getDb()
      .select({ email: users.email })
      .from(users)
      .where(eq(users.id, input.alignedSeId))
      .limit(1);
    toEmail = se?.email ?? null;
  }

  if (toEmail) {
    const content = alignedSeRequestCreatedEmail({
      label: input.label,
      requestId: input.requestId,
      creatorName: input.creatorName,
      creatorEmail: input.creatorEmail,
    });
    await sendEmail({ to: toEmail, ...content });
  }
}

function reviewStatusNotifyEmail(input: {
  label: string;
  requestId: string;
  status: "reviewed" | "needs_changes";
  note?: string | null;
}): { subject: string; html: string; text: string } {
  const url = `${getAppUrl()}/dashboard/${input.requestId}`;
  const statusLabel =
    input.status === "reviewed" ? "reviewed" : "needs changes";
  const subject = `SE review ${statusLabel}: ${input.label}`;
  const noteLine = input.note?.trim()
    ? `\n\nNote: ${input.note.trim()}\n`
    : "\n";
  const text = `A Sales Engineer marked "${input.label}" as ${statusLabel}.${noteLine}\nOpen request: ${url}\n`;
  const html = `
    <p>A Sales Engineer marked <strong>${input.label}</strong> as <strong>${statusLabel}</strong>.</p>
    ${input.note?.trim() ? `<p>Note: ${input.note.trim()}</p>` : ""}
    <p><a href="${url}">Open request</a></p>
  `.trim();
  return { subject, html, text };
}

/** Notify the request creator (AM/partner) when SE marks reviewed / needs_changes. */
export async function createReviewStatusNotifications(input: {
  createdById: string;
  label: string;
  requestId: string;
  status: "reviewed" | "needs_changes";
  note?: string | null;
}): Promise<void> {
  const statusLabel =
    input.status === "reviewed" ? "Reviewed" : "Needs changes";
  const note = input.note?.trim();

  await insertInAppNotifications({
    recipientIds: [input.createdById],
    type: "review_status",
    title: `${statusLabel}: ${input.label}`,
    body: note
      ? `Sales Engineer marked this request as ${statusLabel.toLowerCase()} — ${note}`
      : `Sales Engineer marked this request as ${statusLabel.toLowerCase()}.`,
    href: `/dashboard/${input.requestId}`,
    requestId: input.requestId,
  });

  let toEmail: string | null = null;
  if (isDemoMode()) {
    const creator = await demoStore.users.findById(input.createdById);
    toEmail = creator?.email ?? null;
  } else {
    const [creator] = await getDb()
      .select({ email: users.email })
      .from(users)
      .where(eq(users.id, input.createdById))
      .limit(1);
    toEmail = creator?.email ?? null;
  }

  if (toEmail) {
    const content = reviewStatusNotifyEmail({
      label: input.label,
      requestId: input.requestId,
      status: input.status,
      note,
    });
    await sendEmail({ to: toEmail, ...content });
  }
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
