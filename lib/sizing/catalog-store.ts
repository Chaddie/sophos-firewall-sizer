import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { isDemoMode } from "@/lib/db/demo-store";
import { firewallModels, switchModels } from "@/lib/db/schema";
import fallbackFirewallCatalog from "./catalog.json";
import fallbackSwitchCatalog from "./switch-catalog.json";
import type { CatalogModel, Environment, SwitchCatalogModel } from "./types";

interface FirewallCatalogFile {
  version: string;
  models: CatalogModel[];
}

interface SwitchCatalogFile {
  version: string;
  models: SwitchCatalogModel[];
}

const staticFirewallCatalog = fallbackFirewallCatalog as FirewallCatalogFile;
const staticSwitchCatalog = fallbackSwitchCatalog as SwitchCatalogFile;

// In-memory catalog used only in demo mode, so the admin catalog page has
// something to edit without a real database configured.
let demoFirewallModels: CatalogModel[] | null = null;
let demoSwitchModels: SwitchCatalogModel[] | null = null;

function ensureDemoCatalogSeeded() {
  if (!demoFirewallModels) {
    demoFirewallModels = staticFirewallCatalog.models.map((m) => ({ ...m }));
  }
  if (!demoSwitchModels) {
    demoSwitchModels = staticSwitchCatalog.models.map((m) => ({ ...m }));
  }
}

function rowToFirewallModel(row: typeof firewallModels.$inferSelect): CatalogModel {
  return {
    id: row.id,
    name: row.name,
    sku: row.sku ?? undefined,
    licenseSku: row.licenseSku ?? undefined,
    environment: row.environment as Environment[],
    formFactor: row.formFactor ?? undefined,
    threatProtectionMbps: row.threatProtectionMbps,
    xstreamSslMbps: row.xstreamSslMbps,
    ipsecVpnMbps: row.ipsecVpnMbps,
    maxIpsecTunnels: row.maxIpsecTunnels,
    maxSslVpnTunnels: row.maxSslVpnTunnels,
    maxConcurrentConnections: row.maxConcurrentConnections,
    minUsers: row.minUsers,
    maxUsers: row.maxUsers,
    vcpu: row.vcpu ?? undefined,
    ramGb: row.ramGb ?? undefined,
    awsInstance: row.awsInstance ?? undefined,
    azureVmSize: row.azureVmSize ?? undefined,
  };
}

function rowToSwitchModel(row: typeof switchModels.$inferSelect): SwitchCatalogModel {
  return {
    id: row.id,
    name: row.name,
    sku: row.sku,
    series: row.series as 200 | 1000,
    portCount: row.portCount,
    ports1GbE: row.ports1GbE,
    ports2_5GbE: row.ports2_5GbE,
    ports10GbE: row.ports10GbE,
    sfpPlusUplinkCount: row.sfpPlusUplinkCount,
    poeSupported: row.poeSupported,
    poeBudgetWatts: row.poeBudgetWatts,
    supportsBtPoE: row.supportsBtPoE,
  };
}

/** Firewall models used for sizing — DB-backed with a bundled-JSON fallback. */
export async function getFirewallCatalog(): Promise<CatalogModel[]> {
  if (isDemoMode()) {
    ensureDemoCatalogSeeded();
    return demoFirewallModels!;
  }
  try {
    const rows = await getDb().select().from(firewallModels);
    if (rows.length === 0) return staticFirewallCatalog.models;
    return rows.map(rowToFirewallModel);
  } catch {
    return staticFirewallCatalog.models;
  }
}

/** Switch models used for sizing — DB-backed with a bundled-JSON fallback. */
export async function getSwitchCatalog(): Promise<SwitchCatalogModel[]> {
  if (isDemoMode()) {
    ensureDemoCatalogSeeded();
    return demoSwitchModels!;
  }
  try {
    const rows = await getDb().select().from(switchModels);
    if (rows.length === 0) return staticSwitchCatalog.models;
    return rows.map(rowToSwitchModel);
  } catch {
    return staticSwitchCatalog.models;
  }
}

export const CATALOG_VERSION = staticFirewallCatalog.version;
export const SWITCH_CATALOG_VERSION = staticSwitchCatalog.version;

// --- Admin CRUD (used by the catalog admin page) ---

export async function upsertFirewallModel(model: CatalogModel): Promise<void> {
  if (isDemoMode()) {
    ensureDemoCatalogSeeded();
    const idx = demoFirewallModels!.findIndex((m) => m.id === model.id);
    if (idx >= 0) demoFirewallModels![idx] = model;
    else demoFirewallModels!.push(model);
    return;
  }

  await getDb()
    .insert(firewallModels)
    .values({
      id: model.id,
      name: model.name,
      sku: model.sku ?? null,
      licenseSku: model.licenseSku ?? null,
      environment: model.environment,
      formFactor: model.formFactor ?? null,
      threatProtectionMbps: model.threatProtectionMbps,
      xstreamSslMbps: model.xstreamSslMbps,
      ipsecVpnMbps: model.ipsecVpnMbps,
      maxIpsecTunnels: model.maxIpsecTunnels,
      maxSslVpnTunnels: model.maxSslVpnTunnels,
      maxConcurrentConnections: model.maxConcurrentConnections,
      minUsers: model.minUsers,
      maxUsers: model.maxUsers,
      vcpu: model.vcpu ?? null,
      ramGb: model.ramGb ?? null,
      awsInstance: model.awsInstance ?? null,
      azureVmSize: model.azureVmSize ?? null,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: firewallModels.id,
      set: {
        name: model.name,
        sku: model.sku ?? null,
        licenseSku: model.licenseSku ?? null,
        environment: model.environment,
        formFactor: model.formFactor ?? null,
        threatProtectionMbps: model.threatProtectionMbps,
        xstreamSslMbps: model.xstreamSslMbps,
        ipsecVpnMbps: model.ipsecVpnMbps,
        maxIpsecTunnels: model.maxIpsecTunnels,
        maxSslVpnTunnels: model.maxSslVpnTunnels,
        maxConcurrentConnections: model.maxConcurrentConnections,
        minUsers: model.minUsers,
        maxUsers: model.maxUsers,
        vcpu: model.vcpu ?? null,
        ramGb: model.ramGb ?? null,
        awsInstance: model.awsInstance ?? null,
        azureVmSize: model.azureVmSize ?? null,
        updatedAt: new Date(),
      },
    });
}

export async function deleteFirewallModel(id: string): Promise<void> {
  if (isDemoMode()) {
    ensureDemoCatalogSeeded();
    demoFirewallModels = demoFirewallModels!.filter((m) => m.id !== id);
    return;
  }
  await getDb().delete(firewallModels).where(eq(firewallModels.id, id));
}

export async function upsertSwitchModel(model: SwitchCatalogModel): Promise<void> {
  if (isDemoMode()) {
    ensureDemoCatalogSeeded();
    const idx = demoSwitchModels!.findIndex((m) => m.id === model.id);
    if (idx >= 0) demoSwitchModels![idx] = model;
    else demoSwitchModels!.push(model);
    return;
  }

  await getDb()
    .insert(switchModels)
    .values({ ...model, updatedAt: new Date() })
    .onConflictDoUpdate({
      target: switchModels.id,
      set: { ...model, updatedAt: new Date() },
    });
}

export async function deleteSwitchModel(id: string): Promise<void> {
  if (isDemoMode()) {
    ensureDemoCatalogSeeded();
    demoSwitchModels = demoSwitchModels!.filter((m) => m.id !== id);
    return;
  }
  await getDb().delete(switchModels).where(eq(switchModels.id, id));
}
