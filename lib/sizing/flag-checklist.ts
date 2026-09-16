import {
  isV2Answers,
  isV2Recommendation,
  type BomLineItem,
  type StoredAnswers,
  type StoredRecommendation,
} from "@/lib/sizing/types";

/** Placeholder / synthetic SKUs that should not be pasted into CPQ as-is. */
const SIZING_ONLY_SKU_RE =
  /(-STD|-XP)$|^(WAF-LICENSE|ENH-SUPPORT-PLUS|AWS-EC2|AZURE-VM|SFP-SR|SFP-LR)$/i;

export function isSizingOnlySku(sku: string): boolean {
  return SIZING_ONLY_SKU_RE.test(sku.trim());
}

export function bomHasSizingOnlySkus(bom: BomLineItem[]): boolean {
  return bom.some((line) => isSizingOnlySku(line.sku));
}

export type FlagChecklistItem = {
  id: string;
  label: string;
  ok: boolean;
  detail?: string;
};

export function buildFlagChecklist(input: {
  opportunityId?: string | null;
  answers?: StoredAnswers | null;
  recommendation?: StoredRecommendation | null;
}): FlagChecklistItem[] {
  const items: FlagChecklistItem[] = [];

  items.push({
    id: "opportunity",
    label: "Opportunity / deal ID set",
    ok: Boolean(input.opportunityId?.trim()),
    detail: input.opportunityId?.trim()
      ? undefined
      : "Add the SFDC opportunity ID before CPQ handoff.",
  });

  let hasWireless = false;
  if (input.answers && isV2Answers(input.answers)) {
    hasWireless = input.answers.sites.some((s) => Boolean(s.products.wireless));
  }

  if (hasWireless) {
    items.push({
      id: "wireless",
      label: "Wireless handoff ready",
      ok: Boolean(input.opportunityId?.trim()),
      detail: input.opportunityId?.trim()
        ? "Opportunity ID present for the wireless handoff email."
        : "Wireless sites need an opportunity ID before sending the presales handoff.",
    });
  }

  let bom: BomLineItem[] = [];
  if (input.recommendation) {
    bom = isV2Recommendation(input.recommendation)
      ? input.recommendation.bom
      : input.recommendation.bom;
  }

  const sizingOnly = bomHasSizingOnlySkus(bom);
  items.push({
    id: "sizing-only-skus",
    label: "No sizing-only subscription SKUs in export",
    ok: !sizingOnly,
    detail: sizingOnly
      ? "BOM includes placeholder protection/WAF/support/cloud lines — map in Catalog or exclude from CPQ paste."
      : undefined,
  });

  return items;
}

export const NEEDS_CHANGES_TEMPLATES: {
  id: string;
  label: string;
  body: string;
}[] = [
  {
    id: "peak-wan",
    label: "Peak WAN unclear",
    body: "Peak WAN / expected peak throughput is unclear — please confirm circuit speed, typical usage, and expected peak before we finalize the size.",
  },
  {
    id: "ha-role",
    label: "HA role missing",
    body: "High availability role is missing or incomplete — please confirm whether HA is required and which site is active/passive.",
  },
  {
    id: "wireless-floor",
    label: "Wireless floor plan needed",
    body: "Wireless floor plan / site plan is needed before we can hand off to the wireless desk — please re-open and upload plans or note coverage areas.",
  },
  {
    id: "vpn-counts",
    label: "VPN counts unclear",
    body: "VPN tunnel counts or peak VPN throughput need clarification (IPsec vs SSL) before we can defend the recommended model.",
  },
  {
    id: "branch-wan",
    label: "Branch WAN incomplete",
    body: "One or more branch sites are missing WAN or endpoint detail — please complete those fields and resubmit.",
  },
];
