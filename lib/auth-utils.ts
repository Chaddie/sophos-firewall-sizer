import type { UserRole } from "@/lib/sizing/types";

export function isSalesEngineer(role?: UserRole | string | null): boolean {
  return role === "sales_engineer";
}
