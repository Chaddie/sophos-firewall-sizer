import { SWITCH_CATALOG_VERSION, getSwitchCatalog } from "./catalog-store";
import type {
  BomLineItem,
  SizingTier,
  SwitchCatalogModel,
  SwitchModelOption,
  SwitchRecommendation,
  SwitchSiteAnswers,
} from "./types";

function requiredPoeWatts(answers: SwitchSiteAnswers): number {
  return (
    (answers.poe30wDeviceCount ?? 0) * 30 +
    (answers.poeBt60wDeviceCount ?? 0) * 60
  );
}

function modelMeetsSwitchConstraints(
  model: SwitchCatalogModel,
  answers: SwitchSiteAnswers,
): boolean {
  if (model.portCount < answers.switchPortCount) return false;
  if (answers.needs2_5GbE && model.ports2_5GbE < 1) return false;
  if (answers.needs10GbE && model.ports10GbE < 1) return false;
  if (answers.needs10GbSfpUplink && model.sfpPlusUplinkCount < 1) return false;

  if (answers.needsPoE) {
    if (!model.poeSupported) return false;
    const watts = requiredPoeWatts(answers);
    if (watts > model.poeBudgetWatts) return false;
    if ((answers.poeBt60wDeviceCount ?? 0) > 0 && !model.supportsBtPoE) {
      return false;
    }
  }

  return true;
}

function sortSwitchModels(models: SwitchCatalogModel[]): SwitchCatalogModel[] {
  return [...models].sort((a, b) => a.portCount - b.portCount);
}

const TIER_GUIDANCE: Record<SizingTier, string> = {
  minimum:
    "Meets requirements with no spare ports or PoE budget — consider Recommended or Optimal if you expect to add devices.",
  recommended:
    "Provides spare ports and PoE headroom above the minimum requirement. This is the default quoted model.",
  optimal:
    "Maximum spare capacity for future device additions or higher-power PoE devices.",
};

function buildModelCaveats(
  model: SwitchCatalogModel,
  answers: SwitchSiteAnswers,
): string[] {
  const caveats: string[] = [];

  const sparePorts = model.portCount - answers.switchPortCount;
  if (sparePorts <= 2) {
    caveats.push(
      `Only ${Math.max(sparePorts, 0)} spare port${sparePorts === 1 ? "" : "s"} available for future growth.`,
    );
  }

  if (answers.needsPoE && model.poeSupported && model.poeBudgetWatts > 0) {
    const watts = requiredPoeWatts(answers);
    const pct = (watts / model.poeBudgetWatts) * 100;
    if (pct > 75) {
      caveats.push(
        `Uses ~${Math.round(pct)}% of this model's PoE power budget (${model.poeBudgetWatts}W).`,
      );
    }
  }

  if (model.poeSupported && model.poeBudgetWatts > 0) {
    const ap30 = Math.floor(model.poeBudgetWatts / 30);
    const ap60 = Math.floor(model.poeBudgetWatts / 60);
    caveats.push(
      `Can power ~${ap30} Sophos APs at 30W (PoE+) or ~${ap60} at 60W (BT) from this model's ${model.poeBudgetWatts}W PoE budget.`,
    );
  }

  return caveats;
}

export async function calculateSwitchRecommendation(
  answers: SwitchSiteAnswers,
): Promise<SwitchRecommendation> {
  const allModels = await getSwitchCatalog();
  const candidates = sortSwitchModels(allModels);

  let minIndex = candidates.findIndex((model) =>
    modelMeetsSwitchConstraints(model, answers),
  );

  const noModelMeetsRequirements = minIndex === -1;
  if (noModelMeetsRequirements) {
    minIndex = candidates.length - 1;
  }

  const recommendedIndex = Math.min(minIndex + 1, candidates.length - 1);
  const optimalIndex = Math.min(minIndex + 2, candidates.length - 1);

  function buildOption(tier: SizingTier, index: number): SwitchModelOption {
    const model = candidates[index];
    const caveats = buildModelCaveats(model, answers);

    if (noModelMeetsRequirements && index === minIndex) {
      caveats.unshift(
        "No available switch fully meets the requirements — this is the largest available option.",
      );
    } else if (tier !== "minimum" && index === minIndex) {
      caveats.unshift(
        "This is the largest available model — there is no larger option for additional headroom.",
      );
    }

    caveats.push(TIER_GUIDANCE[tier]);

    return {
      tier,
      modelId: model.id,
      modelName: model.name,
      portCount: model.portCount,
      caveats,
    };
  }

  const modelOptions: SwitchModelOption[] = [
    buildOption("minimum", minIndex),
    buildOption("recommended", recommendedIndex),
    buildOption("optimal", optimalIndex),
  ];

  // The "recommended" tier drives the default BOM/quote — never quote the bare minimum.
  const selected = candidates[recommendedIndex];

  const sizingNotes: string[] = [];
  if (noModelMeetsRequirements) {
    sizingNotes.push(
      "No switch fully met all constraints; recommending the largest available model.",
    );
  }

  const constraintsMet: string[] = [
    `${answers.switchPortCount} ports required`,
  ];
  if (answers.needs2_5GbE) constraintsMet.push("2.5GbE access ports");
  if (answers.needs10GbE) constraintsMet.push("10GbE access ports");
  if (answers.needs10GbSfpUplink) constraintsMet.push("10Gb SFP+ uplink");
  if (answers.needsPoE) {
    constraintsMet.push(
      `PoE: ${answers.poe30wDeviceCount ?? 0}×30W, ${answers.poeBt60wDeviceCount ?? 0}×60W BT`,
    );
  }

  const bom = buildSwitchBom(selected);

  return {
    catalogVersion: SWITCH_CATALOG_VERSION,
    modelId: selected.id,
    modelName: selected.name,
    sizingNotes,
    constraintsMet,
    modelOptions,
    quotedTier: "recommended",
    bom,
  };
}

function buildSwitchBom(model: SwitchCatalogModel): BomLineItem[] {
  return [
    {
      sku: model.sku,
      description: `${model.name}`,
      quantity: 1,
      productType: "switch",
    },
  ];
}

/** Rebuilds the BOM for a specific catalog model, used when an AM/SE
 * overrides which tier (min/rec/optimal) should drive the quote. */
export async function rebuildSwitchBomForTier(
  modelId: string,
): Promise<{ modelId: string; modelName: string; bom: BomLineItem[] } | null> {
  const allModels = await getSwitchCatalog();
  const model = allModels.find((m) => m.id === modelId);
  if (!model) return null;

  return {
    modelId: model.id,
    modelName: model.name,
    bom: buildSwitchBom(model),
  };
}
