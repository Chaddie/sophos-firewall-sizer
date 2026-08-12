import { db } from "../lib/db";
import { accessoryModels, firewallModels, switchModels } from "../lib/db/schema";
import accessoryCatalog from "../lib/sizing/accessories.json";
import firewallCatalog from "../lib/sizing/catalog.json";
import switchCatalog from "../lib/sizing/switch-catalog.json";
import type {
  AccessoryModel,
  CatalogModel,
  SwitchCatalogModel,
} from "../lib/sizing/types";

/**
 * Populates firewall_models / switch_models / accessory_models from the
 * bundled catalog JSON. Safe to re-run: upserts by model id. Run once after
 * `scripts/migrate-v3.sql` / `migrate-v5.sql` on a fresh database, or any
 * time you want to reset a model back to its shipped defaults (edits made
 * via the catalog admin page for that id will be overwritten).
 */
async function seedCatalog() {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL is required");
    process.exit(1);
  }

  const fwModels = (firewallCatalog as { models: CatalogModel[] }).models;
  for (const model of fwModels) {
    await db
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
        redundantPsuSku: model.redundantPsuSku ?? null,
        redundantPsuName: model.redundantPsuName ?? null,
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
          redundantPsuSku: model.redundantPsuSku ?? null,
          redundantPsuName: model.redundantPsuName ?? null,
        },
      });
  }
  console.log(`Seeded ${fwModels.length} firewall models.`);

  const swModels = (switchCatalog as { models: SwitchCatalogModel[] }).models;
  for (const model of swModels) {
    await db
      .insert(switchModels)
      .values(model)
      .onConflictDoUpdate({ target: switchModels.id, set: model });
  }
  console.log(`Seeded ${swModels.length} switch models.`);

  const accModels = (accessoryCatalog as { models: AccessoryModel[] }).models;
  for (const model of accModels) {
    await db
      .insert(accessoryModels)
      .values(model)
      .onConflictDoUpdate({
        target: accessoryModels.id,
        set: {
          type: model.type,
          name: model.name,
          sku: model.sku,
        },
      });
  }
  console.log(`Seeded ${accModels.length} accessories.`);

  console.log("Catalog seed complete.");
  process.exit(0);
}

seedCatalog().catch((err) => {
  console.error(err);
  process.exit(1);
});
