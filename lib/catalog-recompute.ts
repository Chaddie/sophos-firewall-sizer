"use server";

import { eq, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { canAccessCatalogAdmin } from "@/lib/auth-utils";
import { listCatalogAudit, recordCatalogAudit } from "@/lib/catalog-audit";
import { getDb } from "@/lib/db";
import { demoStore, isDemoMode } from "@/lib/db/demo-store";
import { sizingRequests, submissions } from "@/lib/db/schema";
import { calculateSubmission } from "@/lib/sizing/submission-engine";
import { archiveCurrentSubmission } from "@/lib/sizing/submission-versions";
import { isV2Answers } from "@/lib/sizing/types";

async function requireAdmin() {
  const session = await auth();
  if (!session?.user?.id || !canAccessCatalogAdmin(session.user.role)) {
    throw new Error(
      "Unauthorized — catalog management is restricted to admins",
    );
  }
  return session;
}

/** Recalculate BOMs for all active (non-archived) submitted deals from stored answers. */
export async function recomputeOpenSubmissionBomsAction(): Promise<
  { ok: true; updated: number; skipped: number } | { ok: false; error: string }
> {
  const session = await requireAdmin();
  const actorId = session.user!.id;

  let updated = 0;
  let skipped = 0;

  if (isDemoMode()) {
    const requests = await demoStore.sizingRequests.listAll();
    for (const req of requests) {
      if (req.archivedAt || req.status !== "submitted") continue;
      const sub = await demoStore.submissions.findByRequestId(req.id);
      if (!sub || !isV2Answers(sub.answers)) {
        skipped++;
        continue;
      }
      await archiveCurrentSubmission({
        requestId: req.id,
        source: "catalog_recompute",
        createdById: actorId,
      });
      const recommendation = await calculateSubmission(sub.answers, req.label);
      await demoStore.submissions.update(req.id, {
        answers: sub.answers,
        recommendation,
        version: (sub.version ?? 1) + 1,
      });
      updated++;
    }
  } else {
    const open = await getDb()
      .select({
        id: sizingRequests.id,
        label: sizingRequests.label,
        status: sizingRequests.status,
        submissionId: submissions.id,
        answers: submissions.answers,
        version: submissions.version,
      })
      .from(sizingRequests)
      .innerJoin(submissions, eq(submissions.requestId, sizingRequests.id))
      .where(isNull(sizingRequests.archivedAt));

    for (const row of open) {
      if (row.status !== "submitted") continue;
      if (!isV2Answers(row.answers)) {
        skipped++;
        continue;
      }
      await archiveCurrentSubmission({
        requestId: row.id,
        source: "catalog_recompute",
        createdById: actorId,
      });
      const recommendation = await calculateSubmission(row.answers, row.label);
      await getDb()
        .update(submissions)
        .set({
          recommendation,
          version: row.version + 1,
          submittedAt: new Date(),
        })
        .where(eq(submissions.id, row.submissionId));
      updated++;
    }
  }

  await recordCatalogAudit({
    action: "recompute_open_boms",
    entityType: "firewall",
    entityId: "*",
    summary: `Recalculated ${updated} open submission(s); skipped ${skipped}`,
  });

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/admin/catalog");
  return { ok: true, updated, skipped };
}

export async function getCatalogAuditLogAction(limit = 40) {
  await requireAdmin();
  return listCatalogAudit(limit);
}
