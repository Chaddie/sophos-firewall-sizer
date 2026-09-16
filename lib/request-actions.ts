"use server";

import { auth } from "@/lib/auth";
import { hasSePrivileges, isAdmin } from "@/lib/auth-utils";
import { getDb } from "@/lib/db";
import { demoStore, isDemoMode } from "@/lib/db/demo-store";
import { sizingRequests, submissions } from "@/lib/db/schema";
import {
  createPendingSeReviewNotifications,
  createReviewStatusNotifications,
} from "@/lib/notifications";
import { createSeReviewNote } from "@/lib/sizing/create-review-note";
import { resolveReviewNotes } from "@/lib/sizing/review-notes";
import {
  calculateSubmission,
  inputToSubmissionAnswers,
} from "@/lib/sizing/submission-engine";
import { archiveCurrentSubmission } from "@/lib/sizing/submission-versions";
import type { SeReviewNote } from "@/lib/sizing/types";
import { sizingSubmissionSchema } from "@/lib/validations";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

async function loadOwnedOrSeRequest(requestId: string) {
  const session = await auth();
  if (!session?.user?.id) {
    return { ok: false as const, error: "Unauthorized" };
  }

  const canViewAll = hasSePrivileges(session.user.role);

  if (isDemoMode()) {
    const request = await demoStore.sizingRequests.findById(requestId);
    if (!request) return { ok: false as const, error: "Not found" };
    if (!canViewAll && request.createdById !== session.user.id) {
      return { ok: false as const, error: "Unauthorized" };
    }
    return {
      ok: true as const,
      session,
      request,
      canViewAll,
      userId: session.user.id,
    };
  }

  const [request] = await getDb()
    .select()
    .from(sizingRequests)
    .where(eq(sizingRequests.id, requestId))
    .limit(1);
  if (!request) return { ok: false as const, error: "Not found" };
  if (!canViewAll && request.createdById !== session.user.id) {
    return { ok: false as const, error: "Unauthorized" };
  }
  return {
    ok: true as const,
    session,
    request,
    canViewAll,
    userId: session.user.id,
  };
}

function authorFromSession(session: {
  user?: { id?: string; name?: string | null; email?: string | null };
}) {
  return {
    authorId: session.user?.id ?? "unknown",
    authorName: session.user?.name?.trim() || "Sales Engineer",
    authorEmail: session.user?.email ?? null,
  };
}

function nextNotesAfterAppend(
  existing: SeReviewNote[],
  entry: SeReviewNote,
): SeReviewNote[] {
  const materialized = existing.map((n) =>
    n.id === "legacy"
      ? createSeReviewNote({
          body: n.body,
          authorId: n.authorId,
          authorName: n.authorName,
          authorEmail: n.authorEmail,
          createdAt: new Date(n.createdAt),
        })
      : n,
  );
  return [...materialized, entry];
}

async function appendReviewNoteToRequest(
  requestId: string,
  loaded: Extract<Awaited<ReturnType<typeof loadOwnedOrSeRequest>>, { ok: true }>,
  body: string,
) {
  const author = authorFromSession(loaded.session);
  const entry = createSeReviewNote({ body, ...author });
  const existing = resolveReviewNotes({
    reviewNotes: loaded.request.reviewNotes,
    reviewNote: loaded.request.reviewNote,
    reviewedAt: loaded.request.reviewedAt,
    reviewedById: loaded.request.reviewedById,
  });
  const notes = nextNotesAfterAppend(existing, entry);

  if (isDemoMode()) {
    const req = await demoStore.sizingRequests.findById(requestId);
    if (req) {
      req.reviewNotes = notes;
      req.reviewNote = entry.body;
    }
  } else {
    await getDb()
      .update(sizingRequests)
      .set({
        reviewNotes: notes,
        reviewNote: entry.body,
      })
      .where(eq(sizingRequests.id, requestId));
  }

  return entry;
}

export async function flagRequestForSeAction(
  requestId: string,
  note?: string,
  options?: { notifyAllSes?: boolean },
): Promise<{ ok: true } | { ok: false; error: string }> {
  const loaded = await loadOwnedOrSeRequest(requestId);
  if (!loaded.ok) return { ok: false, error: loaded.error };
  if (loaded.request.status !== "submitted") {
    return { ok: false, error: "Flag after the customer has submitted." };
  }

  const now = new Date();
  const flaggedNote = note?.trim() || null;

  if (isDemoMode()) {
    const req = await demoStore.sizingRequests.findById(requestId);
    if (req) {
      req.reviewStatus = "flagged";
      req.flaggedAt = now;
      req.flaggedNote = flaggedNote;
    }
  } else {
    await getDb()
      .update(sizingRequests)
      .set({
        reviewStatus: "flagged",
        flaggedAt: now,
        flaggedNote,
      })
      .where(eq(sizingRequests.id, requestId));
  }

  await createPendingSeReviewNotifications({
    label: loaded.request.label,
    requestId,
    note: flaggedNote,
    alignedSeId: loaded.request.alignedSeId ?? null,
    notifyAllSes: options?.notifyAllSes ?? false,
  });

  revalidatePath(`/dashboard/${requestId}`);
  revalidatePath("/dashboard");
  return { ok: true };
}

export async function setReviewStatusAction(
  requestId: string,
  status: "reviewed" | "needs_changes",
  note?: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const loaded = await loadOwnedOrSeRequest(requestId);
  if (!loaded.ok) return { ok: false, error: loaded.error };
  if (!loaded.canViewAll) {
    return { ok: false, error: "Only sales engineers can set review status." };
  }

  const now = new Date();
  const body = note?.trim() || null;

  if (body) {
    await appendReviewNoteToRequest(requestId, loaded, body);
  }

  if (isDemoMode()) {
    const all = await demoStore.sizingRequests.listAll();
    const row = all.find((r) => r.id === requestId);
    if (row) {
      row.reviewStatus = status;
      row.reviewedAt = now;
      row.reviewedById = loaded.userId;
    }
  } else {
    await getDb()
      .update(sizingRequests)
      .set({
        reviewStatus: status,
        reviewedAt: now,
        reviewedById: loaded.userId,
      })
      .where(eq(sizingRequests.id, requestId));
  }

  await createReviewStatusNotifications({
    createdById: loaded.request.createdById,
    label: loaded.request.label,
    requestId,
    status,
    note: body,
  });

  revalidatePath(`/dashboard/${requestId}`);
  revalidatePath("/dashboard");
  return { ok: true };
}

export async function addSeReviewNoteAction(
  requestId: string,
  note: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const loaded = await loadOwnedOrSeRequest(requestId);
  if (!loaded.ok) return { ok: false, error: loaded.error };
  if (!loaded.canViewAll) {
    return { ok: false, error: "Only sales engineers can add review notes." };
  }
  if (loaded.request.status !== "submitted") {
    return { ok: false, error: "Notes are available after submission." };
  }

  const body = note.trim();
  if (!body) {
    return { ok: false, error: "Enter a review note." };
  }

  await appendReviewNoteToRequest(requestId, loaded, body);

  revalidatePath(`/dashboard/${requestId}`);
  revalidatePath("/dashboard");
  return { ok: true };
}

export async function updateOpportunityIdAction(
  requestId: string,
  opportunityId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const loaded = await loadOwnedOrSeRequest(requestId);
  if (!loaded.ok) return { ok: false, error: loaded.error };

  const value = opportunityId.trim() || null;

  if (isDemoMode()) {
    const all = await demoStore.sizingRequests.listAll();
    const row = all.find((r) => r.id === requestId);
    if (row) row.opportunityId = value;
  } else {
    await getDb()
      .update(sizingRequests)
      .set({ opportunityId: value })
      .where(eq(sizingRequests.id, requestId));
  }

  revalidatePath(`/dashboard/${requestId}`);
  revalidatePath("/dashboard");
  return { ok: true };
}

export async function archiveRequestAction(
  requestId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const session = await auth();
  if (!session?.user?.id) {
    return { ok: false, error: "Unauthorized" };
  }
  if (!isAdmin(session.user.role)) {
    return { ok: false, error: "Only admins can archive requests." };
  }

  const loaded = await loadOwnedOrSeRequest(requestId);
  if (!loaded.ok) return { ok: false, error: loaded.error };
  if (loaded.request.status !== "submitted") {
    return { ok: false, error: "Only submitted requests can be archived." };
  }
  if (loaded.request.archivedAt) {
    return { ok: false, error: "Already archived." };
  }

  const now = new Date();

  if (isDemoMode()) {
    const req = await demoStore.sizingRequests.findById(requestId);
    if (req) {
      req.archivedAt = now;
      req.archivedById = session.user.id;
    }
  } else {
    await getDb()
      .update(sizingRequests)
      .set({
        archivedAt: now,
        archivedById: session.user.id,
      })
      .where(eq(sizingRequests.id, requestId));
  }

  revalidatePath(`/dashboard/${requestId}`);
  revalidatePath("/dashboard");
  return { ok: true };
}

export async function unarchiveRequestAction(
  requestId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const session = await auth();
  if (!session?.user?.id) {
    return { ok: false, error: "Unauthorized" };
  }
  if (!isAdmin(session.user.role)) {
    return { ok: false, error: "Only admins can unarchive requests." };
  }

  const loaded = await loadOwnedOrSeRequest(requestId);
  if (!loaded.ok) return { ok: false, error: loaded.error };
  if (!loaded.request.archivedAt) {
    return { ok: false, error: "Not archived." };
  }

  if (isDemoMode()) {
    const req = await demoStore.sizingRequests.findById(requestId);
    if (req) {
      req.archivedAt = null;
      req.archivedById = null;
    }
  } else {
    await getDb()
      .update(sizingRequests)
      .set({
        archivedAt: null,
        archivedById: null,
      })
      .where(eq(sizingRequests.id, requestId));
  }

  revalidatePath(`/dashboard/${requestId}`);
  revalidatePath("/dashboard");
  return { ok: true };
}

/**
 * Reopen a submitted request so the customer can correct answers and resubmit.
 * Keeps the current BOM visible until the new submission replaces it (then archived to version history).
 */
export async function reopenForResubmitAction(
  requestId: string,
  note?: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const loaded = await loadOwnedOrSeRequest(requestId);
  if (!loaded.ok) return { ok: false, error: loaded.error };
  if (loaded.request.status !== "submitted") {
    return { ok: false, error: "Only submitted requests can be reopened." };
  }
  if (loaded.request.archivedAt) {
    return { ok: false, error: "Unarchive before reopening for resubmit." };
  }

  const body = note?.trim();
  if (body && loaded.canViewAll) {
    await appendReviewNoteToRequest(requestId, loaded, body);
  } else if (body && !loaded.canViewAll) {
    // AM note becomes the flagged note context for the reopen.
  }

  if (isDemoMode()) {
    const req = await demoStore.sizingRequests.findById(requestId);
    if (req) {
      req.status = "pending";
      req.reviewStatus = "needs_changes";
      if (body && !loaded.canViewAll) {
        req.flaggedNote = body;
      }
    }
  } else {
    await getDb()
      .update(sizingRequests)
      .set({
        status: "pending",
        reviewStatus: "needs_changes",
        ...(body && !loaded.canViewAll ? { flaggedNote: body } : {}),
      })
      .where(eq(sizingRequests.id, requestId));
  }

  revalidatePath(`/dashboard/${requestId}`);
  revalidatePath("/dashboard");
  return { ok: true };
}

/**
 * SE applies corrected answers and recalculates the BOM, archiving the prior version.
 */
export async function applySeCorrectionAction(
  requestId: string,
  payloadJson: string,
  note?: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const loaded = await loadOwnedOrSeRequest(requestId);
  if (!loaded.ok) return { ok: false, error: loaded.error };
  if (!loaded.canViewAll) {
    return { ok: false, error: "Only sales engineers can apply corrections." };
  }
  if (loaded.request.archivedAt) {
    return { ok: false, error: "Unarchive before correcting." };
  }

  let raw: unknown;
  try {
    raw = JSON.parse(payloadJson);
  } catch {
    return { ok: false, error: "Invalid correction payload." };
  }

  const parsed = sizingSubmissionSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: "Correction failed validation." };
  }

  const answers = inputToSubmissionAnswers(parsed.data);
  const recommendation = await calculateSubmission(
    answers,
    loaded.request.label,
  );

  const body =
    note?.trim() ||
    "SE applied an answer correction and recalculated the recommendation.";

  if (isDemoMode()) {
    const existing = await demoStore.submissions.findByRequestId(requestId);
    if (!existing) {
      return { ok: false, error: "No submission to correct." };
    }
    await archiveCurrentSubmission({
      requestId,
      source: "se_correction",
      createdById: loaded.userId,
    });
    await demoStore.submissions.update(requestId, {
      answers,
      recommendation,
      version: (existing.version ?? 1) + 1,
    });
    const req = await demoStore.sizingRequests.findById(requestId);
    if (req) {
      req.status = "submitted";
      req.reviewStatus = "reviewed";
      req.reviewedAt = new Date();
      req.reviewedById = loaded.userId;
    }
  } else {
    const [existing] = await getDb()
      .select()
      .from(submissions)
      .where(eq(submissions.requestId, requestId))
      .limit(1);
    if (!existing) {
      return { ok: false, error: "No submission to correct." };
    }
    await archiveCurrentSubmission({
      requestId,
      source: "se_correction",
      createdById: loaded.userId,
    });
    await getDb()
      .update(submissions)
      .set({
        answers,
        recommendation,
        version: existing.version + 1,
        submittedAt: new Date(),
      })
      .where(eq(submissions.id, existing.id));
    await getDb()
      .update(sizingRequests)
      .set({
        status: "submitted",
        reviewStatus: "reviewed",
        reviewedAt: new Date(),
        reviewedById: loaded.userId,
      })
      .where(eq(sizingRequests.id, requestId));
  }

  await appendReviewNoteToRequest(requestId, loaded, body);

  await createReviewStatusNotifications({
    createdById: loaded.request.createdById,
    label: loaded.request.label,
    requestId,
    status: "reviewed",
    note: body,
  });

  revalidatePath(`/dashboard/${requestId}`);
  revalidatePath("/dashboard");
  return { ok: true };
}
