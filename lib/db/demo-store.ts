import { randomUUID } from "crypto";
import type { UserRole } from "@/lib/sizing/types";
import type { SeReviewNote } from "@/lib/sizing/types";
import type { StoredAnswers, StoredRecommendation } from "@/lib/sizing/types";

export interface DemoUser {
  id: string;
  email: string;
  name: string;
  passwordHash: string;
  role: UserRole;
  sponsoredById?: string | null;
}

export interface DemoSizingRequest {
  id: string;
  slug: string;
  label: string;
  status: "pending" | "submitted";
  createdById: string;
  alignedSeId?: string | null;
  contactName: string | null;
  contactEmail: string | null;
  expiresAt: Date | null;
  opportunityId?: string | null;
  reviewStatus?: string | null;
  reviewNote?: string | null;
  reviewNotes?: SeReviewNote[] | null;
  flaggedAt?: Date | null;
  flaggedNote?: string | null;
  reviewedAt?: Date | null;
  reviewedById?: string | null;
  archivedAt?: Date | null;
  archivedById?: string | null;
  createdAt: Date;
}

export interface DemoSubmission {
  id: string;
  requestId: string;
  answers: StoredAnswers;
  recommendation: StoredRecommendation;
  version: number;
  submittedAt: Date;
}

export interface DemoSubmissionVersion {
  id: string;
  requestId: string;
  version: number;
  answers: StoredAnswers;
  recommendation: StoredRecommendation;
  source: string;
  createdById: string | null;
  submittedAt: Date;
  archivedAt: Date;
}

export interface DemoCatalogAuditEntry {
  id: string;
  actorId: string | null;
  action: string;
  entityType: string;
  entityId: string;
  summary: string | null;
  beforeJson: unknown;
  afterJson: unknown;
  createdAt: Date;
}

export interface DemoSizingDraft {
  requestId: string;
  draftJson: Record<string, unknown>;
  updatedAt: Date;
}

export interface DemoPartnerMagicLink {
  id: string;
  email: string;
  name: string | null;
  tokenHash: string;
  sponsoredById: string | null;
  expiresAt: Date;
  usedAt: Date | null;
  createdAt: Date;
}

export interface DemoPasswordResetToken {
  id: string;
  userId: string;
  tokenHash: string;
  expiresAt: Date;
  usedAt: Date | null;
}

export interface DemoPasskey {
  id: string;
  userId: string;
  credentialId: string;
  publicKey: string;
  counter: number;
  transports: string | null;
  deviceName: string | null;
  createdAt: Date;
}

export interface DemoWebauthnChallenge {
  id: string;
  challenge: string;
  userId: string | null;
  purpose: string;
  expiresAt: Date;
}

export interface DemoPasskeyLoginTicket {
  id: string;
  userId: string;
  tokenHash: string;
  expiresAt: Date;
  usedAt: Date | null;
}

export interface DemoNotification {
  id: string;
  userId: string;
  type: string;
  title: string;
  body: string | null;
  href: string | null;
  requestId: string | null;
  readAt: Date | null;
  createdAt: Date;
}

export interface DemoPushSubscription {
  id: string;
  userId: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  userAgent: string | null;
  createdAt: Date;
  updatedAt: Date;
}

const users: DemoUser[] = [];
const sizingRequests: DemoSizingRequest[] = [];
const submissions: DemoSubmission[] = [];
const submissionVersionRows: DemoSubmissionVersion[] = [];
const catalogAuditRows: DemoCatalogAuditEntry[] = [];
const sizingDraftRows: DemoSizingDraft[] = [];
const partnerMagicLinks: DemoPartnerMagicLink[] = [];
const passwordResetTokenRows: DemoPasswordResetToken[] = [];
const passkeyRows: DemoPasskey[] = [];
const webauthnChallengeRows: DemoWebauthnChallenge[] = [];
const passkeyLoginTicketRows: DemoPasskeyLoginTicket[] = [];
const notificationRows: DemoNotification[] = [];
const pushSubscriptionRows: DemoPushSubscription[] = [];

export const demoStore = {
  users: {
    async findByEmail(email: string) {
      return users.find((u) => u.email === email.toLowerCase()) ?? null;
    },
    async findById(id: string) {
      return users.find((u) => u.id === id) ?? null;
    },
    async listByRoles(roles: UserRole[]) {
      return users.filter((u) => roles.includes(u.role));
    },
    async upsert(user: DemoUser) {
      const idx = users.findIndex((u) => u.email === user.email);
      if (idx >= 0) users[idx] = user;
      else users.push(user);
      return user;
    },
  },
  notifications: {
    async create(data: {
      userId: string;
      type: string;
      title: string;
      body?: string | null;
      href?: string | null;
      requestId?: string | null;
    }) {
      const row: DemoNotification = {
        id: randomUUID(),
        userId: data.userId,
        type: data.type,
        title: data.title,
        body: data.body ?? null,
        href: data.href ?? null,
        requestId: data.requestId ?? null,
        readAt: null,
        createdAt: new Date(),
      };
      notificationRows.push(row);
      return row;
    },
    async listByUser(
      userId: string,
      opts?: { unreadOnly?: boolean; limit?: number },
    ) {
      let rows = notificationRows.filter((n) => n.userId === userId);
      if (opts?.unreadOnly) rows = rows.filter((n) => n.readAt === null);
      rows = [...rows].sort(
        (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
      );
      if (opts?.limit) rows = rows.slice(0, opts.limit);
      return rows;
    },
    async countUnread(userId: string) {
      return notificationRows.filter(
        (n) => n.userId === userId && n.readAt === null,
      ).length;
    },
    async markRead(userId: string, notificationId: string) {
      const row = notificationRows.find(
        (n) => n.id === notificationId && n.userId === userId,
      );
      if (row) row.readAt = new Date();
    },
    async markAllRead(userId: string) {
      const now = new Date();
      for (const row of notificationRows) {
        if (row.userId === userId && row.readAt === null) {
          row.readAt = now;
        }
      }
    },
  },
  passwordResetTokens: {
    async create(data: {
      userId: string;
      tokenHash: string;
      expiresAt: Date;
    }) {
      const row: DemoPasswordResetToken = {
        id: randomUUID(),
        userId: data.userId,
        tokenHash: data.tokenHash,
        expiresAt: data.expiresAt,
        usedAt: null,
      };
      passwordResetTokenRows.push(row);
      return row;
    },
    async findValid(tokenHash: string, now: Date) {
      return (
        passwordResetTokenRows.find(
          (r) =>
            r.tokenHash === tokenHash &&
            r.usedAt === null &&
            r.expiresAt.getTime() > now.getTime(),
        ) ?? null
      );
    },
    async markUsed(id: string) {
      const row = passwordResetTokenRows.find((r) => r.id === id);
      if (row) row.usedAt = new Date();
    },
  },
  passkeys: {
    async listByUser(userId: string) {
      return passkeyRows.filter((p) => p.userId === userId);
    },
    async findByCredentialId(credentialId: string) {
      return passkeyRows.find((p) => p.credentialId === credentialId) ?? null;
    },
    async create(data: {
      userId: string;
      credentialId: string;
      publicKey: string;
      counter: number;
      transports: string | null;
      deviceName: string | null;
    }) {
      const row: DemoPasskey = {
        id: randomUUID(),
        ...data,
        createdAt: new Date(),
      };
      passkeyRows.push(row);
      return row;
    },
    async updateCounter(id: string, counter: number) {
      const row = passkeyRows.find((p) => p.id === id);
      if (row) row.counter = counter;
    },
    async deleteForUser(userId: string, passkeyId: string) {
      const idx = passkeyRows.findIndex(
        (p) => p.id === passkeyId && p.userId === userId,
      );
      if (idx < 0) return false;
      passkeyRows.splice(idx, 1);
      return true;
    },
  },
  webauthnChallenges: {
    async create(data: {
      challenge: string;
      userId: string | null;
      purpose: string;
      expiresAt: Date;
    }) {
      const row: DemoWebauthnChallenge = {
        id: randomUUID(),
        ...data,
      };
      webauthnChallengeRows.push(row);
      return row;
    },
    async findValid(challenge: string, purpose: string, now: Date) {
      return (
        webauthnChallengeRows.find(
          (r) =>
            r.challenge === challenge &&
            r.purpose === purpose &&
            r.expiresAt.getTime() > now.getTime(),
        ) ?? null
      );
    },
    async delete(id: string) {
      const idx = webauthnChallengeRows.findIndex((r) => r.id === id);
      if (idx >= 0) webauthnChallengeRows.splice(idx, 1);
    },
  },
  passkeyLoginTickets: {
    async create(data: {
      userId: string;
      tokenHash: string;
      expiresAt: Date;
    }) {
      const row: DemoPasskeyLoginTicket = {
        id: randomUUID(),
        userId: data.userId,
        tokenHash: data.tokenHash,
        expiresAt: data.expiresAt,
        usedAt: null,
      };
      passkeyLoginTicketRows.push(row);
      return row;
    },
    async findValid(tokenHash: string, now: Date) {
      return (
        passkeyLoginTicketRows.find(
          (r) =>
            r.tokenHash === tokenHash &&
            r.usedAt === null &&
            r.expiresAt.getTime() > now.getTime(),
        ) ?? null
      );
    },
    async findRecentlyUsed(tokenHash: string, since: Date) {
      return (
        passkeyLoginTicketRows.find(
          (r) =>
            r.tokenHash === tokenHash &&
            r.usedAt !== null &&
            r.usedAt.getTime() >= since.getTime(),
        ) ?? null
      );
    },
    async markUsed(id: string) {
      const row = passkeyLoginTicketRows.find((r) => r.id === id);
      if (row) row.usedAt = new Date();
    },
  },
  partnerMagicLinks: {
    async create(data: {
      email: string;
      name: string | null;
      tokenHash: string;
      expiresAt: Date;
      sponsoredById?: string | null;
    }) {
      const row: DemoPartnerMagicLink = {
        id: randomUUID(),
        email: data.email.toLowerCase(),
        name: data.name,
        tokenHash: data.tokenHash,
        sponsoredById: data.sponsoredById ?? null,
        expiresAt: data.expiresAt,
        usedAt: null,
        createdAt: new Date(),
      };
      partnerMagicLinks.push(row);
      return row;
    },
    async findValid(tokenHash: string, now: Date) {
      return (
        partnerMagicLinks.find(
          (l) =>
            l.tokenHash === tokenHash &&
            l.usedAt === null &&
            l.expiresAt.getTime() > now.getTime(),
        ) ?? null
      );
    },
    async findRecentlyUsed(tokenHash: string, since: Date) {
      return (
        partnerMagicLinks.find(
          (l) =>
            l.tokenHash === tokenHash &&
            l.usedAt !== null &&
            l.usedAt.getTime() >= since.getTime(),
        ) ?? null
      );
    },
    async markUsed(id: string) {
      const row = partnerMagicLinks.find((l) => l.id === id);
      if (row) row.usedAt = new Date();
    },
  },
  sizingRequests: {
    async findBySlug(slug: string) {
      return sizingRequests.find((r) => r.slug === slug) ?? null;
    },
    async findById(id: string) {
      return sizingRequests.find((r) => r.id === id) ?? null;
    },
    async listByUser(userId: string) {
      return sizingRequests
        .filter((r) => r.createdById === userId)
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    },
    async listAll() {
      return [...sizingRequests].sort(
        (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
      );
    },
    async create(data: Omit<DemoSizingRequest, "id" | "createdAt">) {
      const row: DemoSizingRequest = {
        ...data,
        id: randomUUID(),
        createdAt: new Date(),
      };
      sizingRequests.push(row);
      return row;
    },
    async updateStatus(id: string, status: "pending" | "submitted") {
      const row = sizingRequests.find((r) => r.id === id);
      if (row) row.status = status;
    },
  },
  submissions: {
    async findByRequestId(requestId: string) {
      return submissions.find((s) => s.requestId === requestId) ?? null;
    },
    async create(data: Omit<DemoSubmission, "id" | "submittedAt" | "version"> & {
      version?: number;
    }) {
      const row: DemoSubmission = {
        ...data,
        id: randomUUID(),
        version: data.version ?? 1,
        submittedAt: new Date(),
      };
      submissions.push(row);
      return row;
    },
    async update(
      requestId: string,
      data: {
        answers: StoredAnswers;
        recommendation: StoredRecommendation;
        version: number;
      },
    ) {
      const row = submissions.find((s) => s.requestId === requestId);
      if (!row) return null;
      row.answers = data.answers;
      row.recommendation = data.recommendation;
      row.version = data.version;
      row.submittedAt = new Date();
      return row;
    },
    async deleteByRequestId(requestId: string) {
      const idx = submissions.findIndex((s) => s.requestId === requestId);
      if (idx < 0) return false;
      submissions.splice(idx, 1);
      return true;
    },
    async updateRecommendation(
      requestId: string,
      recommendation: StoredRecommendation,
    ) {
      const row = submissions.find((s) => s.requestId === requestId);
      if (row) row.recommendation = recommendation;
      return row ?? null;
    },
    async listAll() {
      return [...submissions];
    },
  },
  submissionVersions: {
    async create(data: {
      requestId: string;
      version: number;
      answers: StoredAnswers;
      recommendation: StoredRecommendation;
      source: string;
      createdById?: string | null;
      submittedAt: Date;
    }) {
      const row: DemoSubmissionVersion = {
        id: randomUUID(),
        requestId: data.requestId,
        version: data.version,
        answers: data.answers,
        recommendation: data.recommendation,
        source: data.source,
        createdById: data.createdById ?? null,
        submittedAt: data.submittedAt,
        archivedAt: new Date(),
      };
      submissionVersionRows.push(row);
      return row;
    },
    async listByRequestId(requestId: string) {
      return submissionVersionRows
        .filter((v) => v.requestId === requestId)
        .sort((a, b) => b.version - a.version);
    },
  },
  catalogAudit: {
    async create(data: {
      actorId?: string | null;
      action: string;
      entityType: string;
      entityId: string;
      summary?: string | null;
      beforeJson?: unknown;
      afterJson?: unknown;
    }) {
      const row: DemoCatalogAuditEntry = {
        id: randomUUID(),
        actorId: data.actorId ?? null,
        action: data.action,
        entityType: data.entityType,
        entityId: data.entityId,
        summary: data.summary ?? null,
        beforeJson: data.beforeJson ?? null,
        afterJson: data.afterJson ?? null,
        createdAt: new Date(),
      };
      catalogAuditRows.push(row);
      return row;
    },
    async list(limit = 50) {
      return [...catalogAuditRows]
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
        .slice(0, limit);
    },
  },
  sizingDrafts: {
    async get(requestId: string) {
      return sizingDraftRows.find((d) => d.requestId === requestId) ?? null;
    },
    async upsert(requestId: string, draftJson: Record<string, unknown>) {
      const existing = sizingDraftRows.find((d) => d.requestId === requestId);
      if (existing) {
        existing.draftJson = draftJson;
        existing.updatedAt = new Date();
        return existing;
      }
      const row: DemoSizingDraft = {
        requestId,
        draftJson,
        updatedAt: new Date(),
      };
      sizingDraftRows.push(row);
      return row;
    },
    async delete(requestId: string) {
      const idx = sizingDraftRows.findIndex((d) => d.requestId === requestId);
      if (idx < 0) return false;
      sizingDraftRows.splice(idx, 1);
      return true;
    },
  },
  pushSubscriptions: {
    async upsert(data: {
      userId: string;
      endpoint: string;
      p256dh: string;
      auth: string;
      userAgent?: string | null;
    }) {
      const existing = pushSubscriptionRows.find(
        (r) => r.endpoint === data.endpoint,
      );
      const now = new Date();
      if (existing) {
        existing.userId = data.userId;
        existing.p256dh = data.p256dh;
        existing.auth = data.auth;
        existing.userAgent = data.userAgent ?? null;
        existing.updatedAt = now;
        return existing;
      }
      const row: DemoPushSubscription = {
        id: randomUUID(),
        userId: data.userId,
        endpoint: data.endpoint,
        p256dh: data.p256dh,
        auth: data.auth,
        userAgent: data.userAgent ?? null,
        createdAt: now,
        updatedAt: now,
      };
      pushSubscriptionRows.push(row);
      return row;
    },
    async delete(userId: string, endpoint: string) {
      const idx = pushSubscriptionRows.findIndex(
        (r) => r.userId === userId && r.endpoint === endpoint,
      );
      if (idx < 0) return false;
      pushSubscriptionRows.splice(idx, 1);
      return true;
    },
    async listByUsers(userIds: string[]) {
      const set = new Set(userIds);
      return pushSubscriptionRows.filter((r) => set.has(r.userId));
    },
  },
};

export function isDemoMode() {
  return process.env.DEMO_MODE === "true" || !process.env.DATABASE_URL;
}
