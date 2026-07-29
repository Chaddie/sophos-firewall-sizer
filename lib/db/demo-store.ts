import { randomUUID } from "crypto";
import type { UserRole } from "@/lib/sizing/types";
import type { StoredAnswers, StoredRecommendation } from "@/lib/sizing/types";

export interface DemoUser {
  id: string;
  email: string;
  name: string;
  passwordHash: string;
  role: UserRole;
}

export interface DemoSizingRequest {
  id: string;
  slug: string;
  label: string;
  status: "pending" | "submitted";
  createdById: string;
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

const users: DemoUser[] = [];
const sizingRequests: DemoSizingRequest[] = [];
const submissions: DemoSubmission[] = [];

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
