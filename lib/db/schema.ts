import {
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import type { SizingAnswers, SizingRecommendation } from "@/lib/sizing/types";

export const requestStatusEnum = pgEnum("request_status", [
  "pending",
  "submitted",
]);

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  passwordHash: text("password_hash").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const sizingRequests = pgTable("sizing_requests", {
  id: uuid("id").defaultRandom().primaryKey(),
  slug: text("slug").notNull().unique(),
  label: text("label"),
  status: requestStatusEnum("status").default("pending").notNull(),
  createdById: uuid("created_by_id")
    .notNull()
    .references(() => users.id),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const submissions = pgTable("submissions", {
  id: uuid("id").defaultRandom().primaryKey(),
  requestId: uuid("request_id")
    .notNull()
    .unique()
    .references(() => sizingRequests.id),
  answers: jsonb("answers").$type<SizingAnswers>().notNull(),
  recommendation: jsonb("recommendation").$type<SizingRecommendation>().notNull(),
  submittedAt: timestamp("submitted_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export type User = typeof users.$inferSelect;
export type SizingRequest = typeof sizingRequests.$inferSelect;
export type Submission = typeof submissions.$inferSelect;
