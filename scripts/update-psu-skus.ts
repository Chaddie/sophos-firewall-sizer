/**
 * One-off: set only redundantPsuSku / redundantPsuName on firewall_models
 * from bundled catalog.json (does not overwrite throughput or other admin edits).
 */
import { eq } from "drizzle-orm";
import { db } from "../lib/db";
import { firewallModels } from "../lib/db/schema";
import firewallCatalog from "../lib/sizing/catalog.json";
import type { CatalogModel } from "../lib/sizing/types";

async function updatePsuSkus() {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL is required");
    process.exit(1);
  }

  const models = (firewallCatalog as { models: CatalogModel[] }).models;
  let updated = 0;

  for (const model of models) {
    if (!model.environment.includes("physical")) continue;

    await db
      .update(firewallModels)
      .set({
        redundantPsuSku: model.redundantPsuSku ?? null,
        redundantPsuName: model.redundantPsuName ?? null,
        updatedAt: new Date(),
      })
      .where(eq(firewallModels.id, model.id));

    updated += 1;
    console.log(
      `${model.id}: ${model.redundantPsuSku ?? "(empty)"} / ${model.redundantPsuName ?? "(empty)"}`,
    );
  }

  console.log(`Updated PSU fields on ${updated} physical models.`);
  process.exit(0);
}

updatePsuSkus().catch((err) => {
  console.error(err);
  process.exit(1);
});
