import type { UserRole } from "@/lib/sizing/types";

export function isSalesEngineer(role?: UserRole | string | null): boolean {
  return role === "sales_engineer";
}

export function isPartner(role?: UserRole | string | null): boolean {
  return role === "partner";
}

export function canAccessAdmin(role?: UserRole | string | null): boolean {
  return isSalesEngineer(role);
}

/** Label for SE dashboards when attributing who created a sizing link. */
export function creatorAttributionLabel(
  role: UserRole | string | null | undefined,
  name: string,
  email?: string | null,
): string {
  const who = email ? `${name} (${email})` : name;
  if (role === "partner") return `Partner: ${who}`;
  if (role === "sales_engineer") return `Sales engineer: ${who}`;
  return `Created by ${who}`;
}
