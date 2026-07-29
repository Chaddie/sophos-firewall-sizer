"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { SizingTier } from "@/lib/sizing/types";

const TIER_LABELS: Record<SizingTier, string> = {
  minimum: "Minimum",
  recommended: "Recommended",
  optimal: "Optimal",
};

export interface TieredOption {
  tier: SizingTier;
  modelName: string;
  subtitle: string;
  caveats: string[];
}

interface TieredModelOptionsProps {
  title: string;
  options: TieredOption[];
  /** Which tier currently drives the quoted BOM. Defaults to "recommended". */
  quotedTier?: SizingTier;
  /** If provided, renders a "Quote this tier" button on non-quoted cards. */
  onQuote?: (tier: SizingTier) => Promise<{ error?: string } | void>;
}

export function TieredModelOptions({
  title,
  options,
  quotedTier = "recommended",
  onQuote,
}: TieredModelOptionsProps) {
  const [pending, setPending] = useState<SizingTier | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (options.length === 0) return null;

  async function handleQuote(tier: SizingTier) {
    if (!onQuote) return;
    setPending(tier);
    setError(null);
    const result = await onQuote(tier);
    setPending(null);
    if (result?.error) setError(result.error);
  }

  return (
    <div>
      <p className="mb-2 text-sm font-medium">{title}</p>
      <div className="grid gap-3 sm:grid-cols-3">
        {options.map((opt) => {
          const isQuoted = opt.tier === quotedTier;
          return (
            <div
              key={opt.tier}
              className={`space-y-2 rounded-lg border p-3 ${
                isQuoted
                  ? "border-[var(--sophos-blue)] bg-[var(--sophos-blue)]/5"
                  : "border-[var(--sophos-grey-2)]"
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold uppercase tracking-wide text-[var(--sophos-navy)]">
                  {TIER_LABELS[opt.tier]}
                </span>
                {isQuoted && <Badge variant="default">Quoted</Badge>}
              </div>
              <p className="text-sm font-medium">{opt.modelName}</p>
              <p className="text-muted-foreground text-xs">{opt.subtitle}</p>
              {opt.caveats.length > 0 && (
                <ul className="text-muted-foreground list-disc space-y-1 pl-4 text-xs">
                  {opt.caveats.map((c) => (
                    <li key={c}>{c}</li>
                  ))}
                </ul>
              )}
              {onQuote && !isQuoted && (
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full"
                  disabled={pending !== null}
                  onClick={() => handleQuote(opt.tier)}
                >
                  {pending === opt.tier ? "Updating…" : "Quote this tier"}
                </Button>
              )}
            </div>
          );
        })}
      </div>
      {error && <p className="text-destructive mt-2 text-xs">{error}</p>}
    </div>
  );
}
