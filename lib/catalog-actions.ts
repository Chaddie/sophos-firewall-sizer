"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { isSalesEngineer } from "@/lib/auth-utils";
import {
  deleteFirewallModel,
  deleteSwitchModel,
  upsertFirewallModel,
  upsertSwitchModel,
} from "@/lib/sizing/catalog-store";
import type { CatalogModel, SwitchCatalogModel } from "@/lib/sizing/types";

async function requireSalesEngineer() {
  const session = await auth();
  if (!session?.user?.id || !isSalesEngineer(session.user.role)) {
    throw new Error(
      "Unauthorized — catalog management is restricted to sales engineers",
    );
  }
}

export async function saveFirewallModelAction(model: CatalogModel) {
  await requireSalesEngineer();

  if (!model.id.trim()) return { error: "Model ID is required" };
  if (!model.name.trim()) return { error: "Model name is required" };
  if (model.environment.length === 0) {
    return { error: "Select at least one environment" };
  }

  await upsertFirewallModel({
    ...model,
    id: model.id.trim(),
    name: model.name.trim(),
  });
  revalidatePath("/dashboard/admin/catalog");
  return { success: true as const };
}

export async function removeFirewallModelAction(id: string) {
  await requireSalesEngineer();
  await deleteFirewallModel(id);
  revalidatePath("/dashboard/admin/catalog");
  return { success: true as const };
}

export async function saveSwitchModelAction(model: SwitchCatalogModel) {
  await requireSalesEngineer();

  if (!model.id.trim()) return { error: "Model ID is required" };
  if (!model.name.trim()) return { error: "Model name is required" };
  if (!model.sku.trim()) return { error: "SKU is required" };

  await upsertSwitchModel({
    ...model,
    id: model.id.trim(),
    name: model.name.trim(),
    sku: model.sku.trim(),
  });
  revalidatePath("/dashboard/admin/catalog");
  return { success: true as const };
}

export async function removeSwitchModelAction(id: string) {
  await requireSalesEngineer();
  await deleteSwitchModel(id);
  revalidatePath("/dashboard/admin/catalog");
  return { success: true as const };
}
