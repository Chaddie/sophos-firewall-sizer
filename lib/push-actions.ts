"use server";

import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import {
  deletePushSubscription,
  getVapidPublicKey,
  isWebPushConfigured,
  savePushSubscription,
  type PushSubscriptionInput,
} from "@/lib/web-push";

export async function getWebPushPublicKeyAction(): Promise<{
  configured: boolean;
  publicKey: string | null;
}> {
  return {
    configured: isWebPushConfigured(),
    publicKey: getVapidPublicKey(),
  };
}

export async function saveWebPushSubscriptionAction(
  subscription: PushSubscriptionInput,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const session = await auth();
  if (!session?.user?.id) return { ok: false, error: "Unauthorized" };
  if (!isWebPushConfigured()) {
    return { ok: false, error: "Web Push is not configured on the server." };
  }

  try {
    const h = await headers();
    await savePushSubscription({
      userId: session.user.id,
      subscription,
      userAgent: h.get("user-agent"),
    });
    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Failed to save subscription",
    };
  }
}

export async function deleteWebPushSubscriptionAction(
  endpoint: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const session = await auth();
  if (!session?.user?.id) return { ok: false, error: "Unauthorized" };
  await deletePushSubscription({
    userId: session.user.id,
    endpoint,
  });
  return { ok: true };
}
