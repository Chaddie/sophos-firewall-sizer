import { calculateRecommendation } from "./engine";
import { calculateSwitchRecommendation } from "./switch-engine";
import { buildWirelessHandoff } from "./wireless-handoff";
import type {
  BomLineItem,
  SiteRecommendation,
  SiteSubmission,
  SizingSubmissionAnswers,
  SizingSubmissionRecommendation,
} from "./types";
import type { SizingSubmissionInput } from "@/lib/validations";

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
  return bom;
}

export function siteInputToSubmission(
  site: SizingSubmissionInput["sites"][number],
): SiteSubmission {
  return {
    siteName: site.siteName,
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
  return {
    schemaVersion: 2,
    contact: input.contact
      ? {
          customerName: input.contact.customerName,
          customerEmail: input.contact.customerEmail || undefined,
        }
      : undefined,
    sites: input.sites.map(siteInputToSubmission),
  };
}

export async function calculateSubmission(
  answers: SizingSubmissionAnswers,
  companyLabel?: string,
): Promise<SizingSubmissionRecommendation> {
  const sites: SiteRecommendation[] = [];

  for (const site of answers.sites) {
    const siteRec: SiteRecommendation = { siteName: site.siteName };

    if (site.products.firewall) {
      const fwRec = await calculateRecommendation(site.products.firewall);
      siteRec.firewall = {
        ...fwRec,
        bom: prefixBom(fwRec.bom, site.siteName, "firewall"),
      };
    }

    if (site.products.switches) {
      const swRec = await calculateSwitchRecommendation(site.products.switches);
      siteRec.switches = {
        ...swRec,
        bom: prefixBom(swRec.bom, site.siteName, "switch"),
      };
    }

    if (site.products.wireless) {
      siteRec.wireless = buildWirelessHandoff(
        site.siteName,
        site.products.wireless,
        companyLabel,
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
