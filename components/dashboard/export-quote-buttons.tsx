"use client";

import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  bomToCsv,
  downloadTextFile,
  quoteSummaryFilename,
} from "@/lib/sizing/quote-export";
import type { StoredRecommendation } from "@/lib/sizing/types";

interface ExportQuoteButtonsProps {
  recommendation: StoredRecommendation;
  quoteText: string;
  opportunityId?: string | null;
  label?: string | null;
}

export function ExportQuoteButtons({
  recommendation,
  quoteText,
  opportunityId,
  label,
}: ExportQuoteButtonsProps) {
  const base = quoteSummaryFilename(label);

  function exportCsv() {
    const csv = bomToCsv(recommendation, { opportunityId, label });
    downloadTextFile(`${base}.csv`, csv, "text/csv;charset=utf-8");
  }

  function exportSummary() {
    const text = [
      "Sophos Hardware Sizing — Quote / BOM",
      label ? `Request: ${label}` : null,
      opportunityId ? `Opportunity ID: ${opportunityId}` : null,
      "",
      quoteText,
    ]
      .filter((line) => line != null)
      .join("\n");
    downloadTextFile(`${base}.txt`, text, "text/plain;charset=utf-8");
  }

  return (
    <div className="flex flex-wrap gap-2">
      <Button type="button" variant="outline" size="sm" onClick={exportCsv}>
        <Download className="size-4" />
        Export CSV
      </Button>
      <Button type="button" variant="outline" size="sm" onClick={exportSummary}>
        <Download className="size-4" />
        Export summary
      </Button>
    </div>
  );
}
