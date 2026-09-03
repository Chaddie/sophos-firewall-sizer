import { desc, eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { demoStore, isDemoMode } from "@/lib/db/demo-store";
import { submissionVersions, submissions } from "@/lib/db/schema";
import type { StoredAnswers, StoredRecommendation } from "@/lib/sizing/types";

export type SubmissionVersionSource =
  | "customer_resubmit"
  | "se_correction"
  | "reopen"
  | "catalog_recompute";

export type SubmissionVersionRow = {
  id: string;
  requestId: string;
  version: number;
  answers: StoredAnswers;
  recommendation: StoredRecommendation;
  source: string;
  createdById: string | null;
  submittedAt: Date;
  archivedAt: Date;
};

/** Archive the current live submission into submission_versions. */
export async function archiveCurrentSubmission(input: {
  requestId: string;
  source: SubmissionVersionSource;
  createdById?: string | null;
}): Promise<{ version: number } | null> {
  if (isDemoMode()) {
    const current = await demoStore.submissions.findByRequestId(input.requestId);
    if (!current) return null;
    const version = current.version ?? 1;
    await demoStore.submissionVersions.create({
      requestId: input.requestId,
      version,
      answers: current.answers,
      recommendation: current.recommendation,
      source: input.source,
      createdById: input.createdById ?? null,
      submittedAt: current.submittedAt,
    });
    return { version };
  }

  const [current] = await getDb()
    .select()
    .from(submissions)
    .where(eq(submissions.requestId, input.requestId))
    .limit(1);
  if (!current) return null;

  await getDb().insert(submissionVersions).values({
    requestId: input.requestId,
    version: current.version,
    answers: current.answers,
    recommendation: current.recommendation,
    source: input.source,
    createdById: input.createdById ?? null,
    submittedAt: current.submittedAt,
  });

  return { version: current.version };
}

export async function listSubmissionVersions(
  requestId: string,
): Promise<SubmissionVersionRow[]> {
  if (isDemoMode()) {
    return demoStore.submissionVersions.listByRequestId(requestId);
  }

  return getDb()
    .select()
    .from(submissionVersions)
    .where(eq(submissionVersions.requestId, requestId))
    .orderBy(desc(submissionVersions.version));
}
