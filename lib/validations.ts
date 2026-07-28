import { z } from "zod";

export const environmentSchema = z.enum([
  "physical",
  "virtual",
  "aws",
  "azure",
]);

export const protectionSchema = z.enum(["standard", "xstream"]);

export const sizingFormSchema = z
  .object({
    environment: environmentSchema,
    totalWanBandwidthMbps: z.coerce.number().min(1, "Required"),
    averageWanConsumptionMbps: z.coerce.number().min(0, "Required"),
    wanGrowth3yrPercent: z.coerce.number().min(0).max(500),
    anticipatedPeakGrowthMbps: z.coerce.number().min(0, "Required"),
    anticipatedAverageGrowthMbps: z.coerce.number().min(0, "Required"),
    protection: protectionSchema,
    vpnEnabled: z.boolean(),
    ipsecTunnels: z.coerce.number().min(0).optional(),
    sslVpnTunnels: z.coerce.number().min(0).optional(),
    peakVpnThroughputMbps: z.coerce.number().min(0).optional(),
    userAuthEnabled: z.boolean(),
    authUserCount: z.coerce.number().min(1).optional(),
    haRequired: z.boolean(),
    customerName: z.string().optional(),
    customerEmail: z.string().email().optional().or(z.literal("")),
  })
  .superRefine((data, ctx) => {
    if (data.vpnEnabled) {
      if (data.ipsecTunnels === undefined) {
        ctx.addIssue({
          code: "custom",
          message: "Required when VPN is enabled",
          path: ["ipsecTunnels"],
        });
      }
      if (data.sslVpnTunnels === undefined) {
        ctx.addIssue({
          code: "custom",
          message: "Required when VPN is enabled",
          path: ["sslVpnTunnels"],
        });
      }
      if (data.peakVpnThroughputMbps === undefined) {
        ctx.addIssue({
          code: "custom",
          message: "Required when VPN is enabled",
          path: ["peakVpnThroughputMbps"],
        });
      }
    }
    if (data.userAuthEnabled && !data.authUserCount) {
      ctx.addIssue({
        code: "custom",
        message: "Required when user authentication is enabled",
        path: ["authUserCount"],
      });
    }
  });

export type SizingFormInput = z.infer<typeof sizingFormSchema>;

export const createRequestSchema = z.object({
  label: z.string().optional(),
  slug: z
    .string()
    .min(3, "Slug must be at least 3 characters")
    .max(64)
    .regex(
      /^[a-z0-9-]+$/,
      "Slug may only contain lowercase letters, numbers, and hyphens",
    ),
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
