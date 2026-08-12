import { z } from "zod";

export const environmentSchema = z.enum([
  "physical",
  "virtual",
  "aws",
  "azure",
]);

export const siteRoleSchema = z.enum([
  "hq",
  "branch",
  "datacenter",
  "cloud_edge",
]);

export const protectionSchema = z.enum(["standard", "xstream"]);

export const wafLicenseSchema = z.enum(["not_required", "required"]);

export const tlsInspectionScopeSchema = z.enum([
  "full",
  "selective",
  "minimal",
]);

export const vpnTypeSchema = z.enum(["none", "ipsec", "ssl", "both"]);

const firewallFieldsSchema = z.object({
  environment: environmentSchema,
  siteRole: siteRoleSchema,
  totalWanBandwidthMbps: z.coerce.number().min(1, "Required"),
  averageWanConsumptionMbps: z.coerce.number().min(0, "Required"),
  wanGrowth3yrPercent: z.coerce.number().min(0).max(500),
  expectedPeakThroughputMbps: z.coerce.number().min(0, "Required"),
  protection: protectionSchema,
  tlsInspectionScope: tlsInspectionScopeSchema,
  wafLicense: wafLicenseSchema,
  vpnType: vpnTypeSchema,
  ipsecTunnels: z.coerce.number().min(0).optional(),
  sslVpnTunnels: z.coerce.number().min(0).optional(),
  peakVpnThroughputMbps: z.coerce.number().min(0).optional(),
  endpointCount: z.coerce.number().min(1).optional(),
  userAuthEnabled: z.boolean(),
  authUserCount: z.coerce.number().min(1).optional(),
  internalTrafficEnabled: z.boolean(),
  internalTrafficMbps: z.coerce.number().min(0).optional(),
  haRequired: z.boolean(),
  requiresSfpPlus: z.boolean().optional(),
  includeSophosTransceivers: z.boolean().optional(),
  sfpTransceiverType: z.enum(["sr", "lr"]).optional(),
  sfpTransceiverCount: z.coerce.number().min(1).optional(),
  redundantPsuRequired: z.boolean().optional(),
});

function refineFirewallFields<T extends z.ZodTypeAny>(schema: T) {
  return schema.superRefine((data, ctx) => {
    const d = data as z.infer<typeof firewallFieldsSchema>;
    if (d.vpnType === "ipsec" || d.vpnType === "both") {
      if (d.ipsecTunnels === undefined) {
        ctx.addIssue({
          code: "custom",
          message: "Required for site-to-site VPN",
          path: ["ipsecTunnels"],
        });
      }
    }
    if (d.vpnType === "ssl" || d.vpnType === "both") {
      if (d.sslVpnTunnels === undefined) {
        ctx.addIssue({
          code: "custom",
          message: "Required for remote access VPN",
          path: ["sslVpnTunnels"],
        });
      }
    }
    if (d.vpnType !== "none") {
      if (d.peakVpnThroughputMbps === undefined) {
        ctx.addIssue({
          code: "custom",
          message: "Required when VPN is enabled",
          path: ["peakVpnThroughputMbps"],
        });
      }
    }
    if (d.userAuthEnabled && !d.authUserCount) {
      ctx.addIssue({
        code: "custom",
        message: "Required when firewall authentication is enabled",
        path: ["authUserCount"],
      });
    }
    if (d.internalTrafficEnabled && d.internalTrafficMbps === undefined) {
      ctx.addIssue({
        code: "custom",
        message: "Required when internal traffic is routed through the firewall",
        path: ["internalTrafficMbps"],
      });
    }
    if (
      d.environment === "physical" &&
      d.requiresSfpPlus &&
      d.includeSophosTransceivers
    ) {
      if (!d.sfpTransceiverType) {
        ctx.addIssue({
          code: "custom",
          message: "Select SR or LR",
          path: ["sfpTransceiverType"],
        });
      }
      if (d.sfpTransceiverCount === undefined) {
        ctx.addIssue({
          code: "custom",
          message: "Required when quoting Sophos transceivers",
          path: ["sfpTransceiverCount"],
        });
      }
    }
  });
}

export const firewallSiteSchema = refineFirewallFields(firewallFieldsSchema);

export const sizingFormSchema = refineFirewallFields(
  firewallFieldsSchema.extend({
    customerName: z.string().optional(),
    customerEmail: z.string().email().optional().or(z.literal("")),
  }),
);

export type SizingFormInput = z.infer<typeof sizingFormSchema>;

export const switchSiteSchema = z
  .object({
    switchPortCount: z.coerce.number().min(1, "Required"),
    needs2_5GbE: z.boolean(),
    needs10GbE: z.boolean(),
    needs10GbSfpUplink: z.boolean(),
    needsPoE: z.boolean(),
    poe30wDeviceCount: z.coerce.number().min(0).optional(),
    poeBt60wDeviceCount: z.coerce.number().min(0).optional(),
  })
  .superRefine((data, ctx) => {
    if (data.needsPoE) {
      const p30 = data.poe30wDeviceCount ?? 0;
      const p60 = data.poeBt60wDeviceCount ?? 0;
      if (p30 + p60 < 1) {
        ctx.addIssue({
          code: "custom",
          message: "Specify at least one PoE device count",
          path: ["poe30wDeviceCount"],
        });
      }
    }
  });

export const wirelessDesignGoalSchema = z.enum(["capacity", "coverage"]);

export const sitePlanFileSchema = z.object({
  name: z.string(),
  type: z.string(),
  url: z.string(),
});

export const wirelessSiteSchema = z.object({
  facilityType: z.string().min(1, "Required"),
  ceilingHeight: z.string().min(1, "Required"),
  numberOfFloors: z.coerce.number().min(1, "Required"),
  internalWallMaterial: z.string().min(1, "Required"),
  externalWallMaterial: z.string().min(1, "Required"),
  floorPlanNotes: z.string().min(1, "Required"),
  sitePlanFiles: z.array(sitePlanFileSchema).optional(),
  totalUsers: z.coerce.number().min(1, "Required"),
  usersPerAp: z.coerce.number().min(1, "Required"),
  designGoal: wirelessDesignGoalSchema,
  lowSignalAcceptableAreas: z.string().optional(),
  highBandwidthAreas: z.string().optional(),
  devicesPerUser: z.string().optional(),
  suggestedApModels: z.string().optional(),
  unavailableChannels: z.string().optional(),
  restrictedChannels: z.string().optional(),
});

export const AP6_MODEL_OPTIONS = [
  { value: "", label: "No preference" },
  { value: "AP6 420", label: "AP6 420" },
  { value: "AP6 420E", label: "AP6 420E (Wi-Fi 6E)" },
  { value: "AP6 840", label: "AP6 840" },
  { value: "AP6 840E", label: "AP6 840E (Wi-Fi 6E)" },
  { value: "AP6 420X", label: "AP6 420X (outdoor)" },
] as const;

export const siteSubmissionSchema = z
  .object({
    siteName: z.string().min(1, "Site name is required"),
    enableFirewall: z.boolean(),
    enableSwitches: z.boolean(),
    enableWireless: z.boolean(),
    firewall: firewallSiteSchema.optional(),
    switches: switchSiteSchema.optional(),
    wireless: wirelessSiteSchema.optional(),
  })
  .superRefine((data, ctx) => {
    if (!data.enableFirewall && !data.enableSwitches && !data.enableWireless) {
      ctx.addIssue({
        code: "custom",
        message: "Select at least one product for this site",
        path: ["enableFirewall"],
      });
    }
    if (data.enableFirewall && !data.firewall) {
      ctx.addIssue({
        code: "custom",
        message: "Complete firewall details",
        path: ["firewall"],
      });
    }
    if (data.enableSwitches && !data.switches) {
      ctx.addIssue({
        code: "custom",
        message: "Complete switch details",
        path: ["switches"],
      });
    }
    if (data.enableWireless && !data.wireless) {
      ctx.addIssue({
        code: "custom",
        message: "Complete wireless details",
        path: ["wireless"],
      });
    }
  });

export const sizingSubmissionSchema = z.object({
  schemaVersion: z.literal(2),
  contact: z
    .object({
      customerName: z.string().optional(),
      customerEmail: z.string().email().optional().or(z.literal("")),
    })
    .optional(),
  sites: z.array(siteSubmissionSchema).min(1, "Add at least one site"),
});

export type SizingSubmissionInput = z.infer<typeof sizingSubmissionSchema>;

export const createRequestSchema = z.object({
  label: z.string().min(2, "Company / customer name is required"),
  slug: z
    .string()
    .min(3, "Slug must be at least 3 characters")
    .max(64)
    .regex(
      /^[a-z0-9-]+$/,
      "Slug may only contain lowercase letters, numbers, and hyphens",
    ),
  contactName: z.string().optional(),
  contactEmail: z.string().email("A valid contact email is required"),
  expiresAt: z.string().optional(),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export const ENVIRONMENT_LABELS: Record<
  z.infer<typeof environmentSchema>,
  string
> = {
  physical: "Physical (Sophos hardware)",
  virtual: "Virtual",
  aws: "Amazon Web Services (AWS)",
  azure: "Microsoft Azure",
};

export const SITE_ROLE_LABELS: Record<
  z.infer<typeof siteRoleSchema>,
  string
> = {
  hq: "Head office / HQ",
  branch: "Branch site",
  datacenter: "Datacenter",
  cloud_edge: "Cloud edge",
};

export const TLS_INSPECTION_LABELS: Record<
  z.infer<typeof tlsInspectionScopeSchema>,
  string
> = {
  full: "Full — inspect most HTTPS traffic",
  selective: "Selective — key categories and domains only",
  minimal: "Minimal — little or no TLS inspection",
};

export const VPN_TYPE_LABELS: Record<z.infer<typeof vpnTypeSchema>, string> = {
  none: "No VPN",
  ipsec: "Site-to-site (IPsec / SD-WAN) only",
  ssl: "Remote access (SSL VPN) only",
  both: "Both IPsec/SD-WAN and SSL VPN",
};

export const WIRELESS_DESIGN_GOAL_LABELS: Record<
  z.infer<typeof wirelessDesignGoalSchema>,
  string
> = {
  capacity: "Capacity",
  coverage: "Coverage",
};
