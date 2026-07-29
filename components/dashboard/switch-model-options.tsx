import { TieredModelOptions } from "@/components/dashboard/tiered-model-options";
import type { SizingTier, SwitchModelOption } from "@/lib/sizing/types";

interface SwitchModelOptionsProps {
  options: SwitchModelOption[];
  quotedTier?: SizingTier;
  onQuote?: (tier: SizingTier) => Promise<{ error?: string } | void>;
}

export function SwitchModelOptions({
  options,
  quotedTier,
  onQuote,
}: SwitchModelOptionsProps) {
  return (
    <TieredModelOptions
      title="Switch model options"
      quotedTier={quotedTier}
      onQuote={onQuote}
      options={options.map((opt) => ({
        tier: opt.tier,
        modelName: opt.modelName,
        subtitle: `${opt.portCount} ports`,
        caveats: opt.caveats,
      }))}
    />
  );
}
