"use server";

import { auth } from "@/lib/auth";
import { hasSePrivileges } from "@/lib/auth-utils";
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
import {
  createSubmissionInAppNotifications,
  notifyAlignedSeOfRequestCreated,
  notifyCreatorOfSubmission,
} from "@/lib/notifications";
import { and, desc, eq, ilike, inArray, isNotNull, isNull, or } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export type AlignableSeOption = {
  id: string;
  name: string;
  email: string;
};

/** SE + admin users that can be selected as the aligned SE on a request. */
export async function listAlignableSalesEngineers(): Promise<
  AlignableSeOption[]
> {
  const session = await auth();
  if (!session?.user?.id) return [];

  if (isDemoMode()) {
    await ensureDemoSeed();
    const staff = await demoStore.users.listByRoles([
      "sales_engineer",
      "admin",
    ]);
    return staff
      .map((u) => ({ id: u.id, name: u.name, email: u.email }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  const rows = await getDb()
    .select({ id: users.id, name: users.name, email: users.email })
    .from(users)
    .where(inArray(users.role, ["sales_engineer", "admin"]))
    .orderBy(users.name);
  return rows;
}

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
    alignedSeId: formData.get("alignedSeId") || undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors };
  }

  const { label, slug, contactName, contactEmail, expiresAt } = parsed.data;
  const alignedSeRaw = parsed.data.alignedSeId?.trim() || "";
  const role = session.user.role;
  const requiresAlignedSe = !hasSePrivileges(role);

  if (requiresAlignedSe && !alignedSeRaw) {
    return {
      error: {
        alignedSeId: ["Select the Sales Engineer aligned to this opportunity"],
      },
    };
  }

  const alignedSeId: string | null = alignedSeRaw || null;

  if (alignedSeId) {
    const alignable = await listAlignableSalesEngineers();
    if (!alignable.some((se) => se.id === alignedSeId)) {
      return {
        error: { alignedSeId: ["Select a valid Sales Engineer"] },
      };
    }
  }

  const creatorName = session.user.name?.trim() || "Account Manager";
  const creatorEmail = session.user.email ?? null;

  if (isDemoMode()) {
    await ensureDemoSeed();
    const existing = await demoStore.sizingRequests.findBySlug(slug);
    if (existing) {
      return { error: { slug: ["This link name is already in use"] } };
    }
    const request = await demoStore.sizingRequests.create({
      slug,
      label,
      status: "pending",
      createdById: session.user.id,
      alignedSeId,
      contactName: contactName || null,
      contactEmail,
      expiresAt: expiresAt ? new Date(expiresAt) : null,
    });
    if (alignedSeId) {
      await notifyAlignedSeOfRequestCreated({
        alignedSeId,
        label,
        requestId: request.id,
        creatorName,
        creatorEmail,
      });
    }
    revalidatePath("/dashboard");
    redirect(`/dashboard/${request.id}`);
  }

  const existing = await getDb()
    .select({ id: sizingRequests.id })
    .from(sizingRequests)
    .where(eq(sizingRequests.slug, slug))
    .limit(1);

  if (existing.length > 0) {
    return { error: { slug: ["This link name is already in use"] } };
  }

  const [request] = await getDb()
    .insert(sizingRequests)
    .values({
      slug,
      label,
      createdById: session.user.id,
      alignedSeId,
      contactName: contactName || null,
      contactEmail,
      expiresAt: expiresAt ? new Date(expiresAt) : null,
    })
    .returning();

  if (alignedSeId) {
    await notifyAlignedSeOfRequestCreated({
      alignedSeId,
      label,
      requestId: request.id,
      creatorName,
      creatorEmail,
    });
  }

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
    if (request.archivedAt) {
      return { error: { _form: ["This sizing link has been archived"] } };
    }
    if (request.expiresAt && request.expiresAt < new Date()) {
      return { error: { _form: ["This sizing link has expired"] } };
    }
    if (request.status === "submitted") {
      return { error: { _form: ["This form has already been submitted"] } };
    }

    const existing = await demoStore.submissions.findByRequestId(request.id);
    let version = 1;
    if (existing) {
      const { archiveCurrentSubmission } = await import(
        "@/lib/sizing/submission-versions"
      );
      await archiveCurrentSubmission({
        requestId: request.id,
        source: "customer_resubmit",
      });
      version = (existing.version ?? 1) + 1;
      await demoStore.submissions.update(request.id, {
        answers,
        recommendation,
        version,
      });
    } else {
      await demoStore.submissions.create({
        requestId: request.id,
        answers,
        recommendation,
        version: 1,
      });
    }

    await demoStore.sizingRequests.updateStatus(request.id, "submitted");
    const req = await demoStore.sizingRequests.findById(request.id);
    if (req) {
      req.reviewStatus = null;
      req.reviewedAt = null;
      req.reviewedById = null;
    }

    const creator = await demoStore.users.findById(request.createdById);
    if (creator?.email) {
      await notifyCreatorOfSubmission({
        toEmail: creator.email,
        label: request.label,
        slug: request.slug,
        requestId: request.id,
      });
    }
    await createSubmissionInAppNotifications({
      createdById: request.createdById,
      label: request.label,
      requestId: request.id,
      alignedSeId: request.alignedSeId ?? null,
    });
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

  if (request.archivedAt) {
    return { error: { _form: ["This sizing link has been archived"] } };
  }

  if (request.expiresAt && request.expiresAt < new Date()) {
    return { error: { _form: ["This sizing link has expired"] } };
  }

  const [existing] = await getDb()
    .select()
    .from(submissions)
    .where(eq(submissions.requestId, request.id))
    .limit(1);

  if (existing) {
    const { archiveCurrentSubmission } = await import(
      "@/lib/sizing/submission-versions"
    );
    await archiveCurrentSubmission({
      requestId: request.id,
      source: "customer_resubmit",
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
  } else {
    await getDb().insert(submissions).values({
      requestId: request.id,
      answers,
      recommendation,
      version: 1,
    });
  }

  await getDb()
    .update(sizingRequests)
    .set({
      status: "submitted",
      reviewStatus: null,
      reviewedAt: null,
      reviewedById: null,
    })
    .where(eq(sizingRequests.id, request.id));

  const [creator] = await getDb()
    .select({ email: users.email })
    .from(users)
    .where(eq(users.id, request.createdById))
    .limit(1);
  if (creator?.email) {
    await notifyCreatorOfSubmission({
      toEmail: creator.email,
      label: request.label,
      slug: request.slug,
      requestId: request.id,
    });
  }

  await createSubmissionInAppNotifications({
    createdById: request.createdById,
    label: request.label,
    requestId: request.id,
    alignedSeId: request.alignedSeId ?? null,
  });

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
  reviewStatus?: string | null;
  opportunityId?: string | null;
  archivedAt?: Date | null;
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

function matchesDashboardQuery(
  row: {
    label?: string;
    slug?: string;
    contactName?: string | null;
    contactEmail?: string | null;
    createdByName?: string;
    createdByEmail?: string;
  },
  query: string,
): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return Boolean(
    row.label?.toLowerCase().includes(q) ||
      row.slug?.toLowerCase().includes(q) ||
      row.contactName?.toLowerCase().includes(q) ||
      row.contactEmail?.toLowerCase().includes(q) ||
      row.createdByName?.toLowerCase().includes(q) ||
      row.createdByEmail?.toLowerCase().includes(q),
  );
}

export async function getDashboardRequests(opts?: {
  /** SE only: when true (default), limit to the signed-in user's requests. */
  mineOnly?: boolean;
  /** SE only: filter by creator, customer label, contact, or slug. */
  creatorQuery?: string;
  /** Filter by request status. */
  status?: "pending" | "submitted" | "all";
  /**
   * SE review queue filter. `flagged` = pending SE review.
   * `needs_changes` / `reviewed` match review_status. `any` = no filter.
   */
  review?: "any" | "flagged" | "needs_changes" | "reviewed";
  /**
   * Archive visibility. Default `active` hides archived rows.
   * `archived` shows only archived; `all` shows both (admin typically).
   */
  archive?: "active" | "archived" | "all";
}): Promise<DashboardRequestRow[]> {
  const session = await auth();
  if (!session?.user?.id) return [];

  const isSe = hasSePrivileges(session.user.role);
  const mineOnly = isSe ? (opts?.mineOnly ?? true) : true;
  const showCreator = isSe;
  const creatorQuery = isSe ? (opts?.creatorQuery?.trim() ?? "") : "";
  const statusFilter =
    opts?.status && opts.status !== "all" ? opts.status : undefined;
  const reviewFilter =
    opts?.review && opts.review !== "any" ? opts.review : undefined;
  const archiveFilter = opts?.archive ?? "active";
  const escapedQuery = creatorQuery.replace(/[%_\\]/g, "\\$&");

  function matchesArchive(row: { archivedAt?: Date | null }) {
    if (archiveFilter === "all") return true;
    if (archiveFilter === "archived") return Boolean(row.archivedAt);
    return !row.archivedAt;
  }

  function matchesReview(row: { reviewStatus?: string | null }) {
    if (!reviewFilter) return true;
    return row.reviewStatus === reviewFilter;
  }

  if (isDemoMode()) {
    await ensureDemoSeed();
    const requests = mineOnly
      ? await demoStore.sizingRequests.listByUser(session.user.id)
      : await demoStore.sizingRequests.listAll();
    let enriched = await enrichDemoRequests(requests, showCreator);
    enriched = enriched.filter(matchesArchive);
    enriched = enriched.filter(matchesReview);
    if (statusFilter) {
      enriched = enriched.filter((r) => r.status === statusFilter);
    }
    if (!creatorQuery) return enriched;
    return enriched.filter((row) => matchesDashboardQuery(row, creatorQuery));
  }

  const searchFilter =
    escapedQuery.length > 0
      ? or(
          ilike(users.name, `%${escapedQuery}%`),
          ilike(users.email, `%${escapedQuery}%`),
          ilike(sizingRequests.label, `%${escapedQuery}%`),
          ilike(sizingRequests.slug, `%${escapedQuery}%`),
          ilike(sizingRequests.contactName, `%${escapedQuery}%`),
          ilike(sizingRequests.contactEmail, `%${escapedQuery}%`),
        )
      : undefined;

  const statusClause = statusFilter
    ? eq(sizingRequests.status, statusFilter)
    : undefined;

  const reviewClause = reviewFilter
    ? eq(sizingRequests.reviewStatus, reviewFilter)
    : undefined;

  const archiveClause =
    archiveFilter === "archived"
      ? isNotNull(sizingRequests.archivedAt)
      : archiveFilter === "all"
        ? undefined
        : isNull(sizingRequests.archivedAt);

  if (showCreator) {
    const conditions = [];
    if (mineOnly) conditions.push(eq(sizingRequests.createdById, session.user.id));
    if (searchFilter) conditions.push(searchFilter);
    if (statusClause) conditions.push(statusClause);
    if (reviewClause) conditions.push(reviewClause);
    if (archiveClause) conditions.push(archiveClause);

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
        reviewStatus: sizingRequests.reviewStatus,
        opportunityId: sizingRequests.opportunityId,
        archivedAt: sizingRequests.archivedAt,
      })
      .from(sizingRequests)
      .innerJoin(users, eq(sizingRequests.createdById, users.id));

    const rows =
      conditions.length > 0
        ? await query
            .where(and(...conditions))
            .orderBy(desc(sizingRequests.createdAt))
        : await query.orderBy(desc(sizingRequests.createdAt));
    return rows;
  }

  const amConditions = [eq(sizingRequests.createdById, session.user.id)];
  if (statusClause) amConditions.push(statusClause);
  if (reviewClause) amConditions.push(reviewClause);
  if (archiveClause) amConditions.push(archiveClause);

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
      reviewStatus: sizingRequests.reviewStatus,
      opportunityId: sizingRequests.opportunityId,
      archivedAt: sizingRequests.archivedAt,
    })
    .from(sizingRequests)
    .where(and(...amConditions))
    .orderBy(desc(sizingRequests.createdAt));
}

export async function getRequestDetail(id: string) {
  const session = await auth();
  if (!session?.user?.id) return null;

  const canViewAll = hasSePrivileges(session.user.role);

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

    let alignedSe: { name: string; email: string } | null = null;
    if (request.alignedSeId) {
      const se = await demoStore.users.findById(request.alignedSeId);
      if (se) alignedSe = { name: se.name, email: se.email };
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
          alignedSe,
        };
      }
    }

    return { request, submission, creator, alignedSe };
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

  let alignedSe: { name: string; email: string } | null = null;
  if (request.alignedSeId) {
    const [se] = await getDb()
      .select({ name: users.name, email: users.email })
      .from(users)
      .where(eq(users.id, request.alignedSeId))
      .limit(1);
    if (se) alignedSe = se;
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
        alignedSe,
      };
    }
  }

  return {
    request,
    submission: submission ?? null,
    creator,
    alignedSe,
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
      archivedAt: request.archivedAt ?? null,
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
      archivedAt: sizingRequests.archivedAt,
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
    archivedAt: request.archivedAt,
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

export type ThanksPageContext = {
  products: SubmittedProductSummary | null;
  /** Role of the user who created the sizing link. */
  creatorRole: string | null;
};

export async function getThanksPageContext(
  slug: string,
): Promise<ThanksPageContext> {
  if (isDemoMode()) {
    await ensureDemoSeed();
    const request = await demoStore.sizingRequests.findBySlug(slug);
    if (!request) return { products: null, creatorRole: null };
    const creator = await demoStore.users.findById(request.createdById);
    const submission = await demoStore.submissions.findByRequestId(request.id);
    return {
      products: submission ? summarizeProducts(submission.answers) : null,
      creatorRole: creator?.role ?? null,
    };
  }

  const [request] = await getDb()
    .select({
      id: sizingRequests.id,
      createdById: sizingRequests.createdById,
    })
    .from(sizingRequests)
    .where(eq(sizingRequests.slug, slug))
    .limit(1);
  if (!request) return { products: null, creatorRole: null };

  const [creator] = await getDb()
    .select({ role: users.role })
    .from(users)
    .where(eq(users.id, request.createdById))
    .limit(1);

  const [submission] = await getDb()
    .select({ answers: submissions.answers })
    .from(submissions)
    .where(eq(submissions.requestId, request.id))
    .limit(1);

  return {
    products: submission ? summarizeProducts(submission.answers) : null,
    creatorRole: creator?.role ?? null,
  };
}

export async function getSubmittedProductSummary(
  slug: string,
): Promise<SubmittedProductSummary | null> {
  const ctx = await getThanksPageContext(slug);
  return ctx.products;
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
