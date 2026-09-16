/**
 * Headroom / capacity bands for Minimum · Recommended · Optimal.
 *
 * Demand already includes HEADROOM_FACTOR (25%) before models are compared.
 * These bands are additional capacity above that required figure (firewall
 * throughput) or spare ports (switches).
 */
export const REC_HEADROOM_PERCENT = 25;
export const OPT_HEADROOM_PERCENT = 50;

/** Switch: Recommended needs at least this many spare ports above request. */
export const REC_SPARE_PORTS = 4;
/** Switch: Optimal needs at least this many spare ports above request. */
export const OPT_SPARE_PORTS = 12;

/**
 * Pick Min / Rec / Opt indexes from a sorted candidate list.
 * `capacityAt(i)` returns the band metric for index i (headroom % or spare ports).
 * `meetsAt(i)` is true when the model at i passes hard constraints.
 */
export function pickTierIndexes(input: {
  candidateCount: number;
  meetsAt: (index: number) => boolean;
  capacityAt: (index: number) => number;
  recommendedBand: number;
  optimalBand: number;
}): {
  minIndex: number;
  recommendedIndex: number;
  optimalIndex: number;
  noModelMeetsRequirements: boolean;
} {
  const { candidateCount, meetsAt, capacityAt, recommendedBand, optimalBand } =
    input;
  if (candidateCount === 0) {
    return {
      minIndex: 0,
      recommendedIndex: 0,
      optimalIndex: 0,
      noModelMeetsRequirements: true,
    };
  }

  let minIndex = -1;
  for (let i = 0; i < candidateCount; i++) {
    if (meetsAt(i)) {
      minIndex = i;
      break;
    }
  }

  const noModelMeetsRequirements = minIndex === -1;
  if (noModelMeetsRequirements) {
    minIndex = candidateCount - 1;
  }

  function firstAtOrAbove(band: number, fromIndex: number): number {
    for (let i = fromIndex; i < candidateCount; i++) {
      if (capacityAt(i) >= band) return i;
    }
    return candidateCount - 1;
  }

  const recommendedIndex = noModelMeetsRequirements
    ? minIndex
    : firstAtOrAbove(recommendedBand, minIndex);
  const optimalIndex = noModelMeetsRequirements
    ? minIndex
    : firstAtOrAbove(optimalBand, recommendedIndex);

  return {
    minIndex,
    recommendedIndex,
    optimalIndex,
    noModelMeetsRequirements,
  };
}

export function formatWhyRecommended(input: {
  minName: string;
  recName: string;
  minCapacityLabel: string;
  recCapacityLabel: string;
  bandLabel: string;
}): string {
  if (input.minName === input.recName) {
    return `Recommended matches Minimum (${input.recName}) — already clears the ${input.bandLabel} band (${input.recCapacityLabel}).`;
  }
  return `Recommended is ${input.recName} (${input.recCapacityLabel}) vs Minimum ${input.minName} (${input.minCapacityLabel}) to clear the ${input.bandLabel} band.`;
}
