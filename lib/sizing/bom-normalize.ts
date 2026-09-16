import type {
  BomLineItem,
  SiteRecommendation,
  StoredRecommendation,
} from "./types";
import { isV2Recommendation } from "./types";

function isHaPairSupportSku(sku: string): boolean {
  return sku === "ENH-SUPPORT-PLUS";
}

/** Synthetic Standard / Xstream protection subscription SKUs from the engine. */
function isProtectionSubscriptionSku(sku: string): boolean {
  return sku.endsWith("-XP") || sku.endsWith("-STD");
}

function isWafLicenseSku(sku: string): boolean {
  return sku === "WAF-LICENSE";
}

function isHaPairLicenseSku(sku: string): boolean {
  return (
    isHaPairSupportSku(sku) ||
    isProtectionSubscriptionSku(sku) ||
    isWafLicenseSku(sku)
  );
}

/**
 * HA (active-passive) needs one Enhanced Support Plus, one protection
 * subscription, and one WAF license for the pair — not one per appliance.
 * Older stored recommendations may still have quantity 2 on those lines.
 */
export function normalizeBomQuantities(items: BomLineItem[]): BomLineItem[] {
  const hasHaSupport = items.some((item) => isHaPairSupportSku(item.sku));

  return items.map((item) => {
    if (isHaPairSupportSku(item.sku) && item.quantity !== 1) {
      return { ...item, quantity: 1 };
    }
    // When HA is present, pair licenses must stay at qty 1 even if appliances are ×2.
    if (
      hasHaSupport &&
      isHaPairLicenseSku(item.sku) &&
      item.quantity !== 1
    ) {
      return { ...item, quantity: 1 };
    }
    return item;
  });
}

export function bomNeedsHaSupportNormalization(items: BomLineItem[]): boolean {
  const hasHaSupport = items.some((item) => isHaPairSupportSku(item.sku));
  return items.some((item) => {
    if (isHaPairSupportSku(item.sku) && item.quantity !== 1) return true;
    if (
      hasHaSupport &&
      isHaPairLicenseSku(item.sku) &&
      item.quantity !== 1
    ) {
      return true;
    }
    return false;
  });
}

function recomputeConsolidatedBom(sites: SiteRecommendation[]): BomLineItem[] {
  const bom: BomLineItem[] = [];
  for (const site of sites) {
    if (site.firewall) bom.push(...site.firewall.bom);
    if (site.switches) bom.push(...site.switches.bom);
  }
  return normalizeBomQuantities(bom);
}

/** Fix HA support / protection qty on stored recommendations (incl. legacy). */
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
