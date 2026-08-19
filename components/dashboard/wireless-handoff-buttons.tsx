"use client";

import { useEffect, useMemo, useState } from "react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import {
  SFDC_PLACEHOLDER,
  TIMEFRAME_PLACEHOLDER,
} from "@/lib/sizing/wireless-handoff";

interface WirelessHandoffButtonsProps {
  mailtoBase: {
    to: string;
    subject: string;
    bodyTemplate: string;
  };
  summaryText: string;
  filename: string;
  opportunityId?: string | null;
}

export function WirelessHandoffButtons({
  mailtoBase,
  summaryText,
  filename,
  opportunityId,
}: WirelessHandoffButtonsProps) {
  const [sfdcUrl, setSfdcUrl] = useState(opportunityId ?? "");
  const [timeframe, setTimeframe] = useState("");

  useEffect(() => {
    if (opportunityId) setSfdcUrl(opportunityId);
  }, [opportunityId]);

  const mailtoUrl = useMemo(() => {
    const body = mailtoBase.bodyTemplate
      .replace(
        SFDC_PLACEHOLDER,
        sfdcUrl.trim() || "[Account manager to complete]",
      )
      .replace(
        TIMEFRAME_PLACEHOLDER,
        timeframe.trim() || "[Account manager to complete]",
      );
    return `mailto:${mailtoBase.to}?subject=${encodeURIComponent(mailtoBase.subject)}&body=${encodeURIComponent(body)}`;
  }, [mailtoBase, sfdcUrl, timeframe]);

  const downloadText = useMemo(() => {
    return summaryText
      .replace(
        SFDC_PLACEHOLDER,
        sfdcUrl.trim() || "[Account manager to complete]",
      )
      .replace(
        TIMEFRAME_PLACEHOLDER,
        timeframe.trim() || "[Account manager to complete]",
      );
  }, [summaryText, sfdcUrl, timeframe]);

  function downloadSummary() {
    const blob = new Blob([downloadText], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <Label htmlFor="sfdcUrl">SFDC opportunity URL / ID</Label>
          <Input
            id="sfdcUrl"
            value={sfdcUrl}
            onChange={(e) => setSfdcUrl(e.target.value)}
            placeholder="https://… or opportunity ID"
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="timeframe">Survey plan timeframe</Label>
          <Input
            id="timeframe"
            value={timeframe}
            onChange={(e) => setTimeframe(e.target.value)}
            placeholder="e.g. within 2 weeks"
          />
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        <a
          href={mailtoUrl}
          className={cn(buttonVariants({ size: "sm", variant: "default" }))}
        >
          Email presales wireless team
        </a>
        <Button size="sm" variant="outline" onClick={downloadSummary}>
          Download summary
        </Button>
      </div>
    </div>
  );
}
