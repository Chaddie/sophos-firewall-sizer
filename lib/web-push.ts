import webpush from "web-push";
import { eq, inArray } from "drizzle-orm";
import { getAppUrl } from "@/lib/app-url";
import { getDb } from "@/lib/db";
import { demoStore, isDemoMode } from "@/lib/db/demo-store";
import { pushSubscriptions } from "@/lib/db/schema";

export type PushSubscriptionInput = {
  endpoint: string;
  keys: { p256dh: string; auth: string };
};

function vapidConfig() {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY?.trim();
  const privateKey = process.env.VAPID_PRIVATE_KEY?.trim();
  const subject =
    process.env.VAPID_SUBJECT?.trim() ||
    process.env.EMAIL_FROM?.trim() ||
    "mailto:ops@example.com";
  if (!publicKey || !privateKey) return null;
  return { publicKey, privateKey, subject };
}

export function isWebPushConfigured(): boolean {
  return vapidConfig() !== null;
}

export function getVapidPublicKey(): string | null {
  return vapidConfig()?.publicKey ?? null;
}

function configureWebPush() {
  const cfg = vapidConfig();
  if (!cfg) return null;
  webpush.setVapidDetails(cfg.subject, cfg.publicKey, cfg.privateKey);
  return cfg;
}

export async function savePushSubscription(input: {
  userId: string;
  subscription: PushSubscriptionInput;
  userAgent?: string | null;
}): Promise<void> {
  const endpoint = input.subscription.endpoint;
  const p256dh = input.subscription.keys.p256dh;
  const auth = input.subscription.keys.auth;
  if (!endpoint || !p256dh || !auth) {
    throw new Error("Invalid push subscription");
  }

  if (isDemoMode()) {
    await demoStore.pushSubscriptions.upsert({
      userId: input.userId,
      endpoint,
      p256dh,
      auth,
      userAgent: input.userAgent ?? null,
    });
    return;
  }

  await getDb()
    .insert(pushSubscriptions)
    .values({
      userId: input.userId,
      endpoint,
      p256dh,
      auth,
      userAgent: input.userAgent ?? null,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: pushSubscriptions.endpoint,
      set: {
        userId: input.userId,
        p256dh,
        auth,
        userAgent: input.userAgent ?? null,
        updatedAt: new Date(),
      },
    });
}

export async function deletePushSubscription(input: {
  userId: string;
  endpoint: string;
}): Promise<void> {
  if (isDemoMode()) {
    await demoStore.pushSubscriptions.delete(input.userId, input.endpoint);
    return;
  }

  await getDb()
    .delete(pushSubscriptions)
    .where(eq(pushSubscriptions.endpoint, input.endpoint));
}

export async function sendWebPushToUsers(input: {
  userIds: string[];
  title: string;
  body: string;
  href: string;
  tag?: string;
}): Promise<void> {
  if (!configureWebPush()) return;
  if (input.userIds.length === 0) return;

  const absoluteUrl = input.href.startsWith("http")
    ? input.href
    : `${getAppUrl()}${input.href.startsWith("/") ? "" : "/"}${input.href}`;

  const payload = JSON.stringify({
    title: input.title,
    body: input.body,
    url: absoluteUrl,
    tag: input.tag,
  });

  type SubRow = {
    id: string;
    userId: string;
    endpoint: string;
    p256dh: string;
    auth: string;
  };

  let rows: SubRow[] = [];
  if (isDemoMode()) {
    rows = await demoStore.pushSubscriptions.listByUsers(input.userIds);
  } else {
    rows = await getDb()
      .select({
        id: pushSubscriptions.id,
        userId: pushSubscriptions.userId,
        endpoint: pushSubscriptions.endpoint,
        p256dh: pushSubscriptions.p256dh,
        auth: pushSubscriptions.auth,
      })
      .from(pushSubscriptions)
      .where(inArray(pushSubscriptions.userId, input.userIds));
  }

  await Promise.all(
    rows.map(async (row) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: row.endpoint,
            keys: { p256dh: row.p256dh, auth: row.auth },
          },
          payload,
        );
      } catch (err: unknown) {
        const statusCode =
          typeof err === "object" &&
          err !== null &&
          "statusCode" in err &&
          typeof (err as { statusCode: unknown }).statusCode === "number"
            ? (err as { statusCode: number }).statusCode
            : null;
        // Gone / expired subscription — drop it.
        if (statusCode === 404 || statusCode === 410) {
          if (isDemoMode()) {
            await demoStore.pushSubscriptions.delete(row.userId, row.endpoint);
          } else {
            await getDb()
              .delete(pushSubscriptions)
              .where(eq(pushSubscriptions.id, row.id));
          }
        }
      }
    }),
  );
}
