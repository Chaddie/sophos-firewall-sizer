import type {
  FirewallSiteAnswers,
  SiteSubmission,
  SizingAnswers,
  StoredAnswers,
} from "@/lib/sizing/types";
import { isV2Answers } from "@/lib/sizing/types";
import {
  ENVIRONMENT_LABELS,
  SITE_ROLE_LABELS,
  TLS_INSPECTION_LABELS,
  VPN_TYPE_LABELS,
  WIRELESS_DESIGN_GOAL_LABELS,
} from "@/lib/validations";
import { WAF_LICENSE_LABELS } from "@/lib/form-tooltips";

function formatFirewallRows(firewall: FirewallSiteAnswers | SizingAnswers) {
  return [
    {
      label: "Deployment",
      value: ENVIRONMENT_LABELS[firewall.environment],
    },
    {
      label: "Site role",
      value: SITE_ROLE_LABELS[firewall.siteRole],
    },
    {
      label: "Internet circuit speed",
      value: `${firewall.totalWanBandwidthMbps} Mbps`,
    },
    {
      label: "Typical usage",
      value: `${firewall.averageWanConsumptionMbps} Mbps`,
    },
    {
      label: "Expected peak throughput",
      value: `${firewall.expectedPeakThroughputMbps} Mbps`,
    },
    {
      label: "3-year growth",
      value: `${firewall.wanGrowth3yrPercent}%`,
    },
    {
      label: "Protection",
      value: firewall.protection === "xstream" ? "Xstream" : "Standard",
    },
    {
      label: "TLS inspection scope",
      value: TLS_INSPECTION_LABELS[firewall.tlsInspectionScope],
    },
    {
      label: "Web Server Protection (WAF)",
      value: WAF_LICENSE_LABELS[firewall.wafLicense ?? "not_required"],
    },
    {
      label: "VPN",
      value:
        firewall.vpnType === "none"
          ? "None"
          : `${VPN_TYPE_LABELS[firewall.vpnType]}${firewall.ipsecTunnels != null ? ` — ${firewall.ipsecTunnels} IPsec` : ""}${firewall.sslVpnTunnels != null ? `, ${firewall.sslVpnTunnels} SSL` : ""}, ${firewall.peakVpnThroughputMbps} Mbps peak`,
    },
    ...(firewall.endpointCount
      ? [
          {
            label: "Endpoints at site",
            value: String(firewall.endpointCount),
          },
        ]
      : []),
    {
      label: "Firewall authentication",
      value: firewall.userAuthEnabled
        ? `Yes — ${firewall.authUserCount ?? 0} users`
        : "No",
    },
    {
      label: "Internal traffic via firewall",
      value: firewall.internalTrafficEnabled
        ? `Yes — ${firewall.internalTrafficMbps ?? 0} Mbps`
        : "No",
    },
    {
      label: "High availability",
      value: firewall.haRequired ? "Yes" : "No",
    },
    ...(firewall.environment === "physical"
      ? [
          {
            label: "SFP+ ports required",
            value: firewall.requiresSfpPlus ? "Yes" : "No",
          },
          ...(firewall.requiresSfpPlus
            ? [
                {
                  label: "Sophos transceivers on quote",
                  value: firewall.includeSophosTransceivers
                    ? `Yes — ${firewall.sfpTransceiverCount ?? 0}× ${(firewall.sfpTransceiverType ?? "sr").toUpperCase()}`
                    : "No",
                },
              ]
            : []),
          {
            label: "Extra PSU for redundancy",
            value: firewall.redundantPsuRequired ? "Yes" : "No",
          },
        ]
      : []),
  ];
}

function formatSiteProducts(site: SiteSubmission) {
  const sections: { title: string; rows: { label: string; value: string }[] }[] =
    [];

  if (site.products.firewall) {
    sections.push({
      title: "Firewall",
      rows: formatFirewallRows(site.products.firewall),
    });
  }

  if (site.products.switches) {
    const sw = site.products.switches;
    sections.push({
      title: "Switches",
      rows: [
        { label: "Switch ports needed", value: String(sw.switchPortCount) },
        {
          label: "Switch quantity",
          value: String(sw.switchQuantity ?? 1),
        },
        { label: "2.5GbE ports required", value: sw.needs2_5GbE ? "Yes" : "No" },
        { label: "10GbE ports required", value: sw.needs10GbE ? "Yes" : "No" },
        {
          label: "10Gb SFP+ uplink required",
          value: sw.needs10GbSfpUplink ? "Yes" : "No",
        },
        { label: "PoE required", value: sw.needsPoE ? "Yes" : "No" },
        ...(sw.needsPoE
          ? [
              {
                label: "30W PoE devices",
                value: String(sw.poe30wDeviceCount ?? 0),
              },
              {
                label: "60W BT PoE devices",
                value: String(sw.poeBt60wDeviceCount ?? 0),
              },
            ]
          : []),
      ],
    });
  }

  if (site.products.wireless) {
    const w = site.products.wireless;
    sections.push({
      title: "Wireless",
      rows: [
        { label: "Facility type", value: w.facilityType },
        { label: "Ceiling height", value: w.ceilingHeight },
        { label: "Number of floors", value: String(w.numberOfFloors) },
        { label: "Internal wall material", value: w.internalWallMaterial },
        { label: "External wall material", value: w.externalWallMaterial },
        { label: "Floor plan / area", value: w.floorPlanNotes },
        {
          label: "Site plan files",
          value:
            w.sitePlanFiles && w.sitePlanFiles.length > 0
              ? w.sitePlanFiles.map((f) => f.name).join(", ")
              : "None uploaded",
        },
        { label: "Total users", value: String(w.totalUsers) },
        { label: "Users per AP", value: String(w.usersPerAp) },
        {
          label: "Design goal",
          value: WIRELESS_DESIGN_GOAL_LABELS[w.designGoal],
        },
        ...(w.lowSignalAcceptableAreas
          ? [
              {
                label: "Low signal acceptable areas",
                value: w.lowSignalAcceptableAreas,
              },
            ]
          : []),
        ...(w.highBandwidthAreas
          ? [{ label: "High bandwidth areas", value: w.highBandwidthAreas }]
          : []),
        ...(w.devicesPerUser
          ? [{ label: "Devices per user", value: w.devicesPerUser }]
          : []),
        ...(w.suggestedApModels
          ? [{ label: "Suggested AP models", value: w.suggestedApModels }]
          : []),
        ...(w.unavailableChannels
          ? [
              {
                label: "Unavailable/saturated channels",
                value: w.unavailableChannels,
              },
            ]
          : []),
        ...(w.restrictedChannels
          ? [
              {
                label: "Restricted channels",
                value: w.restrictedChannels,
              },
            ]
          : []),
      ],
    });
  }

  return sections;
}

export function formatAnswersForDisplay(answers: StoredAnswers) {
  if (isV2Answers(answers)) {
    const sites = answers.sites.map((site) => ({
      siteName: site.siteName,
      sections: formatSiteProducts(site),
    }));

    const contactRows: { label: string; value: string }[] = [];
    if (answers.contact?.customerName) {
      contactRows.push({
        label: "Contact name",
        value: answers.contact.customerName,
      });
    }
    if (answers.contact?.customerEmail) {
      contactRows.push({
        label: "Contact email",
        value: answers.contact.customerEmail,
      });
    }

    return {
      schemaVersion: 2 as const,
      contactRows,
      additionalNotes: answers.additionalNotes?.trim() || undefined,
      sites,
    };
  }

  const legacy = answers as SizingAnswers;
  const rows: { label: string; value: string }[] = [];

  if (legacy.customerName) {
    rows.push({ label: "Contact name", value: legacy.customerName });
  }
  if (legacy.customerEmail) {
    rows.push({ label: "Contact email", value: legacy.customerEmail });
  }

  rows.push(...formatFirewallRows(legacy));

  return { schemaVersion: 1 as const, rows };
}
