import { calculateRecommendation } from "./engine";
import { calculateSwitchRecommendation } from "./switch-engine";
import { buildWirelessHandoff } from "./wireless-handoff";
import { normalizeBomQuantities } from "./bom-normalize";
import type {
  BomLineItem,
  SiteRecommendation,
  SiteSubmission,
  SizingSubmissionAnswers,
  SizingSubmissionRecommendation,
} from "./types";
import type { SizingSubmissionInput } from "@/lib/validations";

export {
  normalizeBomQuantities,
  normalizeStoredRecommendation,
} from "./bom-normalize";

export function siteDisplayLabel(siteName: string, siteQuantity = 1): string {
  const qty = Math.max(1, Math.floor(siteQuantity) || 1);
  return qty > 1 ? `${siteName} (×${qty})` : siteName;
}

export function scaleBomQuantities(
  items: BomLineItem[],
  siteQuantity = 1,
): BomLineItem[] {
  const qty = Math.max(1, Math.floor(siteQuantity) || 1);
  if (qty === 1) return items;
  return items.map((item) => ({
    ...item,
    quantity: item.quantity * qty,
  }));
}

export function prefixBom(
  items: BomLineItem[],
  siteName: string,
  productType: BomLineItem["productType"],
): BomLineItem[] {
  return items.map((item) => ({
    ...item,
    siteName,
    productType,
    description: item.description.startsWith(`${siteName} — `)
      ? item.description
      : `${siteName} — ${item.description}`,
  }));
}

/** Rebuilds the consolidated top-level BOM from each site's current firewall/switch BOM. */
export function recomputeConsolidatedBom(
  sites: SiteRecommendation[],
): BomLineItem[] {
  const bom: BomLineItem[] = [];
  for (const site of sites) {
    if (site.firewall) bom.push(...site.firewall.bom);
    if (site.switches) bom.push(...site.switches.bom);
  }
  return normalizeBomQuantities(bom);
}

export function siteInputToSubmission(
  site: SizingSubmissionInput["sites"][number],
): SiteSubmission {
  return {
    siteName: site.siteName,
    siteQuantity: Math.max(1, Math.floor(site.siteQuantity ?? 1) || 1),
    products: {
      ...(site.enableFirewall && site.firewall
        ? { firewall: site.firewall }
        : {}),
      ...(site.enableSwitches && site.switches
        ? { switches: site.switches }
        : {}),
      ...(site.enableWireless && site.wireless
        ? { wireless: site.wireless }
        : {}),
    },
  };
}

export function inputToSubmissionAnswers(
  input: SizingSubmissionInput,
): SizingSubmissionAnswers {
  const notes = input.additionalNotes?.trim();
  return {
    schemaVersion: 2,
    contact: input.contact
      ? {
          customerName: input.contact.customerName,
          customerEmail: input.contact.customerEmail || undefined,
        }
      : undefined,
    ...(notes ? { additionalNotes: notes } : {}),
    sites: input.sites.map(siteInputToSubmission),
  };
}

export async function calculateSubmission(
  answers: SizingSubmissionAnswers,
  companyLabel?: string,
): Promise<SizingSubmissionRecommendation> {
  const sites: SiteRecommendation[] = [];

  for (const site of answers.sites) {
    const siteQuantity = Math.max(1, Math.floor(site.siteQuantity ?? 1) || 1);
    const bomLabel = siteDisplayLabel(site.siteName, siteQuantity);
    const siteRec: SiteRecommendation = {
      siteName: site.siteName,
      siteQuantity,
    };

    if (site.products.firewall) {
      const fwRec = await calculateRecommendation(site.products.firewall);
      siteRec.firewall = {
        ...fwRec,
        bom: scaleBomQuantities(
          prefixBom(fwRec.bom, bomLabel, "firewall"),
          siteQuantity,
        ),
      };
    }

    if (site.products.switches) {
      const swRec = await calculateSwitchRecommendation(site.products.switches);
      siteRec.switches = {
        ...swRec,
        bom: scaleBomQuantities(
          prefixBom(swRec.bom, bomLabel, "switch"),
          siteQuantity,
        ),
      };
    }

    if (site.products.wireless) {
      siteRec.wireless = buildWirelessHandoff(
        bomLabel,
        site.products.wireless,
        companyLabel,
        siteQuantity,
      );
    }

    sites.push(siteRec);
  }

  return {
    schemaVersion: 2,
    sites,
    bom: recomputeConsolidatedBom(sites),
  };
}
