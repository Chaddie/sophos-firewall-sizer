import {
  getSwitchCatalog,
  getSwitchCatalogProvenance,
} from "./catalog-store";
import {
  OPT_SPARE_PORTS,
  REC_SPARE_PORTS,
  formatWhyRecommended,
  pickTierIndexes,
} from "./tier-policy";
import type {
  BomLineItem,
  CatalogProvenance,
  SizingConfidence,
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
): { meets: boolean; failingConstraint?: string } {
  if (model.portCount < answers.switchPortCount) {
    return {
      meets: false,
      failingConstraint: `Ports ${model.portCount} < ${answers.switchPortCount} required`,
    };
  }
  if (answers.needs2_5GbE && model.ports2_5GbE < 1) {
    return { meets: false, failingConstraint: "2.5GbE access ports required" };
  }
  if (answers.needs10GbE && model.ports10GbE < 1) {
    return { meets: false, failingConstraint: "10GbE access ports required" };
  }
  if (answers.needs10GbSfpUplink && model.sfpPlusUplinkCount < 1) {
    return { meets: false, failingConstraint: "10Gb SFP+ uplink required" };
  }

  if (answers.needsPoE) {
    if (!model.poeSupported) {
      return { meets: false, failingConstraint: "PoE support required" };
    }
    const watts = requiredPoeWatts(answers);
    if (watts > model.poeBudgetWatts) {
      return {
        meets: false,
        failingConstraint: `PoE budget ${model.poeBudgetWatts}W < ${watts}W required`,
      };
    }
    if ((answers.poeBt60wDeviceCount ?? 0) > 0 && !model.supportsBtPoE) {
      return { meets: false, failingConstraint: "BT / 60W PoE support required" };
    }
  }

  return { meets: true };
}

function sortSwitchModels(models: SwitchCatalogModel[]): SwitchCatalogModel[] {
  return [...models].sort((a, b) => a.portCount - b.portCount);
}

const TIER_GUIDANCE: Record<SizingTier, string> = {
  minimum:
    "Meets requirements with no spare-port band — consider Recommended or Optimal if you expect to add devices.",
  recommended: `Smallest model with ≥${REC_SPARE_PORTS} spare ports above the request. This is the default quoted model.`,
  optimal: `Smallest model with ≥${OPT_SPARE_PORTS} spare ports for future device additions or higher-power PoE devices.`,
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

function computeConfidence(input: {
  noModelMeetsRequirements: boolean;
  caveats: string[];
  sparePorts: number;
}): SizingConfidence {
  if (input.noModelMeetsRequirements) return "red";
  if (
    input.sparePorts <= 2 ||
    input.caveats.some((c) => c.includes("Uses ~") || c.includes("Only "))
  ) {
    return "amber";
  }
  return "green";
}

/** Pure calculator — used by runtime + golden tests. */
export function calculateSwitchRecommendationFromModels(
  answers: SwitchSiteAnswers,
  allModels: SwitchCatalogModel[],
  provenance: CatalogProvenance,
): SwitchRecommendation {
  const candidates = sortSwitchModels(allModels);

  const {
    minIndex,
    recommendedIndex,
    optimalIndex,
    noModelMeetsRequirements,
  } = pickTierIndexes({
    candidateCount: candidates.length,
    meetsAt: (i) => modelMeetsSwitchConstraints(candidates[i], answers).meets,
    capacityAt: (i) =>
      Math.max(0, candidates[i].portCount - answers.switchPortCount),
    recommendedBand: REC_SPARE_PORTS,
    optimalBand: OPT_SPARE_PORTS,
  });

  function buildOption(tier: SizingTier, index: number): SwitchModelOption {
    const model = candidates[index];
    const caveats = buildModelCaveats(model, answers);
    const sparePorts = Math.max(0, model.portCount - answers.switchPortCount);

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
      sparePorts,
      caveats,
    };
  }

  const modelOptions: SwitchModelOption[] = [
    buildOption("minimum", minIndex),
    buildOption("recommended", recommendedIndex),
    buildOption("optimal", optimalIndex),
  ];

  const selected = candidates[recommendedIndex];
  const minModel = candidates[minIndex];
  const minOption = modelOptions[0];
  const recOption = modelOptions[1];

  let bindingConstraint = `Primary driver: ${answers.switchPortCount} ports`;
  if (noModelMeetsRequirements) {
    bindingConstraint =
      "No switch fully meets requirements — largest available model selected";
  } else if (minIndex > 0) {
    const prev = modelMeetsSwitchConstraints(candidates[minIndex - 1], answers);
    if (prev.failingConstraint) bindingConstraint = prev.failingConstraint;
  }

  const whyRecommended = formatWhyRecommended({
    minName: minModel.name,
    recName: selected.name,
    minCapacityLabel: `${minOption.sparePorts ?? 0} spare ports`,
    recCapacityLabel: `${recOption.sparePorts ?? 0} spare ports`,
    bandLabel: `≥${REC_SPARE_PORTS} spare ports`,
  });

  const confidence = computeConfidence({
    noModelMeetsRequirements,
    caveats: recOption.caveats,
    sparePorts: recOption.sparePorts ?? 0,
  });

  const sizingNotes: string[] = [
    `Binding constraint: ${bindingConstraint}`,
    whyRecommended,
  ];
  if (noModelMeetsRequirements) {
    sizingNotes.push(
      "No switch fully met all constraints; recommending the largest available model.",
    );
  }

  const constraintsMet: string[] = [
    `${answers.switchPortCount} ports required`,
    `${Math.max(1, answers.switchQuantity ?? 1)} unit${(answers.switchQuantity ?? 1) === 1 ? "" : "s"}`,
  ];
  if (answers.needs2_5GbE) constraintsMet.push("2.5GbE access ports");
  if (answers.needs10GbE) constraintsMet.push("10GbE access ports");
  if (answers.needs10GbSfpUplink) constraintsMet.push("10Gb SFP+ uplink");
  if (answers.needsPoE) {
    constraintsMet.push(
      `PoE: ${answers.poe30wDeviceCount ?? 0}×30W, ${answers.poeBt60wDeviceCount ?? 0}×60W BT`,
    );
  }

  return {
    catalogVersion: provenance.version,
    catalogProvenance: provenance,
    modelId: selected.id,
    modelName: selected.name,
    bindingConstraint,
    whyRecommended,
    confidence,
    sizingNotes,
    constraintsMet,
    modelOptions,
    quotedTier: "recommended",
    bom: buildSwitchBom(selected, answers.switchQuantity ?? 1),
  };
}

export async function calculateSwitchRecommendation(
  answers: SwitchSiteAnswers,
): Promise<SwitchRecommendation> {
  const [allModels, provenance] = await Promise.all([
    getSwitchCatalog(),
    getSwitchCatalogProvenance(),
  ]);
  return calculateSwitchRecommendationFromModels(
    answers,
    allModels,
    provenance,
  );
}

function buildSwitchBom(
  model: SwitchCatalogModel,
  quantity = 1,
): BomLineItem[] {
  const qty = Math.max(1, Math.floor(quantity) || 1);
  return [
    {
      sku: model.sku,
      description: `${model.name}`,
      quantity: qty,
      productType: "switch",
    },
  ];
}

/** Rebuilds the BOM for a specific catalog model, used when an AM/SE
 * overrides which tier (min/rec/optimal) should drive the quote. */
export async function rebuildSwitchBomForTier(
  modelId: string,
  quantity = 1,
): Promise<{ modelId: string; modelName: string; bom: BomLineItem[] } | null> {
  const allModels = await getSwitchCatalog();
  const model = allModels.find((m) => m.id === modelId);
  if (!model) return null;

  return {
    modelId: model.id,
    modelName: model.name,
    bom: buildSwitchBom(model, quantity),
  };
}
