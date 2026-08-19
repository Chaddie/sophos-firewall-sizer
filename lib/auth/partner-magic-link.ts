import { createHash, randomBytes } from "crypto";
import { and, eq, gt, isNotNull, isNull } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { demoStore, isDemoMode } from "@/lib/db/demo-store";
import { partnerMagicLinks, users } from "@/lib/db/schema";
import type { UserRole } from "@/lib/sizing/types";
import { getAppUrl } from "@/lib/app-url";

export type PartnerAuthUser = {
  id: string;
  email: string;
  name: string;
  role: UserRole;
};

const MAGIC_LINK_TTL_MS = 15 * 60 * 1000;

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function defaultNameFromEmail(email: string): string {
  const local = email.split("@")[0] ?? "Partner";
  return local
    .replace(/[._-]+/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim() || "Partner";
}

/** Create a one-time magic link for the partner portal. Returns the raw token. */
export async function createPartnerMagicLink(input: {
  email: string;
  name?: string | null;
  sponsoredById?: string | null;
}): Promise<{ token: string; magicUrl: string; expiresAt: Date }> {
  const email = input.email.trim().toLowerCase();
  const name = input.name?.trim() || null;
  const sponsoredById = input.sponsoredById ?? null;
  const token = randomBytes(32).toString("hex");
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + MAGIC_LINK_TTL_MS);

  if (isDemoMode()) {
    await demoStore.partnerMagicLinks.create({
      email,
      name,
      tokenHash,
      expiresAt,
      sponsoredById,
    });
  } else {
    await getDb().insert(partnerMagicLinks).values({
      email,
      name,
      tokenHash,
      expiresAt,
      sponsoredById,
    });
  }

  const magicUrl = `${getAppUrl()}/partner/verify?token=${token}`;
  return { token, magicUrl, expiresAt };
}

/**
 * Consume a magic-link token and resolve/create the partner user.
 * Existing AM/SE accounts keep their role; new users become partners.
 * Idempotent for a short window so Auth.js / React Strict Mode retries work.
 */
export async function consumePartnerMagicLink(
  token: string,
): Promise<PartnerAuthUser | null> {
  const tokenHash = hashToken(token);
  const now = new Date();
  const recentlyUsedCutoff = new Date(now.getTime() - 2 * 60 * 1000);

  if (isDemoMode()) {
    const valid = await demoStore.partnerMagicLinks.findValid(tokenHash, now);
    if (valid) {
      await demoStore.partnerMagicLinks.markUsed(valid.id);
      return resolvePartnerUser({
        email: valid.email,
        name: valid.name,
        sponsoredById: valid.sponsoredById,
      });
    }
    const recent = await demoStore.partnerMagicLinks.findRecentlyUsed(
      tokenHash,
      recentlyUsedCutoff,
    );
    if (!recent) return null;
    return resolvePartnerUser({
      email: recent.email,
      name: recent.name,
      sponsoredById: recent.sponsoredById,
    });
  }

  const [link] = await getDb()
    .select()
    .from(partnerMagicLinks)
    .where(
      and(
        eq(partnerMagicLinks.tokenHash, tokenHash),
        isNull(partnerMagicLinks.usedAt),
        gt(partnerMagicLinks.expiresAt, now),
      ),
    )
    .limit(1);

  if (link) {
    await getDb()
      .update(partnerMagicLinks)
      .set({ usedAt: now })
      .where(eq(partnerMagicLinks.id, link.id));

    return resolvePartnerUser({
      email: link.email,
      name: link.name,
      sponsoredById: link.sponsoredById,
    });
  }

  const [recent] = await getDb()
    .select()
    .from(partnerMagicLinks)
    .where(
      and(
        eq(partnerMagicLinks.tokenHash, tokenHash),
        isNotNull(partnerMagicLinks.usedAt),
        gt(partnerMagicLinks.usedAt, recentlyUsedCutoff),
      ),
    )
    .limit(1);

  if (!recent) return null;

  return resolvePartnerUser({
    email: recent.email,
    name: recent.name,
    sponsoredById: recent.sponsoredById,
  });
}

export async function resolvePartnerUser(input: {
  email: string;
  name?: string | null;
  sponsoredById?: string | null;
}): Promise<PartnerAuthUser | null> {
  const email = input.email.trim().toLowerCase();
  if (!email) return null;

  const name = input.name?.trim() || defaultNameFromEmail(email);

  if (isDemoMode()) {
    const existing = await demoStore.users.findByEmail(email);
    if (existing) {
      if (existing.role === "partner" && input.name?.trim()) {
        await demoStore.users.upsert({ ...existing, name });
        return { id: existing.id, email, name, role: "partner" };
      }
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
      passwordHash: "",
      role: "partner",
      sponsoredById: input.sponsoredById ?? null,
    });
    return {
      id: created.id,
      email: created.email,
      name: created.name,
      role: "partner",
    };
  }

  const [existing] = await getDb()
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  if (existing) {
    if (existing.role === "partner") {
      const updates: { name?: string; sponsoredById?: string } = {};
      if (input.name?.trim()) updates.name = name;
      if (input.sponsoredById && !existing.sponsoredById) {
        updates.sponsoredById = input.sponsoredById;
      }
      if (Object.keys(updates).length > 0) {
        await getDb()
          .update(users)
          .set(updates)
          .where(eq(users.id, existing.id));
      }
      return {
        id: existing.id,
        email: existing.email,
        name: updates.name ?? existing.name,
        role: "partner",
      };
    }
    return {
      id: existing.id,
      email: existing.email,
      name: existing.name,
      role: existing.role as UserRole,
    };
  }

  const [created] = await getDb()
    .insert(users)
    .values({
      email,
      name,
      passwordHash: null,
      role: "partner",
      sponsoredById: input.sponsoredById ?? null,
    })
    .returning();

  if (!created) return null;

  return {
    id: created.id,
    email: created.email,
    name: created.name,
    role: "partner",
  };
}
