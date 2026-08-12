import {
  boolean,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
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
]);

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  passwordHash: text("password_hash").notNull(),
  role: userRoleEnum("role").default("account_manager").notNull(),
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
