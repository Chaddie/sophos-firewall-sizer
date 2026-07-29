"use client";

import { useRouter } from "next/navigation";
import { FirewallModelOptions } from "@/components/dashboard/firewall-model-options";
import { SwitchModelOptions } from "@/components/dashboard/switch-model-options";
import { setQuotedTierAction } from "@/lib/tier-actions";
import type {
  FirewallModelOption,
  SizingTier,
  SwitchModelOption,
} from "@/lib/sizing/types";

interface FirewallTierControlProps {
  requestId: string;
  siteName: string | null;
  options: FirewallModelOption[];
  quotedTier?: SizingTier;
}

export function FirewallTierControl({
  requestId,
  siteName,
  options,
  quotedTier,
}: FirewallTierControlProps) {
  const router = useRouter();

  async function handleQuote(tier: SizingTier) {
    const result = await setQuotedTierAction(
      requestId,
      siteName,
      "firewall",
      tier,
    );
    if (result && "error" in result) return result;
    router.refresh();
  }

  return (
    <FirewallModelOptions
      options={options}
      quotedTier={quotedTier}
      onQuote={handleQuote}
    />
  );
}

interface SwitchTierControlProps {
  requestId: string;
  siteName: string | null;
  options: SwitchModelOption[];
  quotedTier?: SizingTier;
}

export function SwitchTierControl({
  requestId,
  siteName,
  options,
  quotedTier,
}: SwitchTierControlProps) {
  const router = useRouter();

  async function handleQuote(tier: SizingTier) {
    const result = await setQuotedTierAction(
      requestId,
      siteName,
      "switches",
      tier,
    );
    if (result && "error" in result) return result;
    router.refresh();
  }

  return (
    <SwitchModelOptions
      options={options}
      quotedTier={quotedTier}
      onQuote={handleQuote}
    />
  );
}
