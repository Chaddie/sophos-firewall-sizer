import type {
  BomLineItem,
  SiteRecommendation,
  StoredRecommendation,
} from "./types";
import { isV2Recommendation } from "./types";

/**
 * HA needs one Enhanced Support Plus entitlement for the pair, not one per
 * appliance. Older stored recommendations may still have quantity 2.
 */
export function normalizeBomQuantities(items: BomLineItem[]): BomLineItem[] {
  return items.map((item) =>
    item.sku === "ENH-SUPPORT-PLUS" && item.quantity !== 1
      ? { ...item, quantity: 1 }
      : item,
  );
}

export function bomNeedsHaSupportNormalization(items: BomLineItem[]): boolean {
  return items.some(
    (item) => item.sku === "ENH-SUPPORT-PLUS" && item.quantity !== 1,
  );
}

function recomputeConsolidatedBom(sites: SiteRecommendation[]): BomLineItem[] {
  const bom: BomLineItem[] = [];
  for (const site of sites) {
    if (site.firewall) bom.push(...site.firewall.bom);
    if (site.switches) bom.push(...site.switches.bom);
  }
  return normalizeBomQuantities(bom);
}

/** Fix HA Enhanced Support Plus qty on stored recommendations (incl. legacy). */
export function normalizeStoredRecommendation(
  recommendation: StoredRecommendation,
): { recommendation: StoredRecommendation; changed: boolean } {
  if (isV2Recommendation(recommendation)) {
    let changed = false;
    const sites = recommendation.sites.map((site) => {
      if (!site.firewall) return site;
      if (!bomNeedsHaSupportNormalization(site.firewall.bom)) return site;
      changed = true;
      return {
        ...site,
        firewall: {
          ...site.firewall,
          bom: normalizeBomQuantities(site.firewall.bom),
        },
      };
    });
    const bom = recomputeConsolidatedBom(sites);
    if (!changed && !bomNeedsHaSupportNormalization(recommendation.bom)) {
      return { recommendation, changed: false };
    }
    return {
      recommendation: { ...recommendation, sites, bom },
      changed: true,
    };
  }

  if (!bomNeedsHaSupportNormalization(recommendation.bom)) {
    return { recommendation, changed: false };
  }
  return {
    recommendation: {
      ...recommendation,
      bom: normalizeBomQuantities(recommendation.bom),
    },
    changed: true,
  };
}
