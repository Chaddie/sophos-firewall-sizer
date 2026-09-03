"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { canAccessCatalogAdmin } from "@/lib/auth-utils";
import { recordCatalogAudit } from "@/lib/catalog-audit";
import {
  parseAccessoryCsv,
  parseFirewallCsv,
  parseSwitchCsv,
  type CatalogCsvRowError,
} from "@/lib/sizing/catalog-csv";
import {
  deleteAccessoryModel,
  deleteFirewallModel,
  deleteSwitchModel,
  getAccessoryCatalog,
  getFirewallCatalog,
  getSwitchCatalog,
  upsertAccessoryModel,
  upsertFirewallModel,
  upsertSwitchModel,
} from "@/lib/sizing/catalog-store";
import type {
  AccessoryModel,
  CatalogModel,
  SwitchCatalogModel,
} from "@/lib/sizing/types";

async function requireAdmin() {
  const session = await auth();
  if (!session?.user?.id || !canAccessCatalogAdmin(session.user.role)) {
    throw new Error(
      "Unauthorized — catalog management is restricted to admins",
    );
  }
}

export interface CatalogImportResult {
  success: boolean;
  inserted: number;
  updated: number;
  skipped: number;
  errors: CatalogCsvRowError[];
  models: CatalogModel[] | SwitchCatalogModel[] | AccessoryModel[];
  error?: string;
}

const MAX_CSV_CHARS = 2_000_000;

function csvTooLarge(csvText: string): string | null {
  if (csvText.length > MAX_CSV_CHARS) {
    return "CSV is too large (max ~2MB of text)";
  }
  return null;
}

export async function saveFirewallModelAction(model: CatalogModel) {
  await requireAdmin();

  if (!model.id.trim()) return { error: "Model ID is required" };
  if (!model.name.trim()) return { error: "Model name is required" };
  if (model.environment.length === 0) {
    return { error: "Select at least one environment" };
  }

  const before = (await getFirewallCatalog()).find((m) => m.id === model.id);
  await upsertFirewallModel({
    ...model,
    id: model.id.trim(),
    name: model.name.trim(),
    redundantPsuSku: model.redundantPsuSku?.trim() || undefined,
    redundantPsuName: model.redundantPsuName?.trim() || undefined,
  });
  await recordCatalogAudit({
    action: before ? "update" : "create",
    entityType: "firewall",
    entityId: model.id.trim(),
    summary: `${before ? "Updated" : "Created"} firewall ${model.name.trim()}`,
    beforeJson: before ?? null,
    afterJson: model,
  });
  revalidatePath("/dashboard/admin/catalog");
  return { success: true as const };
}

export async function removeFirewallModelAction(id: string) {
  await requireAdmin();
  const before = (await getFirewallCatalog()).find((m) => m.id === id);
  await deleteFirewallModel(id);
  await recordCatalogAudit({
    action: "delete",
    entityType: "firewall",
    entityId: id,
    summary: `Deleted firewall ${before?.name ?? id}`,
    beforeJson: before ?? null,
  });
  revalidatePath("/dashboard/admin/catalog");
  return { success: true as const };
}

export async function saveSwitchModelAction(model: SwitchCatalogModel) {
  await requireAdmin();

  if (!model.id.trim()) return { error: "Model ID is required" };
  if (!model.name.trim()) return { error: "Model name is required" };
  if (!model.sku.trim()) return { error: "SKU is required" };

  const before = (await getSwitchCatalog()).find((m) => m.id === model.id);
  await upsertSwitchModel({
    ...model,
    id: model.id.trim(),
    name: model.name.trim(),
    sku: model.sku.trim(),
  });
  await recordCatalogAudit({
    action: before ? "update" : "create",
    entityType: "switch",
    entityId: model.id.trim(),
    summary: `${before ? "Updated" : "Created"} switch ${model.name.trim()}`,
    beforeJson: before ?? null,
    afterJson: model,
  });
  revalidatePath("/dashboard/admin/catalog");
  return { success: true as const };
}

export async function removeSwitchModelAction(id: string) {
  await requireAdmin();
  const before = (await getSwitchCatalog()).find((m) => m.id === id);
  await deleteSwitchModel(id);
  await recordCatalogAudit({
    action: "delete",
    entityType: "switch",
    entityId: id,
    summary: `Deleted switch ${before?.name ?? id}`,
    beforeJson: before ?? null,
  });
  revalidatePath("/dashboard/admin/catalog");
  return { success: true as const };
}

export async function saveAccessoryModelAction(model: AccessoryModel) {
  await requireAdmin();

  if (!model.id.trim()) return { error: "Accessory ID is required" };
  if (!model.name.trim()) return { error: "Name is required" };
  if (!model.sku.trim()) return { error: "SKU is required" };
  if (model.type !== "sfp_sr" && model.type !== "sfp_lr") {
    return { error: "Type must be sfp_sr or sfp_lr" };
  }

  const before = (await getAccessoryCatalog()).find((m) => m.id === model.id);
  await upsertAccessoryModel({
    ...model,
    id: model.id.trim(),
    name: model.name.trim(),
    sku: model.sku.trim(),
  });
  await recordCatalogAudit({
    action: before ? "update" : "create",
    entityType: "accessory",
    entityId: model.id.trim(),
    summary: `${before ? "Updated" : "Created"} accessory ${model.name.trim()}`,
    beforeJson: before ?? null,
    afterJson: model,
  });
  revalidatePath("/dashboard/admin/catalog");
  return { success: true as const };
}

export async function removeAccessoryModelAction(id: string) {
  await requireAdmin();
  const before = (await getAccessoryCatalog()).find((m) => m.id === id);
  await deleteAccessoryModel(id);
  await recordCatalogAudit({
    action: "delete",
    entityType: "accessory",
    entityId: id,
    summary: `Deleted accessory ${before?.name ?? id}`,
    beforeJson: before ?? null,
  });
  revalidatePath("/dashboard/admin/catalog");
  return { success: true as const };
}

export async function importFirewallCsvAction(
  csvText: string,
): Promise<CatalogImportResult> {
  await requireAdmin();

  const sizeError = csvTooLarge(csvText);
  if (sizeError) {
    return {
      success: false,
      inserted: 0,
      updated: 0,
      skipped: 0,
      errors: [],
      models: [],
      error: sizeError,
    };
  }

  const parsed = parseFirewallCsv(csvText);
  if (parsed.models.length === 0 && parsed.errors.length > 0) {
    return {
      success: false,
      inserted: 0,
      updated: 0,
      skipped: parsed.skipped,
      errors: parsed.errors,
      models: [],
      error: "No valid firewall rows to import",
    };
  }

  const existing = await getFirewallCatalog();
  const existingIds = new Set(existing.map((m) => m.id));
  let inserted = 0;
  let updated = 0;

  for (const model of parsed.models) {
    if (existingIds.has(model.id)) updated++;
    else inserted++;
    await upsertFirewallModel({
      ...model,
      id: model.id.trim(),
      name: model.name.trim(),
      redundantPsuSku: model.redundantPsuSku?.trim() || undefined,
      redundantPsuName: model.redundantPsuName?.trim() || undefined,
    });
  }

  revalidatePath("/dashboard/admin/catalog");
  return {
    success: parsed.models.length > 0,
    inserted,
    updated,
    skipped: parsed.skipped,
    errors: parsed.errors,
    models: parsed.models,
    error:
      parsed.models.length === 0 ? "No valid firewall rows to import" : undefined,
  };
}

export async function importSwitchCsvAction(
  csvText: string,
): Promise<CatalogImportResult> {
  await requireAdmin();

  const sizeError = csvTooLarge(csvText);
  if (sizeError) {
    return {
      success: false,
      inserted: 0,
      updated: 0,
      skipped: 0,
      errors: [],
      models: [],
      error: sizeError,
    };
  }

  const parsed = parseSwitchCsv(csvText);
  if (parsed.models.length === 0 && parsed.errors.length > 0) {
    return {
      success: false,
      inserted: 0,
      updated: 0,
      skipped: parsed.skipped,
      errors: parsed.errors,
      models: [],
      error: "No valid switch rows to import",
    };
  }

  const existing = await getSwitchCatalog();
  const existingIds = new Set(existing.map((m) => m.id));
  let inserted = 0;
  let updated = 0;

  for (const model of parsed.models) {
    if (existingIds.has(model.id)) updated++;
    else inserted++;
    await upsertSwitchModel({
      ...model,
      id: model.id.trim(),
      name: model.name.trim(),
      sku: model.sku.trim(),
    });
  }

  revalidatePath("/dashboard/admin/catalog");
  return {
    success: parsed.models.length > 0,
    inserted,
    updated,
    skipped: parsed.skipped,
    errors: parsed.errors,
    models: parsed.models,
    error:
      parsed.models.length === 0 ? "No valid switch rows to import" : undefined,
  };
}

export async function importAccessoryCsvAction(
  csvText: string,
): Promise<CatalogImportResult> {
  await requireAdmin();

  const sizeError = csvTooLarge(csvText);
  if (sizeError) {
    return {
      success: false,
      inserted: 0,
      updated: 0,
      skipped: 0,
      errors: [],
      models: [],
      error: sizeError,
    };
  }

  const parsed = parseAccessoryCsv(csvText);
  if (parsed.models.length === 0 && parsed.errors.length > 0) {
    return {
      success: false,
      inserted: 0,
      updated: 0,
      skipped: parsed.skipped,
      errors: parsed.errors,
      models: [],
      error: "No valid accessory rows to import",
    };
  }

  const existing = await getAccessoryCatalog();
  const existingIds = new Set(existing.map((m) => m.id));
  let inserted = 0;
  let updated = 0;

  for (const model of parsed.models) {
    if (existingIds.has(model.id)) updated++;
    else inserted++;
    await upsertAccessoryModel({
      ...model,
      id: model.id.trim(),
      name: model.name.trim(),
      sku: model.sku.trim(),
    });
  }

  revalidatePath("/dashboard/admin/catalog");
  return {
    success: parsed.models.length > 0,
    inserted,
    updated,
    skipped: parsed.skipped,
    errors: parsed.errors,
    models: parsed.models,
    error:
      parsed.models.length === 0
        ? "No valid accessory rows to import"
        : undefined,
  };
}
