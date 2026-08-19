import { randomUUID } from "crypto";
import type { UserRole } from "@/lib/sizing/types";
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
  contactName: string | null;
  contactEmail: string | null;
  expiresAt: Date | null;
  createdAt: Date;
}

export interface DemoSubmission {
  id: string;
  requestId: string;
  answers: StoredAnswers;
  recommendation: StoredRecommendation;
  submittedAt: Date;
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

const users: DemoUser[] = [];
const sizingRequests: DemoSizingRequest[] = [];
const submissions: DemoSubmission[] = [];
const partnerMagicLinks: DemoPartnerMagicLink[] = [];

export const demoStore = {
  users: {
    async findByEmail(email: string) {
      return users.find((u) => u.email === email.toLowerCase()) ?? null;
    },
    async findById(id: string) {
      return users.find((u) => u.id === id) ?? null;
    },
    async upsert(user: DemoUser) {
      const idx = users.findIndex((u) => u.email === user.email);
      if (idx >= 0) users[idx] = user;
      else users.push(user);
      return user;
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
    async create(data: Omit<DemoSubmission, "id" | "submittedAt">) {
      const row: DemoSubmission = {
        ...data,
        id: randomUUID(),
        submittedAt: new Date(),
      };
      submissions.push(row);
      return row;
    },
    async updateRecommendation(
      requestId: string,
      recommendation: StoredRecommendation,
    ) {
      const row = submissions.find((s) => s.requestId === requestId);
      if (row) row.recommendation = recommendation;
      return row ?? null;
    },
  },
};

export function isDemoMode() {
  return process.env.DEMO_MODE === "true" || !process.env.DATABASE_URL;
}
