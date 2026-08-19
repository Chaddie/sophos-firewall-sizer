"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { isSalesEngineer } from "@/lib/auth-utils";
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

async function requireSalesEngineer() {
  const session = await auth();
  if (!session?.user?.id || !isSalesEngineer(session.user.role)) {
    throw new Error(
      "Unauthorized — catalog management is restricted to sales engineers",
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
    redundantPsuSku: model.redundantPsuSku?.trim() || undefined,
    redundantPsuName: model.redundantPsuName?.trim() || undefined,
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

export async function saveAccessoryModelAction(model: AccessoryModel) {
  await requireSalesEngineer();

  if (!model.id.trim()) return { error: "Accessory ID is required" };
  if (!model.name.trim()) return { error: "Name is required" };
  if (!model.sku.trim()) return { error: "SKU is required" };
  if (model.type !== "sfp_sr" && model.type !== "sfp_lr") {
    return { error: "Type must be sfp_sr or sfp_lr" };
  }

  await upsertAccessoryModel({
    ...model,
    id: model.id.trim(),
    name: model.name.trim(),
    sku: model.sku.trim(),
  });
  revalidatePath("/dashboard/admin/catalog");
  return { success: true as const };
}

export async function removeAccessoryModelAction(id: string) {
  await requireSalesEngineer();
  await deleteAccessoryModel(id);
  revalidatePath("/dashboard/admin/catalog");
  return { success: true as const };
}

export async function importFirewallCsvAction(
  csvText: string,
): Promise<CatalogImportResult> {
  await requireSalesEngineer();

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
  await requireSalesEngineer();

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
  await requireSalesEngineer();

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
