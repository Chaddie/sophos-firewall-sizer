import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { demoStore, isDemoMode } from "@/lib/db/demo-store";
import { users } from "@/lib/db/schema";
import type { UserRole } from "@/lib/sizing/types";
import { getSsoDefaultRole, getSsoSeEmails } from "@/lib/auth/config";

export type ResolvedAuthUser = {
  id: string;
  email: string;
  name: string;
  role: UserRole;
};

function roleForNewSsoUser(email: string): UserRole {
  if (getSsoSeEmails().has(email.toLowerCase())) {
    return "sales_engineer";
  }
  return getSsoDefaultRole();
}

/**
 * Resolve an app user from an SSO/OIDC identity. Existing users are matched by
 * email (so credentials accounts can later switch to SSO). New users are
 * provisioned JIT with no password.
 */
export async function resolveSsoUser(input: {
  email: string;
  name?: string | null;
}): Promise<ResolvedAuthUser | null> {
  const email = input.email.trim().toLowerCase();
  if (!email) return null;

  const name = input.name?.trim() || email.split("@")[0] || "User";

  if (isDemoMode()) {
    const existing = await demoStore.users.findByEmail(email);
    if (existing) {
      return {
        id: existing.id,
        email: existing.email,
        name: existing.name,
        role: existing.role,
      };
    }
    const created = await demoStore.users.upsert({
      id: crypto.randomUUID(),
      email,
      name,
      // Unusable placeholder — SSO users never authenticate with a password.
      passwordHash: "",
      role: roleForNewSsoUser(email),
    });
    return {
      id: created.id,
      email: created.email,
      name: created.name,
      role: created.role,
    };
  }

  const [existing] = await getDb()
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  if (existing) {
    if (existing.name !== name && name) {
      await getDb()
        .update(users)
        .set({ name })
        .where(eq(users.id, existing.id));
    }
    return {
      id: existing.id,
      email: existing.email,
      name: name || existing.name,
      role: existing.role as UserRole,
    };
  }

  const [created] = await getDb()
    .insert(users)
    .values({
      email,
      name,
      passwordHash: null,
      role: roleForNewSsoUser(email),
    })
    .returning();

  if (!created) return null;

  return {
    id: created.id,
    email: created.email,
    name: created.name,
    role: created.role as UserRole,
  };
}
