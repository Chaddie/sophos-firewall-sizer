export type Environment = "physical" | "virtual" | "aws" | "azure";
export type ProtectionLevel = "standard" | "xstream";
export type SiteRole = "hq" | "branch" | "datacenter" | "cloud_edge";
export type VpnType = "none" | "ipsec" | "ssl" | "both";
export type TlsInspectionScope = "full" | "selective" | "minimal";
export type WafLicense = "not_required" | "required";
export type UserRole =
  | "account_manager"
  | "sales_engineer"
  | "partner"
  | "admin";

/** One SE review note on a sizing request (append-only thread). */
export interface SeReviewNote {
  id: string;
  body: string;
  authorId: string;
  authorName: string;
  authorEmail?: string | null;
  createdAt: string;
}

export type ProductType = "firewall" | "switch" | "wireless";
export type WirelessDesignGoal = "capacity" | "coverage";
export type SfpTransceiverType = "sr" | "lr";
export type AccessoryType = "sfp_sr" | "sfp_lr";

/** Legacy v1 single-site firewall answers (no schemaVersion field). */
export interface SizingAnswers {
  environment: Environment;
  siteRole: SiteRole;
  totalWanBandwidthMbps: number;
  averageWanConsumptionMbps: number;
  wanGrowth3yrPercent: number;
  expectedPeakThroughputMbps: number;
  protection: ProtectionLevel;
  tlsInspectionScope: TlsInspectionScope;
  wafLicense: WafLicense;
  vpnType: VpnType;
  ipsecTunnels?: number;
  sslVpnTunnels?: number;
  peakVpnThroughputMbps?: number;
  endpointCount?: number;
  userAuthEnabled: boolean;
  authUserCount?: number;
  internalTrafficEnabled: boolean;
  internalTrafficMbps?: number;
  haRequired: boolean;
  /** Physical appliances only — customer needs SFP+ ports. */
  requiresSfpPlus?: boolean;
  /** Quote Sophos SFP+ optics when SFP+ ports are required. */
  includeSophosTransceivers?: boolean;
  sfpTransceiverType?: SfpTransceiverType;
  sfpTransceiverCount?: number;
  /** Quote an extra/redundant PSU for each physical appliance. */
  redundantPsuRequired?: boolean;
  customerName?: string;
  customerEmail?: string;
}

export type FirewallSiteAnswers = Omit<
  SizingAnswers,
  "customerName" | "customerEmail"
>;

export interface SwitchSiteAnswers {
  switchPortCount: number;
  /** Number of identical switch units (multi-closet / stack). Defaults to 1. */
  switchQuantity?: number;
  needs2_5GbE: boolean;
  needs10GbE: boolean;
  needs10GbSfpUplink: boolean;
  needsPoE: boolean;
  poe30wDeviceCount?: number;
  poeBt60wDeviceCount?: number;
}

export interface SitePlanFile {
  name: string;
  type: string;
  /** A publicly fetchable URL (Vercel Blob) or, as a fallback, an inline data: URL. */
  url: string;
}

export interface WirelessSiteAnswers {
  facilityType: string;
  ceilingHeight: string;
  numberOfFloors: number;
  internalWallMaterial: string;
  externalWallMaterial: string;
  floorPlanNotes: string;
  sitePlanFiles?: SitePlanFile[];
  totalUsers: number;
  usersPerAp: number;
  designGoal: WirelessDesignGoal;
  lowSignalAcceptableAreas?: string;
  highBandwidthAreas?: string;
  devicesPerUser?: string;
  suggestedApModels?: string;
  unavailableChannels?: string;
  restrictedChannels?: string;
}

export interface SiteProducts {
  firewall?: FirewallSiteAnswers;
  switches?: SwitchSiteAnswers;
  wireless?: WirelessSiteAnswers;
}

export interface SiteSubmission {
  siteName: string;
  products: SiteProducts;
}

export interface SizingSubmissionAnswers {
  schemaVersion: 2;
  contact?: { customerName?: string; customerEmail?: string };
  /** Optional free-form notes from the customer for the account team. */
  additionalNotes?: string;
  sites: SiteSubmission[];
}

export interface CatalogModel {
  id: string;
  name: string;
  /** Physical appliance order SKU. Editable via the catalog admin page. */
  sku?: string;
  environment: Environment[];
  formFactor?: string;
  threatProtectionMbps: number;
  xstreamSslMbps: number;
  ipsecVpnMbps: number;
  maxIpsecTunnels: number;
  maxSslVpnTunnels: number;
  maxConcurrentConnections: number;
  minUsers: number;
  maxUsers: number;
  licenseSku?: string;
  vcpu?: number;
  ramGb?: number;
  awsInstance?: string;
  azureVmSize?: string;
  /** Optional spare/redundant PSU SKU for this physical model. */
  redundantPsuSku?: string;
  redundantPsuName?: string;
}

export interface AccessoryModel {
  id: string;
  type: AccessoryType;
  name: string;
  sku: string;
}

export interface SwitchCatalogModel {
  id: string;
  name: string;
  sku: string;
  series: 200 | 1000;
  portCount: number;
  ports1GbE: number;
  ports2_5GbE: number;
  ports10GbE: number;
  sfpPlusUplinkCount: number;
  poeSupported: boolean;
  poeBudgetWatts: number;
  supportsBtPoE: boolean;
}

export interface BomLineItem {
  sku: string;
  description: string;
  quantity: number;
  siteName?: string;
  productType?: ProductType;
}

export type SizingTier = "minimum" | "recommended" | "optimal";
export type FirewallModelTier = SizingTier;

export interface FirewallModelOption {
  tier: FirewallModelTier;
  modelId: string;
  modelName: string;
  throughputMbps: number;
  headroomPercent: number;
  instanceRecommendation?: string;
  licenseSku?: string;
  caveats: string[];
}

/** Legacy v1 single-site recommendation. */
export interface SizingRecommendation {
  catalogVersion: string;
  modelId: string;
  modelName: string;
  environment: Environment;
  protection: ProtectionLevel;
  requiredMbps: number;
  estimatedConcurrentConnections: number;
  sizingBasis: string;
  constraintsMet: string[];
  sizingNotes: string[];
  modelOptions?: FirewallModelOption[];
  /** Which tier (min/rec/optimal) currently drives the BOM. Defaults to "recommended" if absent (legacy data). */
  quotedTier?: SizingTier;
  bom: BomLineItem[];
  licenseSku?: string;
  instanceRecommendation?: string;
}

export type FirewallRecommendation = SizingRecommendation;

export interface SwitchModelOption {
  tier: SizingTier;
  modelId: string;
  modelName: string;
  portCount: number;
  caveats: string[];
}

export interface SwitchRecommendation {
  catalogVersion: string;
  modelId: string;
  modelName: string;
  sizingNotes: string[];
  constraintsMet: string[];
  modelOptions?: SwitchModelOption[];
  /** Which tier (min/rec/optimal) currently drives the BOM. Defaults to "recommended" if absent (legacy data). */
  quotedTier?: SizingTier;
  bom: BomLineItem[];
}

export interface WirelessMailtoBase {
  to: string;
  subject: string;
  bodyTemplate: string;
}

export interface WirelessHandoffSummary {
  siteName: string;
  answers: WirelessSiteAnswers;
  summaryText: string;
  /** Unencoded mailto parts; SFDC/timeframe filled in the UI. */
  mailtoBase?: WirelessMailtoBase;
  /** Legacy encoded mailto; prefer mailtoBase when present. */
  mailtoUrl?: string;
}

export interface SiteRecommendation {
  siteName: string;
  firewall?: FirewallRecommendation;
  switches?: SwitchRecommendation;
  wireless?: WirelessHandoffSummary;
}

export interface SizingSubmissionRecommendation {
  schemaVersion: 2;
  sites: SiteRecommendation[];
  bom: BomLineItem[];
}

export type StoredAnswers = SizingAnswers | SizingSubmissionAnswers;
export type StoredRecommendation =
  | SizingRecommendation
  | SizingSubmissionRecommendation;

export function isV2Answers(
  answers: StoredAnswers,
): answers is SizingSubmissionAnswers {
  return (
    typeof answers === "object" &&
    answers !== null &&
    "schemaVersion" in answers &&
    (answers as SizingSubmissionAnswers).schemaVersion === 2
  );
}

export function isV2Recommendation(
  recommendation: StoredRecommendation,
): recommendation is SizingSubmissionRecommendation {
  return (
    typeof recommendation === "object" &&
    recommendation !== null &&
    "schemaVersion" in recommendation &&
    (recommendation as SizingSubmissionRecommendation).schemaVersion === 2
  );
}
