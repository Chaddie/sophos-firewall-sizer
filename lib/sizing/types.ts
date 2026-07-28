export type Environment = "physical" | "virtual" | "aws" | "azure";
export type ProtectionLevel = "standard" | "xstream";

export interface SizingAnswers {
  environment: Environment;
  totalWanBandwidthMbps: number;
  averageWanConsumptionMbps: number;
  wanGrowth3yrPercent: number;
  anticipatedPeakGrowthMbps: number;
  anticipatedAverageGrowthMbps: number;
  protection: ProtectionLevel;
  vpnEnabled: boolean;
  ipsecTunnels?: number;
  sslVpnTunnels?: number;
  peakVpnThroughputMbps?: number;
  userAuthEnabled: boolean;
  authUserCount?: number;
  haRequired: boolean;
  customerName?: string;
  customerEmail?: string;
}

export interface CatalogModel {
  id: string;
  name: string;
  environment: Environment[];
  formFactor?: string;
  threatProtectionMbps: number;
  xstreamSslMbps: number;
  ipsecVpnMbps: number;
  maxIpsecTunnels: number;
  maxSslVpnTunnels: number;
  minUsers: number;
  maxUsers: number;
  licenseSku?: string;
  vcpu?: number;
  ramGb?: number;
  awsInstance?: string;
  azureVmSize?: string;
}

export interface BomLineItem {
  sku: string;
  description: string;
  quantity: number;
}

export interface SizingRecommendation {
  catalogVersion: string;
  modelId: string;
  modelName: string;
  environment: Environment;
  protection: ProtectionLevel;
  requiredMbps: number;
  sizingBasis: string;
  constraintsMet: string[];
  sizingNotes: string[];
  bom: BomLineItem[];
  licenseSku?: string;
  instanceRecommendation?: string;
}
