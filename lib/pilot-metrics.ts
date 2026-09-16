import { and, gte, isNotNull, sql } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { demoStore, isDemoMode } from "@/lib/db/demo-store";
import { ensureDemoSeed } from "@/lib/db/demo-seed";
import { sizingRequests, submissions } from "@/lib/db/schema";

export type PilotMetrics = {
  windowDays: number;
  since: string;
  linksCreated: number;
  submissions: number;
  flagged: number;
  reviewed: number;
  needsChanges: number;
  /** Submitted requests with opportunity ID set (proxy for export-ready). */
  withOpportunityId: number;
  /** Average hours from flaggedAt → reviewedAt for reviewed deals in window. */
  avgFlagToReviewHours: number | null;
  submitRatePercent: number | null;
};

function hoursBetween(a: Date, b: Date): number {
  return (b.getTime() - a.getTime()) / (1000 * 60 * 60);
}

export async function getPilotMetrics(
  windowDays = 14,
): Promise<PilotMetrics> {
  const since = new Date(Date.now() - windowDays * 24 * 60 * 60 * 1000);

  if (isDemoMode()) {
    await ensureDemoSeed();
    const requests = await demoStore.sizingRequests.listAll();
    const inWindow = requests.filter(
      (r) => r.createdAt && new Date(r.createdAt) >= since,
    );
    const linksCreated = inWindow.length;
    let submissionsCount = 0;
    let flagged = 0;
    let reviewed = 0;
    let needsChanges = 0;
    let withOpportunityId = 0;
    const latencies: number[] = [];

    for (const req of inWindow) {
      const sub = await demoStore.submissions.findByRequestId(req.id);
      if (sub && new Date(sub.submittedAt) >= since) submissionsCount += 1;
      if (req.reviewStatus === "flagged") flagged += 1;
      if (req.reviewStatus === "reviewed") reviewed += 1;
      if (req.reviewStatus === "needs_changes") needsChanges += 1;
      if (req.opportunityId?.trim()) withOpportunityId += 1;
      if (req.flaggedAt && req.reviewedAt) {
        latencies.push(
          hoursBetween(new Date(req.flaggedAt), new Date(req.reviewedAt)),
        );
      }
    }

    return {
      windowDays,
      since: since.toISOString(),
      linksCreated,
      submissions: submissionsCount,
      flagged,
      reviewed,
      needsChanges,
      withOpportunityId,
      avgFlagToReviewHours:
        latencies.length > 0
          ? Math.round(
              (latencies.reduce((a, b) => a + b, 0) / latencies.length) * 10,
            ) / 10
          : null,
      submitRatePercent:
        linksCreated > 0
          ? Math.round((submissionsCount / linksCreated) * 1000) / 10
          : null,
    };
  }

  const db = getDb();

  const [linkRow] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(sizingRequests)
    .where(gte(sizingRequests.createdAt, since));

  const [subRow] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(submissions)
    .where(gte(submissions.submittedAt, since));

  const [flaggedRow] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(sizingRequests)
    .where(
      and(
        gte(sizingRequests.createdAt, since),
        sql`${sizingRequests.reviewStatus} = 'flagged'`,
      ),
    );

  const [reviewedRow] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(sizingRequests)
    .where(
      and(
        gte(sizingRequests.createdAt, since),
        sql`${sizingRequests.reviewStatus} = 'reviewed'`,
      ),
    );

  const [needsRow] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(sizingRequests)
    .where(
      and(
        gte(sizingRequests.createdAt, since),
        sql`${sizingRequests.reviewStatus} = 'needs_changes'`,
      ),
    );

  const [oppRow] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(sizingRequests)
    .where(
      and(
        gte(sizingRequests.createdAt, since),
        isNotNull(sizingRequests.opportunityId),
        sql`trim(${sizingRequests.opportunityId}) <> ''`,
      ),
    );

  const latencyRows = await db
    .select({
      flaggedAt: sizingRequests.flaggedAt,
      reviewedAt: sizingRequests.reviewedAt,
    })
    .from(sizingRequests)
    .where(
      and(
        gte(sizingRequests.createdAt, since),
        isNotNull(sizingRequests.flaggedAt),
        isNotNull(sizingRequests.reviewedAt),
      ),
    );

  const latencies = latencyRows
    .filter((r) => r.flaggedAt && r.reviewedAt)
    .map((r) => hoursBetween(r.flaggedAt!, r.reviewedAt!));

  const linksCreated = linkRow?.count ?? 0;
  const submissionsCount = subRow?.count ?? 0;

  return {
    windowDays,
    since: since.toISOString(),
    linksCreated,
    submissions: submissionsCount,
    flagged: flaggedRow?.count ?? 0,
    reviewed: reviewedRow?.count ?? 0,
    needsChanges: needsRow?.count ?? 0,
    withOpportunityId: oppRow?.count ?? 0,
    avgFlagToReviewHours:
      latencies.length > 0
        ? Math.round(
            (latencies.reduce((a, b) => a + b, 0) / latencies.length) * 10,
          ) / 10
        : null,
    submitRatePercent:
      linksCreated > 0
        ? Math.round((submissionsCount / linksCreated) * 1000) / 10
        : null,
  };
}
