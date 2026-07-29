import { TieredModelOptions } from "@/components/dashboard/tiered-model-options";
import type { FirewallModelOption, SizingTier } from "@/lib/sizing/types";

interface FirewallModelOptionsProps {
  options: FirewallModelOption[];
  quotedTier?: SizingTier;
  onQuote?: (tier: SizingTier) => Promise<{ error?: string } | void>;
}

export function FirewallModelOptions({
  options,
  quotedTier,
  onQuote,
}: FirewallModelOptionsProps) {
  return (
    <TieredModelOptions
      title="Firewall model options"
      quotedTier={quotedTier}
      onQuote={onQuote}
      options={options.map((opt) => ({
        tier: opt.tier,
        modelName: opt.modelName,
        subtitle: `${opt.throughputMbps} Mbps (${opt.headroomPercent >= 0 ? "+" : ""}${opt.headroomPercent}% headroom)${opt.instanceRecommendation ? ` — ${opt.instanceRecommendation}` : ""}`,
        caveats: opt.caveats,
      }))}
    />
  );
}
