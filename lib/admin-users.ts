"use server";

import { randomUUID } from "crypto";
import bcrypt from "bcryptjs";
import { asc, count, eq, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { isAdmin } from "@/lib/auth-utils";
import { getDb } from "@/lib/db";
import { demoStore, isDemoMode } from "@/lib/db/demo-store";
import { ensureDemoSeed } from "@/lib/db/demo-seed";
import { passkeys, users } from "@/lib/db/schema";
import type { UserRole } from "@/lib/sizing/types";

const createUserSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(120),
  email: z.string().trim().email("Enter a valid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  role: z.enum([
    "account_manager",
    "sales_engineer",
    "admin",
    "partner",
  ]),
});

export type AdminUserRow = {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  createdAt: Date | null;
  hasPassword: boolean;
  passkeyCount: number;
  sponsoredByEmail: string | null;
};

export function roleDisplayLabel(role: UserRole | string): string {
  switch (role) {
    case "admin":
      return "Admin";
    case "sales_engineer":
      return "Sales engineer";
    case "account_manager":
      return "Account manager";
    case "partner":
      return "Partner";
    default:
      return role;
  }
}

export async function requireAdminSession() {
  const session = await auth();
  if (!session?.user?.id || !isAdmin(session.user.role)) {
    return null;
  }
  return session;
}

/** All accounts that can sign in (password, SSO-provisioned, partner magic link, passkey). */
export async function listUsersForAdmin(): Promise<AdminUserRow[]> {
  if (isDemoMode()) {
    await ensureDemoSeed();
    const all = await demoStore.users.listByRoles([
      "admin",
      "sales_engineer",
      "account_manager",
      "partner",
    ]);
    const byId = new Map(all.map((u) => [u.id, u]));
    const rows: AdminUserRow[] = [];
    for (const u of all) {
      const passkeyRows = await demoStore.passkeys.listByUser(u.id);
      const sponsor = u.sponsoredById
        ? byId.get(u.sponsoredById) ?? null
        : null;
      rows.push({
        id: u.id,
        email: u.email,
        name: u.name,
        role: u.role,
        createdAt: null,
        hasPassword: Boolean(u.passwordHash),
        passkeyCount: passkeyRows.length,
        sponsoredByEmail: sponsor?.email ?? null,
      });
    }
    return rows.sort((a, b) => a.email.localeCompare(b.email));
  }

  const db = getDb();
  const userRows = await db
    .select({
      id: users.id,
      email: users.email,
      name: users.name,
      role: users.role,
      createdAt: users.createdAt,
      passwordHash: users.passwordHash,
      sponsoredById: users.sponsoredById,
    })
    .from(users)
    .orderBy(asc(users.email));

  const passkeyCounts = await db
    .select({
      userId: passkeys.userId,
      n: count(passkeys.id),
    })
    .from(passkeys)
    .groupBy(passkeys.userId);

  const passkeyByUser = new Map(
    passkeyCounts.map((r) => [r.userId, Number(r.n)]),
  );

  const sponsorIds = [
    ...new Set(
      userRows
        .map((u) => u.sponsoredById)
        .filter((id): id is string => Boolean(id)),
    ),
  ];
  const sponsorEmails = new Map<string, string>();
  if (sponsorIds.length > 0) {
    const sponsors = await db
      .select({ id: users.id, email: users.email })
      .from(users)
      .where(inArray(users.id, sponsorIds));
    for (const s of sponsors) sponsorEmails.set(s.id, s.email);
  }

  return userRows.map((u) => ({
    id: u.id,
    email: u.email,
    name: u.name,
    role: u.role as UserRole,
    createdAt: u.createdAt,
    hasPassword: Boolean(u.passwordHash),
    passkeyCount: passkeyByUser.get(u.id) ?? 0,
    sponsoredByEmail: u.sponsoredById
      ? (sponsorEmails.get(u.sponsoredById) ?? null)
      : null,
  }));
}

export async function createUserForAdmin(input: {
  name: string;
  email: string;
  password: string;
  role: string;
}): Promise<{ ok: true; email: string } | { ok: false; error: string }> {
  const session = await requireAdminSession();
  if (!session?.user?.id) {
    return { ok: false, error: "Unauthorized — admins only." };
  }

  const parsed = createUserSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid input.",
    };
  }

  const email = parsed.data.email.toLowerCase();
  const name = parsed.data.name;
  const role = parsed.data.role;
  const passwordHash = await bcrypt.hash(parsed.data.password, 12);
  const sponsoredById = role === "partner" ? session.user.id : null;

  if (isDemoMode()) {
    await ensureDemoSeed();
    const existing = await demoStore.users.findByEmail(email);
    if (existing) {
      return { ok: false, error: "A user with that email already exists." };
    }
    await demoStore.users.upsert({
      id: randomUUID(),
      email,
      name,
      passwordHash,
      role,
      sponsoredById,
    });
    revalidatePath("/dashboard/admin/users");
    return { ok: true, email };
  }

  const db = getDb();
  const [existing] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);
  if (existing) {
    return { ok: false, error: "A user with that email already exists." };
  }

  try {
    await db.insert(users).values({
      email,
      name,
      passwordHash,
      role,
      sponsoredById,
    });
  } catch {
    return { ok: false, error: "Could not create user. Try again." };
  }

  revalidatePath("/dashboard/admin/users");
  return { ok: true, email };
}
