"use server";

import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { demoStore, isDemoMode } from "@/lib/db/demo-store";
import { sizingDrafts, sizingRequests } from "@/lib/db/schema";

export async function saveSizingDraftAction(
  slug: string,
  draftJson: Record<string, unknown>,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (isDemoMode()) {
    const request = await demoStore.sizingRequests.findBySlug(slug);
    if (!request) return { ok: false, error: "Request not found" };
    if (request.status === "submitted") {
      return { ok: false, error: "Already submitted" };
    }
    await demoStore.sizingDrafts.upsert(request.id, draftJson);
    return { ok: true };
  }

  const [request] = await getDb()
    .select({ id: sizingRequests.id, status: sizingRequests.status })
    .from(sizingRequests)
    .where(eq(sizingRequests.slug, slug))
    .limit(1);
  if (!request) return { ok: false, error: "Request not found" };
  if (request.status === "submitted") {
    return { ok: false, error: "Already submitted" };
  }

  await getDb()
    .insert(sizingDrafts)
    .values({
      requestId: request.id,
      draftJson,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: sizingDrafts.requestId,
      set: {
        draftJson,
        updatedAt: new Date(),
      },
    });

  return { ok: true };
}

export async function loadSizingDraftAction(slug: string): Promise<{
  draftJson: Record<string, unknown>;
  updatedAt: Date;
} | null> {
  if (isDemoMode()) {
    const request = await demoStore.sizingRequests.findBySlug(slug);
    if (!request) return null;
    const draft = await demoStore.sizingDrafts.get(request.id);
    if (!draft) return null;
    return { draftJson: draft.draftJson, updatedAt: draft.updatedAt };
  }

  const [request] = await getDb()
    .select({ id: sizingRequests.id })
    .from(sizingRequests)
    .where(eq(sizingRequests.slug, slug))
    .limit(1);
  if (!request) return null;

  const [draft] = await getDb()
    .select()
    .from(sizingDrafts)
    .where(eq(sizingDrafts.requestId, request.id))
    .limit(1);
  if (!draft) return null;
  return { draftJson: draft.draftJson, updatedAt: draft.updatedAt };
}

export async function clearSizingDraftAction(slug: string): Promise<void> {
  if (isDemoMode()) {
    const request = await demoStore.sizingRequests.findBySlug(slug);
    if (request) await demoStore.sizingDrafts.delete(request.id);
    return;
  }

  const [request] = await getDb()
    .select({ id: sizingRequests.id })
    .from(sizingRequests)
    .where(eq(sizingRequests.slug, slug))
    .limit(1);
  if (!request) return;

  await getDb()
    .delete(sizingDrafts)
    .where(eq(sizingDrafts.requestId, request.id));
}
