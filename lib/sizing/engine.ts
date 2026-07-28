import catalogData from "./catalog.json";
import type {
  BomLineItem,
  CatalogModel,
  Environment,
  ProtectionLevel,
  SizingAnswers,
  SizingRecommendation,
} from "./types";

const HEADROOM_FACTOR = 1.25;

interface CatalogFile {
  version: string;
  models: CatalogModel[];
}

const catalog = catalogData as CatalogFile;

function getThroughputMetric(
  model: CatalogModel,
  protection: ProtectionLevel,
): number {
  return protection === "xstream"
    ? model.xstreamSslMbps
    : model.threatProtectionMbps;
}

export function computeRequiredMbps(answers: SizingAnswers): {
  requiredMbps: number;
  peakDemand: number;
  vpnDemand: number;
  sizingBasis: string;
} {
  const baseline = Math.max(
    answers.averageWanConsumptionMbps,
    answers.anticipatedAverageGrowthMbps,
  );
  const with3yr = baseline * (1 + answers.wanGrowth3yrPercent / 100);
  const peakDemand = Math.max(
    with3yr,
    answers.anticipatedPeakGrowthMbps,
    answers.totalWanBandwidthMbps * 0.8,
  );
  const vpnDemand = answers.vpnEnabled
    ? (answers.peakVpnThroughputMbps ?? 0)
    : 0;
  const requiredMbps =
    Math.max(peakDemand, vpnDemand) * HEADROOM_FACTOR;

  const sizingBasis = `${Math.round(requiredMbps)} Mbps required (peak ${Math.round(peakDemand)} Mbps${vpnDemand > 0 ? `, VPN ${Math.round(vpnDemand)} Mbps` : ""} + 25% headroom)`;

  return { requiredMbps, peakDemand, vpnDemand, sizingBasis };
}

function modelMeetsConstraints(
  model: CatalogModel,
  answers: SizingAnswers,
  requiredMbps: number,
): { meets: boolean; notes: string[] } {
  const throughput = getThroughputMetric(model, answers.protection);
  const notes: string[] = [];

  if (throughput < requiredMbps) {
    return { meets: false, notes: [`Throughput ${throughput} Mbps < ${Math.round(requiredMbps)} Mbps required`] };
  }

  if (answers.vpnEnabled) {
    const ipsec = answers.ipsecTunnels ?? 0;
    const ssl = answers.sslVpnTunnels ?? 0;
    if (ipsec > model.maxIpsecTunnels) {
      return { meets: false, notes: [`IPsec tunnels ${ipsec} > max ${model.maxIpsecTunnels}`] };
    }
    if (ssl > model.maxSslVpnTunnels) {
      return { meets: false, notes: [`SSL VPN tunnels ${ssl} > max ${model.maxSslVpnTunnels}`] };
    }
    if ((answers.peakVpnThroughputMbps ?? 0) > model.ipsecVpnMbps) {
      return { meets: false, notes: [`VPN throughput exceeds model capacity ${model.ipsecVpnMbps} Mbps`] };
    }
  }

  if (answers.userAuthEnabled) {
    const users = answers.authUserCount ?? 0;
    if (users > model.maxUsers) {
      return { meets: false, notes: [`Users ${users} > max ${model.maxUsers}`] };
    }
  }

  notes.push(`Throughput ${throughput} Mbps meets ${Math.round(requiredMbps)} Mbps`);
  return { meets: true, notes };
}

function getModelsForEnvironment(env: Environment): CatalogModel[] {
  return catalog.models.filter((m) => m.environment.includes(env));
}

function sortModels(models: CatalogModel[]): CatalogModel[] {
  return [...models].sort(
    (a, b) => a.threatProtectionMbps - b.threatProtectionMbps,
  );
}

function buildBom(
  model: CatalogModel,
  answers: SizingAnswers,
  env: Environment,
): BomLineItem[] {
  const qty = answers.haRequired ? 2 : 1;
  const bom: BomLineItem[] = [];

  if (env === "physical") {
    bom.push({
      sku: model.id.toUpperCase(),
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

  if (answers.haRequired) {
    bom.push({
      sku: "ENH-SUPPORT",
      description: "Enhanced Support",
      quantity: 1,
    });
    bom.push({
      sku: "UPGRADE-ENT",
      description: "Upgrade entitlement",
      quantity: 1,
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

export function calculateRecommendation(
  answers: SizingAnswers,
): SizingRecommendation {
  const { requiredMbps, peakDemand, vpnDemand, sizingBasis } =
    computeRequiredMbps(answers);

  const candidates = sortModels(getModelsForEnvironment(answers.environment));
  let selected: CatalogModel | null = null;
  const sizingNotes: string[] = [];
  let drivingFactor = "throughput";

  for (const model of candidates) {
    const { meets, notes } = modelMeetsConstraints(
      model,
      answers,
      requiredMbps,
    );
    if (meets) {
      selected = model;
      sizingNotes.push(...notes);
      break;
    }
    sizingNotes.push(`${model.name}: ${notes.join("; ")}`);
  }

  if (!selected) {
    selected = candidates[candidates.length - 1];
    sizingNotes.push(
      "No model fully met all constraints; recommending largest available model.",
    );
  }

  if (vpnDemand >= peakDemand) {
    drivingFactor = "VPN peak throughput";
  } else if (
    answers.userAuthEnabled &&
    (answers.authUserCount ?? 0) > selected.maxUsers * 0.8
  ) {
    drivingFactor = "authenticated user count";
  }

  const constraintsMet: string[] = [];
  if (answers.vpnEnabled) {
    constraintsMet.push(
      `VPN ${answers.ipsecTunnels ?? 0} IPsec / ${answers.sslVpnTunnels ?? 0} SSL tunnels`,
    );
  }
  if (answers.userAuthEnabled) {
    constraintsMet.push(`${answers.authUserCount ?? 0} auth users`);
  }
  if (constraintsMet.length === 0) {
    constraintsMet.push("WAN throughput only");
  }

  sizingNotes.unshift(`Primary sizing driver: ${drivingFactor}`);

  const bom = buildBom(selected, answers, answers.environment);

  return {
    catalogVersion: catalog.version,
    modelId: selected.id,
    modelName: selected.name,
    environment: answers.environment,
    protection: answers.protection,
    requiredMbps: Math.round(requiredMbps),
    sizingBasis,
    constraintsMet,
    sizingNotes,
    bom,
    licenseSku: selected.licenseSku,
    instanceRecommendation: getInstanceRecommendation(
      selected,
      answers.environment,
    ),
  };
}

export function formatQuoteSummary(recommendation: SizingRecommendation): string {
  const lines = [
    `Recommended model: ${recommendation.modelName}`,
    `Environment: ${recommendation.environment}`,
    `Protection: ${recommendation.protection === "xstream" ? "Xstream (incl. Zero-Day Protection)" : "Standard"}`,
    `Sizing basis: ${recommendation.sizingBasis}`,
    `Constraints met: ${recommendation.constraintsMet.join(", ")}`,
    "",
    "Bill of Materials:",
    ...recommendation.bom.map(
      (item) => `  ${item.quantity}× ${item.description}`,
    ),
  ];

  if (recommendation.instanceRecommendation) {
    lines.push("", `Instance: ${recommendation.instanceRecommendation}`);
  }

  if (recommendation.sizingNotes.length > 0) {
    lines.push("", "Sizing notes:");
    recommendation.sizingNotes.forEach((note) => lines.push(`  • ${note}`));
  }

  return lines.join("\n");
}
