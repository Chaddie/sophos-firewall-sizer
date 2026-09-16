import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { calculateRecommendationFromModels } from "./engine";
import { calculateSwitchRecommendationFromModels } from "./switch-engine";
import { pickTierIndexes, REC_HEADROOM_PERCENT } from "./tier-policy";
import type { CatalogModel, SizingAnswers, SwitchCatalogModel } from "./types";

const provenance = {
  version: "test",
  source: "bundled-json" as const,
  asOf: "test",
  lastReviewed: "test",
};

function model(
  partial: Partial<CatalogModel> & Pick<CatalogModel, "id" | "name">,
): CatalogModel {
  return {
    environment: ["physical"],
    formFactor: "1U",
    threatProtectionMbps: 1000,
    xstreamSslMbps: 800,
    ipsecVpnMbps: 2000,
    maxIpsecTunnels: 1000,
    maxSslVpnTunnels: 500,
    maxConcurrentConnections: 5_000_000,
    minUsers: 1,
    maxUsers: 500,
    sku: partial.id.toUpperCase(),
    ...partial,
  };
}

function baseAnswers(overrides: Partial<SizingAnswers> = {}): SizingAnswers {
  return {
    environment: "physical",
    siteRole: "branch",
    totalWanBandwidthMbps: 500,
    averageWanConsumptionMbps: 200,
    wanGrowth3yrPercent: 20,
    expectedPeakThroughputMbps: 400,
    protection: "xstream",
    tlsInspectionScope: "selective",
    wafLicense: "not_required",
    vpnType: "none",
    userAuthEnabled: false,
    internalTrafficEnabled: false,
    haRequired: false,
    endpointCount: 50,
    ...overrides,
  };
}

describe("pickTierIndexes", () => {
  it("picks recommended by capacity band, not index+1", () => {
    const result = pickTierIndexes({
      candidateCount: 4,
      meetsAt: (i) => i >= 1,
      capacityAt: (i) => [5, 10, 30, 60][i]!,
      recommendedBand: 25,
      optimalBand: 50,
    });
    assert.equal(result.minIndex, 1);
    assert.equal(result.recommendedIndex, 2);
    assert.equal(result.optimalIndex, 3);
  });
});

describe("firewall golden scenarios", () => {
  const catalog: CatalogModel[] = [
    model({
      id: "small",
      name: "Small",
      threatProtectionMbps: 500,
      xstreamSslMbps: 300,
      ipsecVpnMbps: 800,
      sslVpnMbps: 400,
      maxUsers: 100,
    }),
    model({
      id: "mid",
      name: "Mid",
      threatProtectionMbps: 1200,
      xstreamSslMbps: 900,
      ipsecVpnMbps: 2500,
      sslVpnMbps: 1200,
      maxUsers: 300,
    }),
    model({
      id: "large",
      name: "Large",
      threatProtectionMbps: 3000,
      xstreamSslMbps: 2200,
      ipsecVpnMbps: 6000,
      sslVpnMbps: 3000,
      maxUsers: 1000,
    }),
  ];

  it("HA + Xstream full TLS uses Xstream SSL sort/compare metric", async () => {
    const rec = await calculateRecommendationFromModels(
      baseAnswers({
        protection: "xstream",
        tlsInspectionScope: "full",
        expectedPeakThroughputMbps: 700,
        totalWanBandwidthMbps: 1000,
        averageWanConsumptionMbps: 400,
        haRequired: true,
        siteRole: "hq",
      }),
      catalog,
      provenance,
    );

    assert.ok(
      (rec.modelOptions?.[0]?.throughputMbps ?? 0) <=
        (rec.modelOptions?.[1]?.throughputMbps ?? 0),
    );
    assert.ok(rec.bom.some((l) => l.quantity === 2));
    assert.ok(rec.confidence);
    assert.equal(rec.catalogProvenance?.source, "bundled-json");
  });

  it("separates IPsec vs SSL VPN throughput capacity", async () => {
    const sslBound = await calculateRecommendationFromModels(
      baseAnswers({
        vpnType: "ssl",
        peakVpnThroughputMbps: 500,
        sslVpnTunnels: 10,
        expectedPeakThroughputMbps: 100,
        totalWanBandwidthMbps: 200,
        averageWanConsumptionMbps: 50,
      }),
      catalog,
      provenance,
    );
    assert.notEqual(sslBound.modelOptions?.[0]?.modelId, "small");

    const ipsecBound = await calculateRecommendationFromModels(
      baseAnswers({
        vpnType: "ipsec",
        peakVpnThroughputMbps: 900,
        ipsecTunnels: 10,
        expectedPeakThroughputMbps: 100,
        totalWanBandwidthMbps: 200,
        averageWanConsumptionMbps: 50,
      }),
      catalog,
      provenance,
    );
    assert.match(
      (ipsecBound.bindingConstraint ?? "").toLowerCase(),
      /ipsec|vpn|throughput/,
    );
    assert.notEqual(ipsecBound.modelOptions?.[0]?.modelId, "small");
  });

  it("uses headroom bands for Recommended vs Minimum", async () => {
    const rec = await calculateRecommendationFromModels(
      baseAnswers({
        protection: "standard",
        tlsInspectionScope: "minimal",
        expectedPeakThroughputMbps: 450,
        totalWanBandwidthMbps: 500,
        averageWanConsumptionMbps: 300,
        wanGrowth3yrPercent: 0,
      }),
      catalog,
      provenance,
    );

    assert.ok(rec.whyRecommended);
    assert.ok(rec.whyRecommended?.includes(`${REC_HEADROOM_PERCENT}%`));
    const min = rec.modelOptions?.find((o) => o.tier === "minimum");
    const recommended = rec.modelOptions?.find((o) => o.tier === "recommended");
    assert.ok(min);
    assert.ok(recommended);
    if (min!.modelId !== recommended!.modelId) {
      assert.ok(recommended!.headroomPercent >= REC_HEADROOM_PERCENT);
    }
  });

  it("falls back to largest model when catalog is undersized", async () => {
    const tiny: CatalogModel[] = [
      model({
        id: "tiny",
        name: "Tiny",
        threatProtectionMbps: 100,
        xstreamSslMbps: 50,
        ipsecVpnMbps: 100,
        maxUsers: 10,
      }),
    ];
    const rec = await calculateRecommendationFromModels(
      baseAnswers({
        expectedPeakThroughputMbps: 5000,
        totalWanBandwidthMbps: 10000,
        averageWanConsumptionMbps: 4000,
        endpointCount: 50,
      }),
      tiny,
      provenance,
    );
    assert.equal(rec.confidence, "red");
    assert.equal(rec.modelId, "tiny");
    assert.ok(
      rec.sizingNotes.some((n) => n.toLowerCase().includes("no model")),
    );
  });

  it("notes default endpoint fill and SFP caveats", async () => {
    const rec = await calculateRecommendationFromModels(
      baseAnswers({
        endpointCount: undefined,
        authUserCount: undefined,
        requiresSfpPlus: true,
        includeSophosTransceivers: true,
        sfpTransceiverType: "sr",
        sfpTransceiverCount: 2,
      }),
      catalog,
      provenance,
    );
    assert.ok(
      rec.sizingNotes.some((n) =>
        n.toLowerCase().includes("endpoint count was not provided"),
      ),
    );
    const caveats = rec.modelOptions?.[1]?.caveats ?? [];
    assert.ok(caveats.some((c) => c.includes("SFP+")));
  });
});

describe("switch golden scenarios", () => {
  const switches: SwitchCatalogModel[] = [
    {
      id: "sw-8",
      name: "SW 8",
      sku: "SW-8",
      series: 200,
      portCount: 8,
      ports1GbE: 8,
      ports2_5GbE: 0,
      ports10GbE: 0,
      sfpPlusUplinkCount: 0,
      poeSupported: false,
      poeBudgetWatts: 0,
      supportsBtPoE: false,
    },
    {
      id: "sw-24",
      name: "SW 24",
      sku: "SW-24",
      series: 200,
      portCount: 24,
      ports1GbE: 24,
      ports2_5GbE: 0,
      ports10GbE: 0,
      sfpPlusUplinkCount: 2,
      poeSupported: true,
      poeBudgetWatts: 240,
      supportsBtPoE: true,
    },
    {
      id: "sw-48",
      name: "SW 48",
      sku: "SW-48",
      series: 1000,
      portCount: 48,
      ports1GbE: 48,
      ports2_5GbE: 0,
      ports10GbE: 4,
      sfpPlusUplinkCount: 4,
      poeSupported: true,
      poeBudgetWatts: 740,
      supportsBtPoE: true,
    },
  ];

  it("uses spare-port bands and multiplies quantity", () => {
    const rec = calculateSwitchRecommendationFromModels(
      {
        switchPortCount: 20,
        switchQuantity: 3,
        needs2_5GbE: false,
        needs10GbE: false,
        needs10GbSfpUplink: false,
        needsPoE: true,
        poe30wDeviceCount: 4,
      },
      switches,
      provenance,
    );
    assert.equal(rec.bom[0]?.quantity, 3);
    assert.ok(rec.whyRecommended);
    assert.ok(rec.confidence);
  });
});
