"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { sizingRequests, submissions } from "@/lib/db/schema";
import { calculateRecommendation } from "@/lib/sizing/engine";
import type { SizingAnswers } from "@/lib/sizing/types";
import { createRequestSchema, sizingFormSchema } from "@/lib/validations";
import { and, desc, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function createSizingRequest(
  _prev: { error?: Record<string, string[]> } | null,
  formData: FormData,
) {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  const parsed = createRequestSchema.safeParse({
    label: formData.get("label") || undefined,
    slug: formData.get("slug"),
    expiresAt: formData.get("expiresAt") || undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors };
  }

  const { label, slug, expiresAt } = parsed.data;

  const existing = await db
    .select({ id: sizingRequests.id })
    .from(sizingRequests)
    .where(eq(sizingRequests.slug, slug))
    .limit(1);

  if (existing.length > 0) {
    return { error: { slug: ["This URL slug is already in use"] } };
  }

  const [request] = await db
    .insert(sizingRequests)
    .values({
      slug,
      label: label || null,
      createdById: session.user.id,
      expiresAt: expiresAt ? new Date(expiresAt) : null,
    })
    .returning();

  revalidatePath("/dashboard");
  redirect(`/dashboard/${request.id}`);
}

export async function submitSizingForm(slug: string, formData: FormData) {
  const raw = {
    environment: formData.get("environment"),
    totalWanBandwidthMbps: formData.get("totalWanBandwidthMbps"),
    averageWanConsumptionMbps: formData.get("averageWanConsumptionMbps"),
    wanGrowth3yrPercent: formData.get("wanGrowth3yrPercent"),
    anticipatedPeakGrowthMbps: formData.get("anticipatedPeakGrowthMbps"),
    anticipatedAverageGrowthMbps: formData.get("anticipatedAverageGrowthMbps"),
    protection: formData.get("protection"),
    vpnEnabled: formData.get("vpnEnabled") === "true",
    ipsecTunnels: formData.get("ipsecTunnels") || undefined,
    sslVpnTunnels: formData.get("sslVpnTunnels") || undefined,
    peakVpnThroughputMbps: formData.get("peakVpnThroughputMbps") || undefined,
    userAuthEnabled: formData.get("userAuthEnabled") === "true",
    authUserCount: formData.get("authUserCount") || undefined,
    haRequired: formData.get("haRequired") === "true",
    customerName: formData.get("customerName") || undefined,
    customerEmail: formData.get("customerEmail") || undefined,
  };

  const parsed = sizingFormSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors };
  }

  const [request] = await db
    .select()
    .from(sizingRequests)
    .where(eq(sizingRequests.slug, slug))
    .limit(1);

  if (!request) {
    return { error: { _form: ["Sizing request not found"] } };
  }

  if (request.status === "submitted") {
    return { error: { _form: ["This form has already been submitted"] } };
  }

  if (request.expiresAt && request.expiresAt < new Date()) {
    return { error: { _form: ["This sizing link has expired"] } };
  }

  const answers: SizingAnswers = {
    ...parsed.data,
    customerEmail: parsed.data.customerEmail || undefined,
  };

  const recommendation = calculateRecommendation(answers);

  await db.insert(submissions).values({
    requestId: request.id,
    answers,
    recommendation,
  });

  await db
    .update(sizingRequests)
    .set({ status: "submitted" })
    .where(eq(sizingRequests.id, request.id));

  revalidatePath(`/dashboard/${request.id}`);
  revalidatePath("/dashboard");
  return { success: true as const };
}

export async function getDashboardRequests() {
  const session = await auth();
  if (!session?.user?.id) return [];

  return db
    .select({
      id: sizingRequests.id,
      slug: sizingRequests.slug,
      label: sizingRequests.label,
      status: sizingRequests.status,
      createdAt: sizingRequests.createdAt,
      expiresAt: sizingRequests.expiresAt,
    })
    .from(sizingRequests)
    .where(eq(sizingRequests.createdById, session.user.id))
    .orderBy(desc(sizingRequests.createdAt));
}

export async function getRequestDetail(id: string) {
  const session = await auth();
  if (!session?.user?.id) return null;

  const [request] = await db
    .select()
    .from(sizingRequests)
    .where(
      and(
        eq(sizingRequests.id, id),
        eq(sizingRequests.createdById, session.user.id),
      ),
    )
    .limit(1);

  if (!request) return null;

  const [submission] = await db
    .select()
    .from(submissions)
    .where(eq(submissions.requestId, request.id))
    .limit(1);

  return { request, submission: submission ?? null };
}

export async function getPublicRequest(slug: string) {
  const [request] = await db
    .select({
      id: sizingRequests.id,
      slug: sizingRequests.slug,
      label: sizingRequests.label,
      status: sizingRequests.status,
      expiresAt: sizingRequests.expiresAt,
    })
    .from(sizingRequests)
    .where(eq(sizingRequests.slug, slug))
    .limit(1);

  return request ?? null;
}
