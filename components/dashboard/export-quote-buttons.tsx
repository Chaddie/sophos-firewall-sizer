"use client";

import { Download, Lock } from "lucide-react";
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
  /** When false, CSV/summary download is blocked (soft gate until SE review). */
  exportAllowed?: boolean;
  exportBlockedReason?: string | null;
}

export function ExportQuoteButtons({
  recommendation,
  quoteText,
  opportunityId,
  label,
  exportAllowed = true,
  exportBlockedReason,
}: ExportQuoteButtonsProps) {
  const base = quoteSummaryFilename(label);

  function exportCsv() {
    if (!exportAllowed) return;
    const csv = bomToCsv(recommendation, { opportunityId, label });
    downloadTextFile(`${base}.csv`, csv, "text/csv;charset=utf-8");
  }

  function exportSummary() {
    if (!exportAllowed) return;
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

  if (!exportAllowed) {
    return (
      <div className="flex flex-col items-end gap-1">
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" size="sm" disabled>
            <Lock className="size-4" />
            Export CSV
          </Button>
          <Button type="button" variant="outline" size="sm" disabled>
            <Lock className="size-4" />
            Export summary
          </Button>
        </div>
        <p className="text-muted-foreground max-w-xs text-right text-xs">
          {exportBlockedReason ??
            "Export unlocks after a Sales Engineer marks this request as reviewed."}
        </p>
      </div>
    );
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
