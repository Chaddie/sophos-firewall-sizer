"use client";

import { useState } from "react";
import { Check, Copy, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";

interface CopyQuoteButtonProps {
  text: string;
  disabled?: boolean;
  disabledReason?: string | null;
}

export function CopyQuoteButton({
  text,
  disabled = false,
  disabledReason,
}: CopyQuoteButtonProps) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    if (disabled) return;
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (disabled) {
    return (
      <div className="flex flex-col items-end gap-1">
        <Button type="button" variant="outline" size="sm" disabled>
          <Lock className="size-4" />
          Copy quote
        </Button>
        {disabledReason ? (
          <p className="text-muted-foreground max-w-xs text-right text-xs">
            {disabledReason}
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <Button type="button" variant="outline" size="sm" onClick={handleCopy}>
      {copied ? (
        <>
          <Check className="size-4" />
          Copied
        </>
      ) : (
        <>
          <Copy className="size-4" />
          Copy quote
        </>
      )}
    </Button>
  );
}
