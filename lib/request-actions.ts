"use server";

import { auth } from "@/lib/auth";
import { hasSePrivileges, isAdmin } from "@/lib/auth-utils";
import { getDb } from "@/lib/db";
import { demoStore, isDemoMode } from "@/lib/db/demo-store";
import { sizingRequests } from "@/lib/db/schema";
import { createPendingSeReviewNotifications } from "@/lib/notifications";
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

export async function flagRequestForSeAction(
  requestId: string,
  note?: string,
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
  const reviewNote = note?.trim() || null;

  if (isDemoMode()) {
    const all = await demoStore.sizingRequests.listAll();
    const row = all.find((r) => r.id === requestId);
    if (row) {
      row.reviewStatus = status;
      row.reviewNote = reviewNote;
      row.reviewedAt = now;
      row.reviewedById = loaded.userId;
    }
  } else {
    await getDb()
      .update(sizingRequests)
      .set({
        reviewStatus: status,
        reviewNote,
        reviewedAt: now,
        reviewedById: loaded.userId,
      })
      .where(eq(sizingRequests.id, requestId));
  }

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
