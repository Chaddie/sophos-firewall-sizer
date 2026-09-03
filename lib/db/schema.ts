import {
  boolean,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
  type AnyPgColumn,
} from "drizzle-orm/pg-core";
import type {
  SeReviewNote,
  StoredAnswers,
  StoredRecommendation,
} from "@/lib/sizing/types";

export const requestStatusEnum = pgEnum("request_status", [
  "pending",
  "submitted",
]);

export const userRoleEnum = pgEnum("user_role", [
  "account_manager",
  "sales_engineer",
  "partner",
  "admin",
]);

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  /** Null for SSO-provisioned / magic-link users who never set a local password. */
  passwordHash: text("password_hash"),
  role: userRoleEnum("role").default("account_manager").notNull(),
  /** Optional SE who invited/sponsors this partner (audit trail). */
  sponsoredById: uuid("sponsored_by_id").references((): AnyPgColumn => users.id),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

/** One-time password reset links. */
export const passwordResetTokens = pgTable("password_reset_tokens", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  tokenHash: text("token_hash").notNull().unique(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  usedAt: timestamp("used_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

/** WebAuthn / passkey credentials. */
export const passkeys = pgTable("passkeys", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  credentialId: text("credential_id").notNull().unique(),
  publicKey: text("public_key").notNull(),
  counter: integer("counter").notNull().default(0),
  transports: text("transports"),
  deviceName: text("device_name"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

/** Short-lived WebAuthn challenges and post-auth login tickets. */
export const webauthnChallenges = pgTable("webauthn_challenges", {
  id: uuid("id").defaultRandom().primaryKey(),
  challenge: text("challenge").notNull(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }),
  purpose: text("purpose").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

/** One-time tickets after a successful passkey assertion (for NextAuth). */
export const passkeyLoginTickets = pgTable("passkey_login_tickets", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  tokenHash: text("token_hash").notNull().unique(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  usedAt: timestamp("used_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

/** One-time email magic links for the partner portal. */
export const partnerMagicLinks = pgTable("partner_magic_links", {
  id: uuid("id").defaultRandom().primaryKey(),
  email: text("email").notNull(),
  name: text("name"),
  tokenHash: text("token_hash").notNull().unique(),
  /** SE who invited this partner (applied on first successful sign-in). */
  sponsoredById: uuid("sponsored_by_id").references((): AnyPgColumn => users.id),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  usedAt: timestamp("used_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const sizingRequests = pgTable("sizing_requests", {
  id: uuid("id").defaultRandom().primaryKey(),
  slug: text("slug").notNull().unique(),
  label: text("label").notNull(),
  status: requestStatusEnum("status").default("pending").notNull(),
  createdById: uuid("created_by_id")
    .notNull()
    .references(() => users.id),
  /** SE aligned to this deal when an AM/partner creates the request. */
  alignedSeId: uuid("aligned_se_id").references((): AnyPgColumn => users.id),
  contactName: text("contact_name"),
  contactEmail: text("contact_email"),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  /** SFDC / CPQ opportunity identifier for quote handoff. */
  opportunityId: text("opportunity_id"),
  /**
   * SE review workflow: null | flagged | reviewed | needs_changes
   * AMs flag for SE; SEs set reviewed / needs_changes.
   */
  reviewStatus: text("review_status"),
  /** @deprecated Prefer reviewNotes — kept for legacy rows. */
  reviewNote: text("review_note"),
  /** Chronological SE review notes (author + timestamp). */
  reviewNotes: jsonb("review_notes").$type<SeReviewNote[]>().default([]),
  flaggedAt: timestamp("flagged_at", { withTimezone: true }),
  flaggedNote: text("flagged_note"),
  reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
  reviewedById: uuid("reviewed_by_id").references((): AnyPgColumn => users.id),
  /** Soft-archive: admins can hide submitted requests from default lists. */
  archivedAt: timestamp("archived_at", { withTimezone: true }),
  archivedById: uuid("archived_by_id").references((): AnyPgColumn => users.id),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

/** Customer wizard draft answers (save & resume). */
export const sizingDrafts = pgTable("sizing_drafts", {
  requestId: uuid("request_id")
    .primaryKey()
    .references(() => sizingRequests.id, { onDelete: "cascade" }),
  draftJson: jsonb("draft_json").$type<Record<string, unknown>>().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const submissions = pgTable("submissions", {
  id: uuid("id").defaultRandom().primaryKey(),
  requestId: uuid("request_id")
    .notNull()
    .unique()
    .references(() => sizingRequests.id),
  answers: jsonb("answers").$type<StoredAnswers>().notNull(),
  recommendation: jsonb("recommendation").$type<StoredRecommendation>().notNull(),
  /** Monotonic version; prior versions live in submission_versions. */
  version: integer("version").notNull().default(1),
  submittedAt: timestamp("submitted_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

/** Historical submission snapshots (customer resubmit / SE correction). */
export const submissionVersions = pgTable("submission_versions", {
  id: uuid("id").defaultRandom().primaryKey(),
  requestId: uuid("request_id")
    .notNull()
    .references(() => sizingRequests.id, { onDelete: "cascade" }),
  version: integer("version").notNull(),
  answers: jsonb("answers").$type<StoredAnswers>().notNull(),
  recommendation: jsonb("recommendation").$type<StoredRecommendation>().notNull(),
  source: text("source").notNull(),
  createdById: uuid("created_by_id").references((): AnyPgColumn => users.id),
  submittedAt: timestamp("submitted_at", { withTimezone: true }).notNull(),
  archivedAt: timestamp("archived_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

/** Catalog change audit trail. */
export const catalogAuditLog = pgTable("catalog_audit_log", {
  id: uuid("id").defaultRandom().primaryKey(),
  actorId: uuid("actor_id").references((): AnyPgColumn => users.id),
  action: text("action").notNull(),
  entityType: text("entity_type").notNull(),
  entityId: text("entity_id").notNull(),
  summary: text("summary"),
  beforeJson: jsonb("before_json"),
  afterJson: jsonb("after_json"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const firewallModels = pgTable("firewall_models", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  sku: text("sku"),
  licenseSku: text("license_sku"),
  environment: text("environment").array().notNull(),
  formFactor: text("form_factor"),
  threatProtectionMbps: integer("threat_protection_mbps").notNull(),
  xstreamSslMbps: integer("xstream_ssl_mbps").notNull(),
  ipsecVpnMbps: integer("ipsec_vpn_mbps").notNull(),
  maxIpsecTunnels: integer("max_ipsec_tunnels").notNull(),
  maxSslVpnTunnels: integer("max_ssl_vpn_tunnels").notNull(),
  maxConcurrentConnections: integer("max_concurrent_connections").notNull(),
  minUsers: integer("min_users").notNull(),
  maxUsers: integer("max_users").notNull(),
  vcpu: integer("vcpu"),
  ramGb: integer("ram_gb"),
  awsInstance: text("aws_instance"),
  azureVmSize: text("azure_vm_size"),
  redundantPsuSku: text("redundant_psu_sku"),
  redundantPsuName: text("redundant_psu_name"),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const switchModels = pgTable("switch_models", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  sku: text("sku").notNull(),
  series: integer("series").notNull(),
  portCount: integer("port_count").notNull(),
  ports1GbE: integer("ports_1gbe").notNull(),
  ports2_5GbE: integer("ports_2_5gbe").notNull(),
  ports10GbE: integer("ports_10gbe").notNull(),
  sfpPlusUplinkCount: integer("sfp_plus_uplink_count").notNull(),
  poeSupported: boolean("poe_supported").notNull(),
  poeBudgetWatts: integer("poe_budget_watts").notNull(),
  supportsBtPoE: boolean("supports_bt_poe").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const accessoryModels = pgTable("accessory_models", {
  id: text("id").primaryKey(),
  type: text("type").notNull(),
  name: text("name").notNull(),
  sku: text("sku").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

/** In-app notifications (e.g. customer submitted a sizing request). */
export const notifications = pgTable("notifications", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  type: text("type").notNull(),
  title: text("title").notNull(),
  body: text("body"),
  href: text("href"),
  requestId: uuid("request_id").references(() => sizingRequests.id, {
    onDelete: "cascade",
  }),
  readAt: timestamp("read_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export type User = typeof users.$inferSelect;
export type Notification = typeof notifications.$inferSelect;
export type SizingRequest = typeof sizingRequests.$inferSelect;
export type Submission = typeof submissions.$inferSelect;
export type SubmissionVersion = typeof submissionVersions.$inferSelect;
export type CatalogAuditLogEntry = typeof catalogAuditLog.$inferSelect;
export type FirewallModelRow = typeof firewallModels.$inferSelect;
export type SwitchModelRow = typeof switchModels.$inferSelect;
export type AccessoryModelRow = typeof accessoryModels.$inferSelect;
