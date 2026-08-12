import type {
  Environment,
  ProtectionLevel,
  SiteRole,
  SitePlanFile,
  SfpTransceiverType,
  TlsInspectionScope,
  VpnType,
  WafLicense,
  WirelessDesignGoal,
} from "@/lib/sizing/types";

export interface FirewallFormState {
  environment: Environment;
  siteRole: SiteRole;
  totalWanBandwidthMbps: string;
  averageWanConsumptionMbps: string;
  wanGrowth3yrPercent: string;
  expectedPeakThroughputMbps: string;
  protection: ProtectionLevel;
  tlsInspectionScope: TlsInspectionScope;
  wafLicense: WafLicense;
  vpnType: VpnType;
  ipsecTunnels: string;
  sslVpnTunnels: string;
  peakVpnThroughputMbps: string;
  endpointCount: string;
  userAuthEnabled: boolean;
  authUserCount: string;
  internalTrafficEnabled: boolean;
  internalTrafficMbps: string;
  haRequired: boolean;
  requiresSfpPlus: boolean;
  includeSophosTransceivers: boolean;
  sfpTransceiverType: SfpTransceiverType;
  sfpTransceiverCount: string;
  redundantPsuRequired: boolean;
}

export interface SwitchFormState {
  switchPortCount: string;
  needs2_5GbE: boolean;
  needs10GbE: boolean;
  needs10GbSfpUplink: boolean;
  needsPoE: boolean;
  poe30wDeviceCount: string;
  poeBt60wDeviceCount: string;
}

export interface WirelessFormState {
  facilityType: string;
  ceilingHeight: string;
  numberOfFloors: string;
  internalWallMaterial: string;
  externalWallMaterial: string;
  floorPlanNotes: string;
  sitePlanFiles: SitePlanFile[];
  totalUsers: string;
  usersPerAp: string;
  designGoal: WirelessDesignGoal;
  lowSignalAcceptableAreas: string;
  highBandwidthAreas: string;
  devicesPerUser: string;
  suggestedApModels: string;
  unavailableChannels: string;
  restrictedChannels: string;
}

export interface SiteFormState {
  siteName: string;
  enableFirewall: boolean;
  enableSwitches: boolean;
  enableWireless: boolean;
  firewall: FirewallFormState;
  switches: SwitchFormState;
  wireless: WirelessFormState;
}

export const defaultFirewallState = (): FirewallFormState => ({
  environment: "physical",
  siteRole: "branch",
  totalWanBandwidthMbps: "",
  averageWanConsumptionMbps: "",
  wanGrowth3yrPercent: "20",
  expectedPeakThroughputMbps: "",
  protection: "xstream",
  tlsInspectionScope: "selective",
  wafLicense: "not_required",
  vpnType: "none",
  ipsecTunnels: "",
  sslVpnTunnels: "",
  peakVpnThroughputMbps: "",
  endpointCount: "",
  userAuthEnabled: false,
  authUserCount: "",
  internalTrafficEnabled: false,
  internalTrafficMbps: "",
  haRequired: false,
  requiresSfpPlus: false,
  includeSophosTransceivers: false,
  sfpTransceiverType: "sr",
  sfpTransceiverCount: "",
  redundantPsuRequired: false,
});

export const defaultSwitchState = (): SwitchFormState => ({
  switchPortCount: "",
  needs2_5GbE: false,
  needs10GbE: false,
  needs10GbSfpUplink: false,
  needsPoE: false,
  poe30wDeviceCount: "",
  poeBt60wDeviceCount: "",
});

export const defaultWirelessState = (): WirelessFormState => ({
  facilityType: "",
  ceilingHeight: "",
  numberOfFloors: "",
  internalWallMaterial: "",
  externalWallMaterial: "",
  floorPlanNotes: "",
  sitePlanFiles: [],
  totalUsers: "",
  usersPerAp: "",
  designGoal: "coverage",
  lowSignalAcceptableAreas: "",
  highBandwidthAreas: "",
  devicesPerUser: "",
  suggestedApModels: "",
  unavailableChannels: "",
  restrictedChannels: "",
});

export const defaultSiteState = (name = ""): SiteFormState => ({
  siteName: name,
  enableFirewall: true,
  enableSwitches: false,
  enableWireless: false,
  firewall: defaultFirewallState(),
  switches: defaultSwitchState(),
  wireless: defaultWirelessState(),
});

export function firewallFormToPayload(fw: FirewallFormState) {
  return {
    environment: fw.environment,
    siteRole: fw.siteRole,
    totalWanBandwidthMbps: Number(fw.totalWanBandwidthMbps),
    averageWanConsumptionMbps: Number(fw.averageWanConsumptionMbps),
    wanGrowth3yrPercent: Number(fw.wanGrowth3yrPercent),
    expectedPeakThroughputMbps: Number(fw.expectedPeakThroughputMbps),
    protection: fw.protection,
    tlsInspectionScope: fw.tlsInspectionScope,
    wafLicense: fw.wafLicense,
    vpnType: fw.vpnType,
    ipsecTunnels:
      fw.vpnType === "ipsec" || fw.vpnType === "both"
        ? Number(fw.ipsecTunnels)
        : undefined,
    sslVpnTunnels:
      fw.vpnType === "ssl" || fw.vpnType === "both"
        ? Number(fw.sslVpnTunnels)
        : undefined,
    peakVpnThroughputMbps:
      fw.vpnType !== "none" ? Number(fw.peakVpnThroughputMbps) : undefined,
    endpointCount: fw.endpointCount ? Number(fw.endpointCount) : undefined,
    userAuthEnabled: fw.userAuthEnabled,
    authUserCount: fw.userAuthEnabled ? Number(fw.authUserCount) : undefined,
    internalTrafficEnabled: fw.internalTrafficEnabled,
    internalTrafficMbps: fw.internalTrafficEnabled
      ? Number(fw.internalTrafficMbps)
      : undefined,
    haRequired: fw.haRequired,
    requiresSfpPlus: fw.environment === "physical" ? fw.requiresSfpPlus : false,
    includeSophosTransceivers:
      fw.environment === "physical" && fw.requiresSfpPlus
        ? fw.includeSophosTransceivers
        : false,
    sfpTransceiverType:
      fw.environment === "physical" &&
      fw.requiresSfpPlus &&
      fw.includeSophosTransceivers
        ? fw.sfpTransceiverType
        : undefined,
    sfpTransceiverCount:
      fw.environment === "physical" &&
      fw.requiresSfpPlus &&
      fw.includeSophosTransceivers
        ? Number(fw.sfpTransceiverCount)
        : undefined,
    redundantPsuRequired:
      fw.environment === "physical" ? fw.redundantPsuRequired : false,
  };
}

export function switchFormToPayload(sw: SwitchFormState) {
  return {
    switchPortCount: Number(sw.switchPortCount),
    needs2_5GbE: sw.needs2_5GbE,
    needs10GbE: sw.needs10GbE,
    needs10GbSfpUplink: sw.needs10GbSfpUplink,
    needsPoE: sw.needsPoE,
    poe30wDeviceCount: sw.needsPoE ? Number(sw.poe30wDeviceCount || 0) : undefined,
    poeBt60wDeviceCount: sw.needsPoE
      ? Number(sw.poeBt60wDeviceCount || 0)
      : undefined,
  };
}

export function wirelessFormToPayload(w: WirelessFormState) {
  return {
    facilityType: w.facilityType,
    ceilingHeight: w.ceilingHeight,
    numberOfFloors: Number(w.numberOfFloors),
    internalWallMaterial: w.internalWallMaterial,
    externalWallMaterial: w.externalWallMaterial,
    floorPlanNotes: w.floorPlanNotes,
    sitePlanFiles: w.sitePlanFiles.length > 0 ? w.sitePlanFiles : undefined,
    totalUsers: Number(w.totalUsers),
    usersPerAp: Number(w.usersPerAp),
    designGoal: w.designGoal,
    lowSignalAcceptableAreas: w.lowSignalAcceptableAreas || undefined,
    highBandwidthAreas: w.highBandwidthAreas || undefined,
    devicesPerUser: w.devicesPerUser || undefined,
    suggestedApModels: w.suggestedApModels || undefined,
    unavailableChannels: w.unavailableChannels || undefined,
    restrictedChannels: w.restrictedChannels || undefined,
  };
}

export function sitesToSubmissionPayload(sites: SiteFormState[]) {
  return {
    schemaVersion: 2 as const,
    sites: sites.map((site) => ({
      siteName: site.siteName,
      enableFirewall: site.enableFirewall,
      enableSwitches: site.enableSwitches,
      enableWireless: site.enableWireless,
      firewall: site.enableFirewall
        ? firewallFormToPayload(site.firewall)
        : undefined,
      switches: site.enableSwitches
        ? switchFormToPayload(site.switches)
        : undefined,
      wireless: site.enableWireless
        ? wirelessFormToPayload(site.wireless)
        : undefined,
    })),
  };
}
