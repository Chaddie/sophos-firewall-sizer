"use server";

import { z } from "zod";
import { auth } from "@/lib/auth";
import {
  changePasswordForUser,
  requestPasswordReset,
  resetPasswordWithToken,
} from "@/lib/auth/password-reset";
import {
  deletePasskeyForUser,
  getPasskeysForUser,
} from "@/lib/auth/passkeys";
import { getDb } from "@/lib/db";
import { demoStore, isDemoMode } from "@/lib/db/demo-store";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function requestPasswordResetAction(input: {
  email: string;
}): Promise<{
  ok: true;
  delivered: boolean;
  resetUrl?: string;
  message: string;
}> {
  const email = z.string().email().safeParse(input.email.trim());
  if (!email.success) {
    return {
      ok: true,
      delivered: true,
      message:
        "If that email is registered, you will receive a reset link shortly.",
    };
  }

  const result = await requestPasswordReset(email.data);
  return {
    ok: true,
    delivered: result.delivered,
    resetUrl: result.resetUrl,
    message: result.delivered
      ? "If that email is registered, you will receive a reset link shortly."
      : "Email delivery is not configured — use the reset link below.",
  };
}

export async function resetPasswordAction(input: {
  token: string;
  password: string;
  confirmPassword: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  if (input.password !== input.confirmPassword) {
    return { ok: false, error: "Passwords do not match." };
  }
  return resetPasswordWithToken(input.token, input.password);
}

export async function changePasswordAction(input: {
  currentPassword?: string;
  password: string;
  confirmPassword: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const session = await auth();
  if (!session?.user?.id) return { ok: false, error: "Unauthorized" };

  if (input.password !== input.confirmPassword) {
    return { ok: false, error: "Passwords do not match." };
  }

  return changePasswordForUser(
    session.user.id,
    input.currentPassword?.trim() || null,
    input.password,
  );
}

export async function listMyPasskeysAction() {
  const session = await auth();
  if (!session?.user?.id) return [];
  return getPasskeysForUser(session.user.id);
}

export async function deletePasskeyAction(
  passkeyId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const session = await auth();
  if (!session?.user?.id) return { ok: false, error: "Unauthorized" };
  return deletePasskeyForUser(session.user.id, passkeyId);
}

export async function getAccountSecurityState(): Promise<{
  email: string;
  name: string;
  hasPassword: boolean;
  passkeys: { id: string; deviceName: string | null; createdAt: Date }[];
} | null> {
  const session = await auth();
  if (!session?.user?.id) return null;

  if (isDemoMode()) {
    const user = await demoStore.users.findById(session.user.id);
    if (!user) return null;
    const passkeys = await getPasskeysForUser(user.id);
    return {
      email: user.email,
      name: user.name,
      hasPassword: Boolean(user.passwordHash),
      passkeys,
    };
  }

  const [user] = await getDb()
    .select()
    .from(users)
    .where(eq(users.id, session.user.id))
    .limit(1);
  if (!user) return null;
  const passkeys = await getPasskeysForUser(user.id);
  return {
    email: user.email,
    name: user.name,
    hasPassword: Boolean(user.passwordHash),
    passkeys,
  };
}
