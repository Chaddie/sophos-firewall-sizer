import type { UserRole } from "@/lib/sizing/types";

export function isAdmin(role?: UserRole | string | null): boolean {
  return role === "admin";
}

export function isSalesEngineer(role?: UserRole | string | null): boolean {
  return role === "sales_engineer";
}

export function isPartner(role?: UserRole | string | null): boolean {
  return role === "partner";
}

/** SE dashboard privileges: view-all, partners, sizing logic (SE or admin). */
export function hasSePrivileges(role?: UserRole | string | null): boolean {
  return isSalesEngineer(role) || isAdmin(role);
}

/** Catalog Admin is restricted to the admin role. */
export function canAccessCatalogAdmin(
  role?: UserRole | string | null,
): boolean {
  return isAdmin(role);
}

/** @deprecated Prefer hasSePrivileges — kept for callers expecting SE tooling access. */
export function canAccessAdmin(role?: UserRole | string | null): boolean {
  return hasSePrivileges(role);
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
  if (role === "admin") return `Admin: ${who}`;
  return `Created by ${who}`;
}
