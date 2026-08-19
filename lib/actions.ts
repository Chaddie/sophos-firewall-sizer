"use server";

import { auth } from "@/lib/auth";
import { isSalesEngineer } from "@/lib/auth-utils";
import { getDb } from "@/lib/db";
import { demoStore, isDemoMode } from "@/lib/db/demo-store";
import { ensureDemoSeed } from "@/lib/db/demo-seed";
import { sizingRequests, submissions, users } from "@/lib/db/schema";
import {
  calculateSubmission,
  inputToSubmissionAnswers,
  normalizeStoredRecommendation,
} from "@/lib/sizing/submission-engine";
import { isV2Answers } from "@/lib/sizing/types";
import { createRequestSchema, sizingSubmissionSchema } from "@/lib/validations";
import { and, desc, eq, ilike, or } from "drizzle-orm";
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
    label: formData.get("label"),
    slug: formData.get("slug"),
    contactName: formData.get("contactName") || undefined,
    contactEmail: formData.get("contactEmail"),
    expiresAt: formData.get("expiresAt") || undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors };
  }

  const { label, slug, contactName, contactEmail, expiresAt } = parsed.data;

  if (isDemoMode()) {
    await ensureDemoSeed();
    const existing = await demoStore.sizingRequests.findBySlug(slug);
    if (existing) {
      return { error: { slug: ["This URL slug is already in use"] } };
    }
    const request = await demoStore.sizingRequests.create({
      slug,
      label,
      status: "pending",
      createdById: session.user.id,
      contactName: contactName || null,
      contactEmail,
      expiresAt: expiresAt ? new Date(expiresAt) : null,
    });
    revalidatePath("/dashboard");
    redirect(`/dashboard/${request.id}`);
  }

  const existing = await getDb()
    .select({ id: sizingRequests.id })
    .from(sizingRequests)
    .where(eq(sizingRequests.slug, slug))
    .limit(1);

  if (existing.length > 0) {
    return { error: { slug: ["This URL slug is already in use"] } };
  }

  const [request] = await getDb()
    .insert(sizingRequests)
    .values({
      slug,
      label,
      createdById: session.user.id,
      contactName: contactName || null,
      contactEmail,
      expiresAt: expiresAt ? new Date(expiresAt) : null,
    })
    .returning();

  revalidatePath("/dashboard");
  redirect(`/dashboard/${request.id}`);
}

export async function submitSizingForm(slug: string, payloadJson: string) {
  let raw: unknown;
  try {
    raw = JSON.parse(payloadJson);
  } catch {
    return { error: { _form: ["Invalid submission payload"] } };
  }

  const parsed = sizingSubmissionSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors };
  }

  const answers = inputToSubmissionAnswers(parsed.data);

  let companyLabel = slug;
  if (isDemoMode()) {
    await ensureDemoSeed();
    const request = await demoStore.sizingRequests.findBySlug(slug);
    if (request) companyLabel = request.label;
  } else {
    const [request] = await getDb()
      .select({ label: sizingRequests.label })
      .from(sizingRequests)
      .where(eq(sizingRequests.slug, slug))
      .limit(1);
    if (request) companyLabel = request.label;
  }

  const recommendation = await calculateSubmission(answers, companyLabel);

  if (isDemoMode()) {
    await ensureDemoSeed();
    const request = await demoStore.sizingRequests.findBySlug(slug);
    if (!request) {
      return { error: { _form: ["Sizing request not found"] } };
    }
    if (request.status === "submitted") {
      return { error: { _form: ["This form has already been submitted"] } };
    }
    if (request.expiresAt && request.expiresAt < new Date()) {
      return { error: { _form: ["This sizing link has expired"] } };
    }
    await demoStore.submissions.create({
      requestId: request.id,
      answers,
      recommendation,
    });
    await demoStore.sizingRequests.updateStatus(request.id, "submitted");
    revalidatePath(`/dashboard/${request.id}`);
    revalidatePath("/dashboard");
    return { success: true as const };
  }

  const [request] = await getDb()
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

  await getDb().insert(submissions).values({
    requestId: request.id,
    answers,
    recommendation,
  });

  await getDb()
    .update(sizingRequests)
    .set({ status: "submitted" })
    .where(eq(sizingRequests.id, request.id));

  revalidatePath(`/dashboard/${request.id}`);
  revalidatePath("/dashboard");
  return { success: true as const };
}

export type DashboardRequestRow = {
  id: string;
  slug: string;
  label: string;
  status: "pending" | "submitted";
  createdAt: Date;
  expiresAt: Date | null;
  contactName?: string | null;
  contactEmail?: string | null;
  createdByName?: string;
  createdByEmail?: string;
  createdByRole?: string;
};

async function enrichDemoRequests(
  requests: Awaited<ReturnType<typeof demoStore.sizingRequests.listAll>>,
  showCreator: boolean,
): Promise<DashboardRequestRow[]> {
  const rows: DashboardRequestRow[] = [];
  for (const req of requests) {
    const row: DashboardRequestRow = { ...req };
    if (showCreator) {
      const creator = await demoStore.users.findById(req.createdById);
      row.createdByName = creator?.name;
      row.createdByEmail = creator?.email;
      row.createdByRole = creator?.role;
    }
    rows.push(row);
  }
  return rows;
}

function matchesCreatorQuery(
  name: string | undefined,
  email: string | undefined,
  query: string,
): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return Boolean(
    name?.toLowerCase().includes(q) || email?.toLowerCase().includes(q),
  );
}

export async function getDashboardRequests(opts?: {
  /** SE only: when true (default), limit to the signed-in user's requests. */
  mineOnly?: boolean;
  /** SE only: filter by AM/partner name or email (substring, case-insensitive). */
  creatorQuery?: string;
}): Promise<DashboardRequestRow[]> {
  const session = await auth();
  if (!session?.user?.id) return [];

  const isSe = isSalesEngineer(session.user.role);
  const mineOnly = isSe ? (opts?.mineOnly ?? true) : true;
  const showCreator = isSe;
  const creatorQuery = isSe ? (opts?.creatorQuery?.trim() ?? "") : "";
  const escapedQuery = creatorQuery.replace(/[%_\\]/g, "\\$&");

  if (isDemoMode()) {
    await ensureDemoSeed();
    const requests = mineOnly
      ? await demoStore.sizingRequests.listByUser(session.user.id)
      : await demoStore.sizingRequests.listAll();
    const enriched = await enrichDemoRequests(requests, showCreator);
    if (!creatorQuery) return enriched;
    return enriched.filter((row) =>
      matchesCreatorQuery(row.createdByName, row.createdByEmail, creatorQuery),
    );
  }

  const creatorFilter =
    escapedQuery.length > 0
      ? or(
          ilike(users.name, `%${escapedQuery}%`),
          ilike(users.email, `%${escapedQuery}%`),
        )
      : undefined;

  if (showCreator && !mineOnly) {
    const query = getDb()
      .select({
        id: sizingRequests.id,
        slug: sizingRequests.slug,
        label: sizingRequests.label,
        status: sizingRequests.status,
        createdAt: sizingRequests.createdAt,
        expiresAt: sizingRequests.expiresAt,
        contactName: sizingRequests.contactName,
        contactEmail: sizingRequests.contactEmail,
        createdByName: users.name,
        createdByEmail: users.email,
        createdByRole: users.role,
      })
      .from(sizingRequests)
      .innerJoin(users, eq(sizingRequests.createdById, users.id));

    const rows = creatorFilter
      ? await query.where(creatorFilter).orderBy(desc(sizingRequests.createdAt))
      : await query.orderBy(desc(sizingRequests.createdAt));
    return rows;
  }

  if (showCreator && mineOnly) {
    const rows = await getDb()
      .select({
        id: sizingRequests.id,
        slug: sizingRequests.slug,
        label: sizingRequests.label,
        status: sizingRequests.status,
        createdAt: sizingRequests.createdAt,
        expiresAt: sizingRequests.expiresAt,
        contactName: sizingRequests.contactName,
        contactEmail: sizingRequests.contactEmail,
        createdByName: users.name,
        createdByEmail: users.email,
        createdByRole: users.role,
      })
      .from(sizingRequests)
      .innerJoin(users, eq(sizingRequests.createdById, users.id))
      .where(
        creatorFilter
          ? and(eq(sizingRequests.createdById, session.user.id), creatorFilter)
          : eq(sizingRequests.createdById, session.user.id),
      )
      .orderBy(desc(sizingRequests.createdAt));
    return rows;
  }

  return getDb()
    .select({
      id: sizingRequests.id,
      slug: sizingRequests.slug,
      label: sizingRequests.label,
      status: sizingRequests.status,
      createdAt: sizingRequests.createdAt,
      expiresAt: sizingRequests.expiresAt,
      contactName: sizingRequests.contactName,
      contactEmail: sizingRequests.contactEmail,
    })
    .from(sizingRequests)
    .where(eq(sizingRequests.createdById, session.user.id))
    .orderBy(desc(sizingRequests.createdAt));
}

export async function getRequestDetail(id: string) {
  const session = await auth();
  if (!session?.user?.id) return null;

  const canViewAll = isSalesEngineer(session.user.role);

  if (isDemoMode()) {
    await ensureDemoSeed();
    const request = await demoStore.sizingRequests.findById(id);
    if (!request) return null;
    if (!canViewAll && request.createdById !== session.user.id) return null;

    const submission = await demoStore.submissions.findByRequestId(request.id);
    let creator: {
      name: string;
      email: string;
      role: string;
    } | null = null;
    if (canViewAll) {
      const user = await demoStore.users.findById(request.createdById);
      if (user) {
        creator = { name: user.name, email: user.email, role: user.role };
      }
    }

    if (submission) {
      const { recommendation, changed } = normalizeStoredRecommendation(
        submission.recommendation,
      );
      if (changed) {
        await demoStore.submissions.updateRecommendation(
          request.id,
          recommendation,
        );
        return {
          request,
          submission: { ...submission, recommendation },
          creator,
        };
      }
    }

    return { request, submission, creator };
  }

  const [request] = await getDb()
    .select()
    .from(sizingRequests)
    .where(eq(sizingRequests.id, id))
    .limit(1);

  if (!request) return null;
  if (!canViewAll && request.createdById !== session.user.id) return null;

  const [submission] = await getDb()
    .select()
    .from(submissions)
    .where(eq(submissions.requestId, request.id))
    .limit(1);

  let creator: { name: string; email: string; role: string } | null = null;
  if (canViewAll) {
    const [user] = await getDb()
      .select({ name: users.name, email: users.email, role: users.role })
      .from(users)
      .where(eq(users.id, request.createdById))
      .limit(1);
    if (user) creator = user;
  }

  if (submission) {
    const { recommendation, changed } = normalizeStoredRecommendation(
      submission.recommendation,
    );
    if (changed) {
      await getDb()
        .update(submissions)
        .set({ recommendation })
        .where(eq(submissions.id, submission.id));
      return {
        request,
        submission: { ...submission, recommendation },
        creator,
      };
    }
  }

  return {
    request,
    submission: submission ?? null,
    creator,
  };
}

export async function getPublicRequest(slug: string) {
  if (isDemoMode()) {
    await ensureDemoSeed();
    const request = await demoStore.sizingRequests.findBySlug(slug);
    if (!request) return null;
    return {
      id: request.id,
      slug: request.slug,
      label: request.label,
      status: request.status,
      expiresAt: request.expiresAt,
      hasContactGate: Boolean(request.contactEmail),
    };
  }

  const [request] = await getDb()
    .select({
      id: sizingRequests.id,
      slug: sizingRequests.slug,
      label: sizingRequests.label,
      status: sizingRequests.status,
      expiresAt: sizingRequests.expiresAt,
      contactEmail: sizingRequests.contactEmail,
    })
    .from(sizingRequests)
    .where(eq(sizingRequests.slug, slug))
    .limit(1);

  if (!request) return null;

  return {
    id: request.id,
    slug: request.slug,
    label: request.label,
    status: request.status,
    expiresAt: request.expiresAt,
    hasContactGate: Boolean(request.contactEmail),
  };
}

function emailDomain(email: string): string | null {
  const parts = email.trim().toLowerCase().split("@");
  return parts.length === 2 && parts[1] ? parts[1] : null;
}

export async function verifyRequestAccess(slug: string, email: string) {
  const normalizedDomain = emailDomain(email);
  if (!normalizedDomain) {
    return { error: "Please enter a valid email address" };
  }

  let contactEmail: string | null = null;

  if (isDemoMode()) {
    await ensureDemoSeed();
    const request = await demoStore.sizingRequests.findBySlug(slug);
    if (!request) return { error: "Sizing request not found" };
    contactEmail = request.contactEmail;
  } else {
    const [request] = await getDb()
      .select({ contactEmail: sizingRequests.contactEmail })
      .from(sizingRequests)
      .where(eq(sizingRequests.slug, slug))
      .limit(1);
    if (!request) return { error: "Sizing request not found" };
    contactEmail = request.contactEmail;
  }

  if (!contactEmail) {
    return { success: true as const };
  }

  if (emailDomain(contactEmail) !== normalizedDomain) {
    return {
      error:
        "That email domain doesn't match what we have on file for this link.",
    };
  }

  return { success: true as const };
}

export type SubmittedProductSummary = {
  firewall: boolean;
  switches: boolean;
  wireless: boolean;
};

export async function getSubmittedProductSummary(
  slug: string,
): Promise<SubmittedProductSummary | null> {
  if (isDemoMode()) {
    await ensureDemoSeed();
    const request = await demoStore.sizingRequests.findBySlug(slug);
    if (!request) return null;
    const submission = await demoStore.submissions.findByRequestId(request.id);
    if (!submission) return null;
    return summarizeProducts(submission.answers);
  }

  const [request] = await getDb()
    .select({ id: sizingRequests.id })
    .from(sizingRequests)
    .where(eq(sizingRequests.slug, slug))
    .limit(1);
  if (!request) return null;

  const [submission] = await getDb()
    .select({ answers: submissions.answers })
    .from(submissions)
    .where(eq(submissions.requestId, request.id))
    .limit(1);
  if (!submission) return null;

  return summarizeProducts(submission.answers);
}

function summarizeProducts(
  answers: Parameters<typeof isV2Answers>[0],
): SubmittedProductSummary {
  if (isV2Answers(answers)) {
    return {
      firewall: answers.sites.some((site) => Boolean(site.products.firewall)),
      switches: answers.sites.some((site) => Boolean(site.products.switches)),
      wireless: answers.sites.some((site) => Boolean(site.products.wireless)),
    };
  }

  return { firewall: true, switches: false, wireless: false };
}

export async function getSessionRole() {
  const session = await auth();
  return session?.user?.role ?? null;
}
