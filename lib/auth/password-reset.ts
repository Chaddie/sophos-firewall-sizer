import { createHash, randomBytes } from "crypto";
import bcrypt from "bcryptjs";
import { and, eq, gt, isNull } from "drizzle-orm";
import { getAppUrl } from "@/lib/app-url";
import { getDb } from "@/lib/db";
import { demoStore, isDemoMode } from "@/lib/db/demo-store";
import { passwordResetTokens, users } from "@/lib/db/schema";
import { sendEmail } from "@/lib/email/send";

const RESET_TTL_MS = 60 * 60 * 1000;

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function passwordResetEmail(resetUrl: string): {
  subject: string;
  html: string;
  text: string;
} {
  const subject = "Reset your Sophos Hardware Sizing password";
  const text = `Reset your password:\n\n${resetUrl}\n\nThis link expires in 1 hour and can only be used once. If you did not request this, you can ignore this email.`;
  const html = `
    <p>Reset your Sophos Hardware Sizing password:</p>
    <p><a href="${resetUrl}">${resetUrl}</a></p>
    <p style="color:#666;font-size:13px">This link expires in 1 hour and can only be used once. If you did not request this, you can ignore this email.</p>
  `.trim();
  return { subject, html, text };
}

/**
 * Always returns a generic success shape so callers don't leak whether the
 * email exists. When email isn't configured, includes resetUrl for local/dev.
 */
export async function requestPasswordReset(emailRaw: string): Promise<{
  ok: true;
  delivered: boolean;
  resetUrl?: string;
}> {
  const email = emailRaw.trim().toLowerCase();
  if (!email.includes("@")) {
    return { ok: true, delivered: true };
  }

  let userId: string | null = null;
  if (isDemoMode()) {
    const user = await demoStore.users.findByEmail(email);
    userId = user?.id ?? null;
  } else {
    const [user] = await getDb()
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, email))
      .limit(1);
    userId = user?.id ?? null;
  }

  if (!userId) {
    return { ok: true, delivered: true };
  }

  const token = randomBytes(32).toString("hex");
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + RESET_TTL_MS);

  if (isDemoMode()) {
    await demoStore.passwordResetTokens.create({
      userId,
      tokenHash,
      expiresAt,
    });
  } else {
    await getDb().insert(passwordResetTokens).values({
      userId,
      tokenHash,
      expiresAt,
    });
  }

  const resetUrl = `${getAppUrl()}/login/reset?token=${token}`;
  const content = passwordResetEmail(resetUrl);
  const sent = await sendEmail({ to: email, ...content });

  if (!sent.ok || !sent.delivered) {
    return { ok: true, delivered: false, resetUrl };
  }

  return { ok: true, delivered: true };
}

export async function resetPasswordWithToken(
  token: string,
  newPassword: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (newPassword.length < 8) {
    return { ok: false, error: "Password must be at least 8 characters." };
  }

  const tokenHash = hashToken(token);
  const now = new Date();
  const passwordHash = await bcrypt.hash(newPassword, 12);

  if (isDemoMode()) {
    const row = await demoStore.passwordResetTokens.findValid(tokenHash, now);
    if (!row) {
      return { ok: false, error: "This reset link is invalid or has expired." };
    }
    const user = await demoStore.users.findById(row.userId);
    if (!user) {
      return { ok: false, error: "This reset link is invalid or has expired." };
    }
    await demoStore.users.upsert({ ...user, passwordHash });
    await demoStore.passwordResetTokens.markUsed(row.id);
    return { ok: true };
  }

  const [row] = await getDb()
    .select()
    .from(passwordResetTokens)
    .where(
      and(
        eq(passwordResetTokens.tokenHash, tokenHash),
        isNull(passwordResetTokens.usedAt),
        gt(passwordResetTokens.expiresAt, now),
      ),
    )
    .limit(1);

  if (!row) {
    return { ok: false, error: "This reset link is invalid or has expired." };
  }

  await getDb()
    .update(users)
    .set({ passwordHash })
    .where(eq(users.id, row.userId));

  await getDb()
    .update(passwordResetTokens)
    .set({ usedAt: now })
    .where(eq(passwordResetTokens.id, row.id));

  return { ok: true };
}

export async function changePasswordForUser(
  userId: string,
  currentPassword: string | null,
  newPassword: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (newPassword.length < 8) {
    return { ok: false, error: "Password must be at least 8 characters." };
  }

  const passwordHash = await bcrypt.hash(newPassword, 12);

  if (isDemoMode()) {
    const user = await demoStore.users.findById(userId);
    if (!user) return { ok: false, error: "User not found." };
    if (user.passwordHash) {
      if (!currentPassword) {
        return { ok: false, error: "Current password is required." };
      }
      const valid = await bcrypt.compare(currentPassword, user.passwordHash);
      if (!valid) return { ok: false, error: "Current password is incorrect." };
    }
    await demoStore.users.upsert({ ...user, passwordHash });
    return { ok: true };
  }

  const [user] = await getDb()
    .select()
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  if (!user) return { ok: false, error: "User not found." };

  if (user.passwordHash) {
    if (!currentPassword) {
      return { ok: false, error: "Current password is required." };
    }
    const valid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!valid) return { ok: false, error: "Current password is incorrect." };
  }

  await getDb()
    .update(users)
    .set({ passwordHash })
    .where(eq(users.id, userId));

  return { ok: true };
}
