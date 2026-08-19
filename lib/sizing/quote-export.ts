import type {
  BomLineItem,
  StoredRecommendation,
} from "@/lib/sizing/types";
import { isV2Recommendation } from "@/lib/sizing/types";

function csvEscape(value: string | number | undefined | null): string {
  const raw = value == null ? "" : String(value);
  if (/[",\n\r]/.test(raw)) {
    return `"${raw.replace(/"/g, '""')}"`;
  }
  return raw;
}

export function getBomLines(recommendation: StoredRecommendation): BomLineItem[] {
  if (isV2Recommendation(recommendation)) {
    return recommendation.bom;
  }
  return recommendation.bom;
}

export function bomToCsv(
  recommendation: StoredRecommendation,
  options?: { opportunityId?: string | null; label?: string | null },
): string {
  const lines = getBomLines(recommendation);
  const header = [
    "quantity",
    "sku",
    "description",
    "site",
    "product_type",
    "opportunity_id",
    "request_label",
  ].join(",");

  const rows = lines.map((item) =>
    [
      item.quantity,
      item.sku,
      item.description,
      item.siteName ?? "",
      item.productType ?? "",
      options?.opportunityId ?? "",
      options?.label ?? "",
    ]
      .map(csvEscape)
      .join(","),
  );

  if (rows.length === 0) {
    rows.push(
      ["", "", "No BOM line items", "", "", options?.opportunityId ?? "", options?.label ?? ""]
        .map(csvEscape)
        .join(","),
    );
  }

  return [header, ...rows].join("\n");
}

export function quoteSummaryFilename(label?: string | null): string {
  const base = (label ?? "sophos-sizing-quote")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return `${base || "sophos-sizing-quote"}-bom`;
}

export function downloadTextFile(filename: string, content: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
