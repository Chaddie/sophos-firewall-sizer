"use server";

import { auth } from "@/lib/auth";
import { hasSePrivileges } from "@/lib/auth-utils";
import { getDb } from "@/lib/db";
import { demoStore, isDemoMode } from "@/lib/db/demo-store";
import { ensureDemoSeed } from "@/lib/db/demo-seed";
import { sizingRequests, submissions } from "@/lib/db/schema";
import {
  calculateSubmission,
  inputToSubmissionAnswers,
} from "@/lib/sizing/submission-engine";
import { sizingSubmissionSchema } from "@/lib/validations";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { randomUUID } from "crypto";

function isInternalRequest(request: {
  source?: string | null;
}): boolean {
  return request.source === "internal";
}

export async function createInternalSizingRequest(
  _prev: { error?: Record<string, string[]> } | null,
  formData: FormData,
) {
  const session = await auth();
  if (!session?.user?.id || !hasSePrivileges(session.user.role)) {
    throw new Error("Unauthorized");
  }

  const label = String(formData.get("label") ?? "").trim();
  if (!label || label.length < 2) {
    return { error: { label: ["Enter a deal or company label"] } };
  }
  if (label.length > 120) {
    return { error: { label: ["Label is too long"] } };
  }

  const slug = `internal-${randomUUID().replace(/-/g, "").slice(0, 12)}`;

  if (isDemoMode()) {
    await ensureDemoSeed();
    const request = await demoStore.sizingRequests.create({
      slug,
      label,
      status: "pending",
      createdById: session.user.id,
      alignedSeId: session.user.id,
      contactName: null,
      contactEmail: null,
      expiresAt: null,
      source: "internal",
      visibility: "private",
    });
    revalidatePath("/dashboard");
    redirect(`/dashboard/internal/${request.id}`);
  }

  const [request] = await getDb()
    .insert(sizingRequests)
    .values({
      slug,
      label,
      createdById: session.user.id,
      alignedSeId: session.user.id,
      contactName: null,
      contactEmail: null,
      expiresAt: null,
      source: "internal",
      visibility: "private",
    })
    .returning();

  revalidatePath("/dashboard");
  redirect(`/dashboard/internal/${request.id}`);
}

export async function submitInternalSizingAction(
  requestId: string,
  payloadJson: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const session = await auth();
  if (!session?.user?.id || !hasSePrivileges(session.user.role)) {
    return { ok: false, error: "Only sales engineers can submit internal sizing." };
  }

  let raw: unknown;
  try {
    raw = JSON.parse(payloadJson);
  } catch {
    return { ok: false, error: "Invalid submission payload." };
  }

  const parsed = sizingSubmissionSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: "Submission failed validation." };
  }

  const answers = inputToSubmissionAnswers(parsed.data);

  if (isDemoMode()) {
    await ensureDemoSeed();
    const request = await demoStore.sizingRequests.findById(requestId);
    if (!request || !isInternalRequest(request)) {
      return { ok: false, error: "Internal sizing request not found." };
    }
    if (request.archivedAt) {
      return { ok: false, error: "Unarchive before submitting." };
    }
    const existing = await demoStore.submissions.findByRequestId(requestId);
    if (existing) {
      return { ok: false, error: "This internal size already has a submission." };
    }

    const recommendation = await calculateSubmission(answers, request.label);
    await demoStore.submissions.create({
      requestId,
      answers,
      recommendation,
    });
    request.status = "submitted";
    request.reviewStatus = "reviewed";
    request.reviewedAt = new Date();
    request.reviewedById = session.user.id;

    revalidatePath(`/dashboard/${requestId}`);
    revalidatePath("/dashboard");
    return { ok: true };
  }

  const [request] = await getDb()
    .select()
    .from(sizingRequests)
    .where(eq(sizingRequests.id, requestId))
    .limit(1);

  if (!request || !isInternalRequest(request)) {
    return { ok: false, error: "Internal sizing request not found." };
  }
  if (request.archivedAt) {
    return { ok: false, error: "Unarchive before submitting." };
  }

  const [existing] = await getDb()
    .select({ id: submissions.id })
    .from(submissions)
    .where(eq(submissions.requestId, requestId))
    .limit(1);
  if (existing) {
    return { ok: false, error: "This internal size already has a submission." };
  }

  const recommendation = await calculateSubmission(answers, request.label);

  await getDb().insert(submissions).values({
    requestId,
    answers,
    recommendation,
  });
  await getDb()
    .update(sizingRequests)
    .set({
      status: "submitted",
      reviewStatus: "reviewed",
      reviewedAt: new Date(),
      reviewedById: session.user.id,
    })
    .where(eq(sizingRequests.id, requestId));

  revalidatePath(`/dashboard/${requestId}`);
  revalidatePath("/dashboard");
  return { ok: true };
}

export async function shareInternalRequestAction(
  requestId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const session = await auth();
  if (!session?.user?.id || !hasSePrivileges(session.user.role)) {
    return { ok: false, error: "Only sales engineers can share internal sizing." };
  }

  if (isDemoMode()) {
    await ensureDemoSeed();
    const request = await demoStore.sizingRequests.findById(requestId);
    if (!request || !isInternalRequest(request)) {
      return { ok: false, error: "Internal sizing request not found." };
    }
    request.visibility = "shared";
    revalidatePath(`/dashboard/${requestId}`);
    revalidatePath("/dashboard");
    return { ok: true };
  }

  const [request] = await getDb()
    .select()
    .from(sizingRequests)
    .where(eq(sizingRequests.id, requestId))
    .limit(1);

  if (!request || !isInternalRequest(request)) {
    return { ok: false, error: "Internal sizing request not found." };
  }

  await getDb()
    .update(sizingRequests)
    .set({ visibility: "shared" })
    .where(eq(sizingRequests.id, requestId));

  revalidatePath(`/dashboard/${requestId}`);
  revalidatePath("/dashboard");
  return { ok: true };
}
