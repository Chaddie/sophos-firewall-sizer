"use server";

import { randomUUID } from "crypto";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdminSession } from "@/lib/admin-users";
import { getDb } from "@/lib/db";
import { demoStore, isDemoMode } from "@/lib/db/demo-store";
import { ensureDemoSeed } from "@/lib/db/demo-seed";
import { users } from "@/lib/db/schema";

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
