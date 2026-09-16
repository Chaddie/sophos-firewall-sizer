import { CATALOG_VERSION, getAccessoryByType, getFirewallCatalog } from "./catalog-store";
import { normalizeStoredRecommendation } from "./bom-normalize";
import type {
  BomLineItem,
  CatalogModel,
  Environment,
  FirewallModelOption,
  FirewallModelTier,
  ProtectionLevel,
  SiteRole,
  SizingAnswers,
  SizingRecommendation,
  TlsInspectionScope,
} from "./types";

const HEADROOM_FACTOR = 1.25;
const CONNECTIONS_PER_ENDPOINT = 75;

function getThroughputMetric(
  model: CatalogModel,
  protection: ProtectionLevel,
  tlsScope: TlsInspectionScope,
): number {
  const threat = model.threatProtectionMbps;
  const xstream = model.xstreamSslMbps;

  if (protection === "standard") {
    if (tlsScope === "minimal") return threat;
    if (tlsScope === "selective") return threat * 0.95;
    return threat * 0.9;
  }

  if (tlsScope === "full") return xstream;
  if (tlsScope === "selective") {
    return xstream * 0.85 + threat * 0.15;
  }
  return xstream * 0.6 + threat * 0.4;
}

function estimateConcurrentConnections(answers: SizingAnswers): number {
  const endpoints =
    answers.endpointCount ??
    answers.authUserCount ??
    (answers.siteRole === "branch" ? 25 : 50);
  return endpoints * CONNECTIONS_PER_ENDPOINT;
}

export function computeRequiredMbps(answers: SizingAnswers): {
  requiredMbps: number;
  peakDemand: number;
  vpnDemand: number;
  internalDemand: number;
  sizingBasis: string;
} {
  const futureAverage =
    answers.averageWanConsumptionMbps *
    (1 + answers.wanGrowth3yrPercent / 100);

  const internalDemand = answers.internalTrafficEnabled
    ? (answers.internalTrafficMbps ?? 0)
    : 0;

  const peakDemand = Math.max(
    futureAverage,
    answers.expectedPeakThroughputMbps,
    answers.totalWanBandwidthMbps * 0.8,
    internalDemand,
  );

  const vpnDemand =
    answers.vpnType !== "none" ? (answers.peakVpnThroughputMbps ?? 0) : 0;

  const requiredMbps = Math.max(peakDemand, vpnDemand) * HEADROOM_FACTOR;

  const sizingBasis = `${Math.round(requiredMbps)} Mbps required (peak ${Math.round(peakDemand)} Mbps${internalDemand > 0 ? `, internal ${Math.round(internalDemand)} Mbps` : ""}${vpnDemand > 0 ? `, VPN ${Math.round(vpnDemand)} Mbps` : ""} + 25% headroom)`;

  return { requiredMbps, peakDemand, vpnDemand, internalDemand, sizingBasis };
}

function modelMeetsConstraints(
  model: CatalogModel,
  answers: SizingAnswers,
  requiredMbps: number,
  requiredConnections: number,
): { meets: boolean; notes: string[] } {
  const throughput = getThroughputMetric(
    model,
    answers.protection,
    answers.tlsInspectionScope,
  );
  const notes: string[] = [];

  if (throughput < requiredMbps) {
    return {
      meets: false,
      notes: [
        `Throughput ${Math.round(throughput)} Mbps < ${Math.round(requiredMbps)} Mbps required`,
      ],
    };
  }

  if (requiredConnections > model.maxConcurrentConnections) {
    return {
      meets: false,
      notes: [
        `Est. connections ${requiredConnections.toLocaleString()} > max ${model.maxConcurrentConnections.toLocaleString()}`,
      ],
    };
  }

  if (answers.vpnType === "ipsec" || answers.vpnType === "both") {
    const ipsec = answers.ipsecTunnels ?? 0;
    if (ipsec > model.maxIpsecTunnels) {
      return {
        meets: false,
        notes: [`IPsec tunnels ${ipsec} > max ${model.maxIpsecTunnels}`],
      };
    }
  }

  if (answers.vpnType === "ssl" || answers.vpnType === "both") {
    const ssl = answers.sslVpnTunnels ?? 0;
    if (ssl > model.maxSslVpnTunnels) {
      return {
        meets: false,
        notes: [`SSL VPN tunnels ${ssl} > max ${model.maxSslVpnTunnels}`],
      };
    }
  }

  if (answers.vpnType !== "none") {
    const vpnPeak = answers.peakVpnThroughputMbps ?? 0;
    if (vpnPeak > model.ipsecVpnMbps) {
      return {
        meets: false,
        notes: [
          `VPN throughput ${vpnPeak} Mbps exceeds model capacity ${model.ipsecVpnMbps} Mbps`,
        ],
      };
    }
  }

  const userCount = answers.endpointCount ?? answers.authUserCount ?? 0;
  if (userCount > 0 && userCount > model.maxUsers) {
    return {
      meets: false,
      notes: [`Users/endpoints ${userCount} > max ${model.maxUsers}`],
    };
  }

  notes.push(
    `Throughput ${Math.round(throughput)} Mbps meets ${Math.round(requiredMbps)} Mbps`,
  );
  return { meets: true, notes };
}

function getModelsForEnvironment(
  env: Environment,
  models: CatalogModel[],
): CatalogModel[] {
  return models.filter((m) => m.environment.includes(env));
}

function sortModels(models: CatalogModel[]): CatalogModel[] {
  return [...models].sort(
    (a, b) => a.threatProtectionMbps - b.threatProtectionMbps,
  );
}

function siteRoleNote(role: SiteRole, model: CatalogModel): string | null {
  if (!model.environment.includes("physical")) return null;
  const isDesktop = model.formFactor === "Desktop";
  if ((role === "hq" || role === "datacenter") && isDesktop) {
    return `Site role is ${role}; consider a 1U/2U model for head office or datacenter deployments.`;
  }
  return null;
}

function buildModelCaveats(
  model: CatalogModel,
  answers: SizingAnswers,
  requiredMbps: number,
  requiredConnections: number,
  throughput: number,
): string[] {
  const caveats: string[] = [];

  const connectionsPct = (requiredConnections / model.maxConcurrentConnections) * 100;
  if (connectionsPct > 75) {
    caveats.push(
      `Uses ~${Math.round(connectionsPct)}% of this model's max concurrent connections (${model.maxConcurrentConnections.toLocaleString()}) — limited headroom for growth.`,
    );
  }

  if (answers.vpnType === "ipsec" || answers.vpnType === "both") {
    const ipsec = answers.ipsecTunnels ?? 0;
    const pct = model.maxIpsecTunnels > 0 ? (ipsec / model.maxIpsecTunnels) * 100 : 0;
    if (pct > 75) {
      caveats.push(
        `Uses ~${Math.round(pct)}% of max IPsec tunnels (${model.maxIpsecTunnels.toLocaleString()}).`,
      );
    }
  }

  if (answers.vpnType === "ssl" || answers.vpnType === "both") {
    const ssl = answers.sslVpnTunnels ?? 0;
    const pct = model.maxSslVpnTunnels > 0 ? (ssl / model.maxSslVpnTunnels) * 100 : 0;
    if (pct > 75) {
      caveats.push(
        `Uses ~${Math.round(pct)}% of max SSL VPN tunnels (${model.maxSslVpnTunnels.toLocaleString()}).`,
      );
    }
  }

  const userCount = answers.endpointCount ?? answers.authUserCount ?? 0;
  if (userCount > 0 && model.maxUsers > 0) {
    const pct = (userCount / model.maxUsers) * 100;
    if (pct > 75) {
      caveats.push(
        `Uses ~${Math.round(pct)}% of the recommended max users/endpoints (${model.maxUsers.toLocaleString()}) for this model.`,
      );
    }
  }

  const roleNote = siteRoleNote(answers.siteRole, model);
  if (roleNote) caveats.push(roleNote);

  const headroomPercent = Math.round((throughput / requiredMbps - 1) * 100);
  if (headroomPercent < 5) {
    caveats.push(
      "Throughput headroom is minimal — a traffic spike or under-estimated growth could exceed this model's capacity.",
    );
  }

  if (
    answers.environment === "physical" &&
    answers.redundantPsuRequired &&
    !model.redundantPsuSku
  ) {
    caveats.push(
      "Redundant PSU requested but no PSU SKU configured for this model — set it in Catalog admin.",
    );
  }

  return caveats;
}

async function buildBom(
  model: CatalogModel,
  answers: SizingAnswers,
  env: Environment,
): Promise<BomLineItem[]> {
  const qty = answers.haRequired ? 2 : 1;
  const bom: BomLineItem[] = [];

  if (env === "physical") {
    bom.push({
      sku: model.sku ?? model.id.toUpperCase(),
      description: `${model.name} appliance`,
      quantity: qty,
    });
  } else {
    bom.push({
      sku: model.licenseSku ?? model.name,
      description: `Sophos Firewall ${model.licenseSku ?? model.name} license (${model.vcpu} vCPU / ${model.ramGb} GB RAM)`,
      quantity: qty,
    });
    if (env === "aws" && model.awsInstance) {
      bom.push({
        sku: "AWS-EC2",
        description: `Suggested EC2 instance: ${model.awsInstance}`,
        quantity: qty,
      });
    }
    if (env === "azure" && model.azureVmSize) {
      bom.push({
        sku: "AZURE-VM",
        description: `Suggested Azure VM: ${model.azureVmSize} (Gen1 compatible)`,
        quantity: qty,
      });
    }
  }

  // Protection subscription — one entitlement covers the HA pair (do not double).
  if (answers.protection === "xstream") {
    bom.push({
      sku: `${model.sku ?? model.licenseSku ?? model.id.toUpperCase()}-XP`,
      description: `Sophos Xstream Protection — ${model.name}`,
      quantity: 1,
    });
  } else {
    bom.push({
      sku: `${model.sku ?? model.licenseSku ?? model.id.toUpperCase()}-STD`,
      description: `Sophos Standard Protection — ${model.name}`,
      quantity: 1,
    });
  }

  if (answers.haRequired) {
    bom.push({
      sku: "ENH-SUPPORT-PLUS",
      description: "Enhanced Support Plus (required for High Availability)",
      quantity: 1,
    });
  }

  if (answers.wafLicense === "required") {
    bom.push({
      sku: "WAF-LICENSE",
      description:
        "Web Server Protection (WAF) license — not included in Standard or Xstream protection bundles",
      // Active-passive HA: one WAF entitlement covers the pair (same as protection).
      quantity: 1,
    });
  }

  if (
    env === "physical" &&
    answers.requiresSfpPlus &&
    answers.includeSophosTransceivers &&
    answers.sfpTransceiverType &&
    answers.sfpTransceiverCount
  ) {
    const accessoryType =
      answers.sfpTransceiverType === "sr" ? "sfp_sr" : "sfp_lr";
    const accessory = await getAccessoryByType(accessoryType);
    if (accessory) {
      bom.push({
        sku: accessory.sku,
        description: accessory.name,
        quantity: answers.sfpTransceiverCount,
      });
    } else {
      bom.push({
        sku: answers.sfpTransceiverType === "sr" ? "SFP-SR" : "SFP-LR",
        description: `Sophos SFP+ ${answers.sfpTransceiverType.toUpperCase()} transceiver`,
        quantity: answers.sfpTransceiverCount,
      });
    }
  }

  if (env === "physical" && answers.redundantPsuRequired && model.redundantPsuSku) {
    bom.push({
      sku: model.redundantPsuSku,
      description:
        model.redundantPsuName ??
        `${model.name} redundant / spare PSU`,
      quantity: qty,
    });
  }

  return bom;
}

function getInstanceRecommendation(
  model: CatalogModel,
  env: Environment,
): string | undefined {
  if (env === "aws") return model.awsInstance;
  if (env === "azure") return model.azureVmSize;
  if (env === "virtual") {
    return `${model.vcpu} vCPU / ${model.ramGb} GB RAM`;
  }
  return undefined;
}

const TIER_GUIDANCE: Record<FirewallModelTier, string> = {
  minimum:
    "Meets requirements with no spare headroom — consider Recommended or Optimal if you expect growth or traffic spikes.",
  recommended:
    "Provides headroom above the minimum requirement for typical 3-year growth. This is the default quoted model.",
  optimal:
    "Maximum available headroom for peak loads, future growth, or additional features.",
};

export async function calculateRecommendation(
  answers: SizingAnswers,
): Promise<SizingRecommendation> {
  const { requiredMbps, peakDemand, vpnDemand, sizingBasis } =
    computeRequiredMbps(answers);
  const requiredConnections = estimateConcurrentConnections(answers);

  const allModels = await getFirewallCatalog();
  const candidates = sortModels(
    getModelsForEnvironment(answers.environment, allModels),
  );

  let minIndex = candidates.findIndex(
    (model) =>
      modelMeetsConstraints(model, answers, requiredMbps, requiredConnections)
        .meets,
  );

  const noModelMeetsRequirements = minIndex === -1;
  if (noModelMeetsRequirements) {
    minIndex = candidates.length - 1;
  }

  const recommendedIndex = Math.min(minIndex + 1, candidates.length - 1);
  const optimalIndex = Math.min(minIndex + 2, candidates.length - 1);

  function buildOption(
    tier: FirewallModelTier,
    index: number,
  ): FirewallModelOption {
    const model = candidates[index];
    const throughput = getThroughputMetric(
      model,
      answers.protection,
      answers.tlsInspectionScope,
    );
    const caveats = buildModelCaveats(
      model,
      answers,
      requiredMbps,
      requiredConnections,
      throughput,
    );

    if (noModelMeetsRequirements && index === minIndex) {
      caveats.unshift(
        "No available model in this environment fully meets the calculated requirement — this is the largest available option.",
      );
    } else if (tier !== "minimum" && index === minIndex) {
      caveats.unshift(
        "This is the largest available model in this environment — there is no larger option for additional headroom.",
      );
    }

    caveats.push(TIER_GUIDANCE[tier]);

    return {
      tier,
      modelId: model.id,
      modelName: model.name,
      throughputMbps: Math.round(throughput),
      headroomPercent: Math.round((throughput / requiredMbps - 1) * 100),
      instanceRecommendation: getInstanceRecommendation(
        model,
        answers.environment,
      ),
      licenseSku: model.licenseSku,
      caveats,
    };
  }

  const modelOptions: FirewallModelOption[] = [
    buildOption("minimum", minIndex),
    buildOption("recommended", recommendedIndex),
    buildOption("optimal", optimalIndex),
  ];

  // The "recommended" tier drives the default BOM/quote — never quote the bare minimum.
  const selected = candidates[recommendedIndex];

  let drivingFactor = "throughput";
  if (vpnDemand >= peakDemand) {
    drivingFactor = "VPN peak throughput";
  } else if (
    answers.internalTrafficEnabled &&
    (answers.internalTrafficMbps ?? 0) >= peakDemand * 0.5
  ) {
    drivingFactor = "internal/hairpinned traffic";
  } else if (
    answers.endpointCount &&
    answers.endpointCount > selected.maxUsers * 0.8
  ) {
    drivingFactor = "endpoint count";
  } else if (
    answers.protection === "xstream" &&
    answers.tlsInspectionScope === "full"
  ) {
    drivingFactor = "full TLS inspection under Xstream protection";
  }

  const sizingNotes: string[] = [`Primary sizing driver: ${drivingFactor}`];
  if (noModelMeetsRequirements) {
    sizingNotes.push(
      "No model fully met all constraints; recommending the largest available model.",
    );
  }
  const roleNote = siteRoleNote(answers.siteRole, selected);
  if (roleNote) sizingNotes.push(roleNote);

  const constraintsMet: string[] = [];
  if (answers.vpnType !== "none") {
    constraintsMet.push(
      `VPN ${answers.vpnType}${answers.ipsecTunnels != null ? ` — ${answers.ipsecTunnels} IPsec` : ""}${answers.sslVpnTunnels != null ? `, ${answers.sslVpnTunnels} SSL` : ""}`,
    );
  }
  if (answers.endpointCount) {
    constraintsMet.push(`${answers.endpointCount} endpoints at site`);
  }
  if (answers.userAuthEnabled && answers.authUserCount) {
    constraintsMet.push(`${answers.authUserCount} authenticated users`);
  }
  if (answers.internalTrafficEnabled) {
    constraintsMet.push(
      `Internal traffic ${answers.internalTrafficMbps ?? 0} Mbps`,
    );
  }
  constraintsMet.push(
    `~${requiredConnections.toLocaleString()} est. concurrent connections`,
  );

  const bom = await buildBom(selected, answers, answers.environment);

  return {
    catalogVersion: CATALOG_VERSION,
    modelId: selected.id,
    modelName: selected.name,
    environment: answers.environment,
    protection: answers.protection,
    requiredMbps: Math.round(requiredMbps),
    estimatedConcurrentConnections: requiredConnections,
    sizingBasis,
    constraintsMet,
    sizingNotes,
    modelOptions,
    quotedTier: "recommended",
    bom,
    licenseSku: selected.licenseSku,
    instanceRecommendation: getInstanceRecommendation(
      selected,
      answers.environment,
    ),
  };
}

/** Rebuilds the BOM/instance fields for a specific catalog model, used when an
 * AM/SE overrides which tier (min/rec/optimal) should drive the quote. */
export async function rebuildFirewallBomForTier(
  answers: SizingAnswers,
  modelId: string,
): Promise<{
  modelId: string;
  modelName: string;
  bom: BomLineItem[];
  licenseSku?: string;
  instanceRecommendation?: string;
} | null> {
  const allModels = await getFirewallCatalog();
  const model = allModels.find((m) => m.id === modelId);
  if (!model) return null;

  return {
    modelId: model.id,
    modelName: model.name,
    bom: await buildBom(model, answers, answers.environment),
    licenseSku: model.licenseSku,
    instanceRecommendation: getInstanceRecommendation(model, answers.environment),
  };
}

function formatModelOptionLines(options: FirewallModelOption[]): string[] {
  const lines: string[] = [];
  options.forEach((opt) => {
    const headroom =
      opt.headroomPercent >= 0 ? `+${opt.headroomPercent}%` : `${opt.headroomPercent}%`;
    lines.push(
      `  [${opt.tier.toUpperCase()}] ${opt.modelName} — ${opt.throughputMbps} Mbps (${headroom} headroom)`,
    );
    opt.caveats.forEach((c) => lines.push(`    - ${c}`));
  });
  return lines;
}

function formatSwitchModelOptionLines(
  options: import("./types").SwitchModelOption[],
): string[] {
  const lines: string[] = [];
  options.forEach((opt) => {
    lines.push(
      `  [${opt.tier.toUpperCase()}] ${opt.modelName} — ${opt.portCount} ports`,
    );
    opt.caveats.forEach((c) => lines.push(`    - ${c}`));
  });
  return lines;
}

export function formatQuoteSummary(
  recommendation: import("./types").StoredRecommendation,
): string {
  const { recommendation: normalized } = normalizeStoredRecommendation(
    recommendation,
  );

  if (
    typeof normalized === "object" &&
    normalized !== null &&
    "schemaVersion" in normalized &&
    normalized.schemaVersion === 2
  ) {
    return formatSubmissionQuoteSummary(normalized);
  }

  const legacy = normalized as SizingRecommendation;
  const lines = [
    `Recommended model: ${legacy.modelName}`,
    `Environment: ${legacy.environment}`,
    `Protection: ${legacy.protection === "xstream" ? "Xstream (incl. Zero-Day Protection)" : "Standard"}`,
    `Sizing basis: ${legacy.sizingBasis}`,
    `Constraints met: ${legacy.constraintsMet.join(", ")}`,
    "",
    "Bill of Materials:",
    ...legacy.bom.map(
      (item) => `  ${item.quantity}× ${item.description}`,
    ),
  ];

  if (legacy.instanceRecommendation) {
    lines.push("", `Instance: ${legacy.instanceRecommendation}`);
  }

  if (legacy.modelOptions && legacy.modelOptions.length > 0) {
    lines.push("", "Model options (Minimum / Recommended / Optimal):");
    lines.push(...formatModelOptionLines(legacy.modelOptions));
  }

  if (legacy.sizingNotes.length > 0) {
    lines.push("", "Sizing notes:");
    legacy.sizingNotes.forEach((note) => lines.push(`  • ${note}`));
  }

  return lines.join("\n");
}

function formatSubmissionQuoteSummary(
  recommendation: import("./types").SizingSubmissionRecommendation,
): string {
  const lines = ["Sophos Multi-Site Sizing Summary", ""];

  for (const site of recommendation.sites) {
    lines.push(`=== ${site.siteName} ===`);
    if (site.firewall) {
      lines.push(
        `Firewall: ${site.firewall.modelName} (${site.firewall.environment}, ${site.firewall.protection})`,
      );
      lines.push(`  ${site.firewall.sizingBasis}`);
      if (site.firewall.modelOptions && site.firewall.modelOptions.length > 0) {
        lines.push(...formatModelOptionLines(site.firewall.modelOptions));
      }
    }
    if (site.switches) {
      lines.push(`Switch: ${site.switches.modelName}`);
      if (site.switches.modelOptions && site.switches.modelOptions.length > 0) {
        lines.push(...formatSwitchModelOptionLines(site.switches.modelOptions));
      }
    }
    if (site.wireless) {
      lines.push("Wireless: Presales handoff required — see wireless summary");
    }
    lines.push("");
  }

  lines.push("Consolidated Bill of Materials:");
  for (const item of recommendation.bom) {
    lines.push(`  ${item.quantity}× ${item.description}`);
  }

  for (const site of recommendation.sites) {
    if (site.firewall?.sizingNotes.length) {
      lines.push("", `${site.siteName} firewall notes:`);
      site.firewall.sizingNotes.forEach((n) => lines.push(`  • ${n}`));
    }
    if (site.switches?.sizingNotes.length) {
      lines.push("", `${site.siteName} switch notes:`);
      site.switches.sizingNotes.forEach((n) => lines.push(`  • ${n}`));
    }
  }

  return lines.join("\n");
}
