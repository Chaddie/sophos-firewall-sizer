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
  contactName: text("contact_name"),
  contactEmail: text("contact_email"),
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
  answers: jsonb("answers").$type<StoredAnswers>().notNull(),
  recommendation: jsonb("recommendation").$type<StoredRecommendation>().notNull(),
  submittedAt: timestamp("submitted_at", { withTimezone: true })
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

export type User = typeof users.$inferSelect;
export type SizingRequest = typeof sizingRequests.$inferSelect;
export type Submission = typeof submissions.$inferSelect;
export type FirewallModelRow = typeof firewallModels.$inferSelect;
export type SwitchModelRow = typeof switchModels.$inferSelect;
export type AccessoryModelRow = typeof accessoryModels.$inferSelect;
