"use client";

import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface WirelessHandoffButtonsProps {
  mailtoUrl: string;
  summaryText: string;
  filename: string;
}

export function WirelessHandoffButtons({
  mailtoUrl,
  summaryText,
  filename,
}: WirelessHandoffButtonsProps) {
  function downloadSummary() {
    const blob = new Blob([summaryText], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
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
  );
}
