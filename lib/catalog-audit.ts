import { desc } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { demoStore, isDemoMode } from "@/lib/db/demo-store";
import { catalogAuditLog } from "@/lib/db/schema";

export async function recordCatalogAudit(input: {
  action: string;
  entityType: "firewall" | "switch" | "accessory";
  entityId: string;
  summary?: string;
  beforeJson?: unknown;
  afterJson?: unknown;
}): Promise<void> {
  const session = await auth();
  const actorId = session?.user?.id ?? null;

  if (isDemoMode()) {
    await demoStore.catalogAudit.create({
      actorId,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId,
      summary: input.summary ?? null,
      beforeJson: input.beforeJson ?? null,
      afterJson: input.afterJson ?? null,
    });
    return;
  }

  await getDb().insert(catalogAuditLog).values({
    actorId,
    action: input.action,
    entityType: input.entityType,
    entityId: input.entityId,
    summary: input.summary ?? null,
    beforeJson: input.beforeJson ?? null,
    afterJson: input.afterJson ?? null,
  });
}

export async function listCatalogAudit(limit = 40) {
  if (isDemoMode()) {
    return demoStore.catalogAudit.list(limit);
  }

  return getDb()
    .select()
    .from(catalogAuditLog)
    .orderBy(desc(catalogAuditLog.createdAt))
    .limit(limit);
}
