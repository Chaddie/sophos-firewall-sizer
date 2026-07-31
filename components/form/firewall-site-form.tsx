"use client";

import { RadioGroup } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { LabelWithTooltip } from "@/components/form/info-tooltip";
import {
  RadioOptionCard,
  RadioOptionRow,
} from "@/components/form/radio-option-card";
import {
  FormField,
  YesNoField,
  type FirewallFormState,
} from "@/components/form/form-field";
import {
  ENVIRONMENT_TOOLTIPS,
  HA_TOOLTIPS,
  PROTECTION_INCLUDES,
  PROTECTION_NOT_INCLUDED,
  PROTECTION_TOOLTIPS,
  SITE_ROLE_TOOLTIPS,
  TLS_INSPECTION_TOOLTIPS,
  USER_FIELD_TOOLTIPS,
  VPN_FIELD_TOOLTIPS,
  VPN_TYPE_TOOLTIPS,
  WAF_LICENSE_LABELS,
  WAN_FIELD_TOOLTIPS,
  XSTREAM_MDR_NOTE,
} from "@/lib/form-tooltips";
import type {
  Environment,
  ProtectionLevel,
  SiteRole,
  TlsInspectionScope,
  VpnType,
  WafLicense,
} from "@/lib/sizing/types";
import {
  ENVIRONMENT_LABELS,
  SITE_ROLE_LABELS,
  TLS_INSPECTION_LABELS,
  VPN_TYPE_LABELS,
} from "@/lib/validations";

interface FirewallSiteFormProps {
  value: FirewallFormState;
  onChange: (value: FirewallFormState) => void;
  errors?: Record<string, string[]>;
  idPrefix?: string;
}

export function FirewallSiteForm({
  value,
  onChange,
  errors = {},
  idPrefix = "fw",
}: FirewallSiteFormProps) {
  function set<K extends keyof FirewallFormState>(
    key: K,
    val: FirewallFormState[K],
  ) {
    onChange({ ...value, [key]: val });
  }

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <LabelWithTooltip
          label="Deployment type"
          tooltip="How the Sophos Firewall will be deployed at this site."
        />
        <RadioGroup
          value={value.environment}
          onValueChange={(v) => set("environment", v as Environment)}
          className="space-y-3"
        >
          {(Object.entries(ENVIRONMENT_LABELS) as [Environment, string][]).map(
            ([env, labelText]) => (
              <RadioOptionRow
                key={env}
                value={env}
                id={`${idPrefix}-env-${env}`}
                label={labelText}
                tooltip={ENVIRONMENT_TOOLTIPS[env]}
              />
            ),
          )}
        </RadioGroup>
      </div>

      <div className="space-y-3">
        <LabelWithTooltip
          label="Site role"
          tooltip="The function of this location in your network."
        />
        <RadioGroup
          value={value.siteRole}
          onValueChange={(v) => set("siteRole", v as SiteRole)}
          className="space-y-3"
        >
          {(Object.entries(SITE_ROLE_LABELS) as [SiteRole, string][]).map(
            ([role, labelText]) => (
              <RadioOptionRow
                key={role}
                value={role}
                id={`${idPrefix}-role-${role}`}
                label={labelText}
                tooltip={SITE_ROLE_TOOLTIPS[role]}
              />
            ),
          )}
        </RadioGroup>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField
          id={`${idPrefix}-totalWanBandwidthMbps`}
          label="Internet circuit speed (Mbps)"
          tooltip={WAN_FIELD_TOOLTIPS.totalWanBandwidthMbps}
          type="number"
          value={value.totalWanBandwidthMbps}
          onChange={(v) => set("totalWanBandwidthMbps", v)}
          errors={errors.totalWanBandwidthMbps}
        />
        <FormField
          id={`${idPrefix}-averageWanConsumptionMbps`}
          label="Typical usage (Mbps)"
          tooltip={WAN_FIELD_TOOLTIPS.averageWanConsumptionMbps}
          type="number"
          value={value.averageWanConsumptionMbps}
          onChange={(v) => set("averageWanConsumptionMbps", v)}
          errors={errors.averageWanConsumptionMbps}
        />
        <FormField
          id={`${idPrefix}-expectedPeakThroughputMbps`}
          label="Expected peak throughput (Mbps)"
          tooltip={WAN_FIELD_TOOLTIPS.expectedPeakThroughputMbps}
          type="number"
          value={value.expectedPeakThroughputMbps}
          onChange={(v) => set("expectedPeakThroughputMbps", v)}
          errors={errors.expectedPeakThroughputMbps}
        />
        <FormField
          id={`${idPrefix}-wanGrowth3yrPercent`}
          label="3-year growth (%)"
          tooltip={WAN_FIELD_TOOLTIPS.wanGrowth3yrPercent}
          type="number"
          value={value.wanGrowth3yrPercent}
          onChange={(v) => set("wanGrowth3yrPercent", v)}
          errors={errors.wanGrowth3yrPercent}
        />
      </div>

      <div className="space-y-3">
        <LabelWithTooltip
          label="Protection subscription"
          tooltip="Standard and Xstream bundles. Email Protection, WAF, and ZTNA are separate licenses in either case."
        />
        <RadioGroup
          value={value.protection}
          onValueChange={(v) => set("protection", v as ProtectionLevel)}
          className="space-y-3"
        >
          <RadioOptionCard
            value="xstream"
            id={`${idPrefix}-xstream`}
            label="Xstream protection (recommended)"
            tooltip={PROTECTION_TOOLTIPS.xstream}
            note={XSTREAM_MDR_NOTE}
            includes={PROTECTION_INCLUDES.xstream}
          />
          <RadioOptionCard
            value="standard"
            id={`${idPrefix}-standard`}
            label="Standard protection"
            tooltip={PROTECTION_TOOLTIPS.standard}
            includes={PROTECTION_INCLUDES.standard}
          />
        </RadioGroup>
        <div className="rounded-lg bg-muted/40 p-3">
          <p className="text-xs font-medium text-[var(--sophos-navy)]">
            Not included in either bundle:
          </p>
          <ul className="text-muted-foreground mt-1 list-inside list-disc space-y-0.5 text-xs">
            {PROTECTION_NOT_INCLUDED.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      </div>

      <div className="space-y-3">
        <LabelWithTooltip
          label="Web Server Protection (WAF) license"
          tooltip="WAF is not included in Standard or Xstream bundles."
        />
        <Select
          value={value.wafLicense}
          onValueChange={(v) => set("wafLicense", v as WafLicense)}
        >
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {(Object.entries(WAF_LICENSE_LABELS) as [WafLicense, string][]).map(
              ([k, labelText]) => (
                <SelectItem key={k} value={k}>
                  {labelText}
                </SelectItem>
              ),
            )}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-3">
        <LabelWithTooltip
          label="TLS / HTTPS inspection scope"
          tooltip="How much HTTPS traffic is decrypted and inspected."
        />
        <RadioGroup
          value={value.tlsInspectionScope}
          onValueChange={(v) =>
            set("tlsInspectionScope", v as TlsInspectionScope)
          }
          className="space-y-3"
        >
          {(
            Object.entries(TLS_INSPECTION_LABELS) as [TlsInspectionScope, string][]
          ).map(([scope, labelText]) => (
            <RadioOptionRow
              key={scope}
              value={scope}
              id={`${idPrefix}-tls-${scope}`}
              label={labelText}
              tooltip={TLS_INSPECTION_TOOLTIPS[scope]}
            />
          ))}
        </RadioGroup>
      </div>

      <div className="space-y-3">
        <LabelWithTooltip label="VPN type" tooltip={VPN_TYPE_TOOLTIPS.none} />
        <RadioGroup
          value={value.vpnType}
          onValueChange={(v) => {
            const vpnType = v as VpnType;
            onChange({
              ...value,
              vpnType,
              ...(vpnType === "none"
                ? {
                    ipsecTunnels: "",
                    sslVpnTunnels: "",
                    peakVpnThroughputMbps: "",
                  }
                : {}),
            });
          }}
          className="space-y-3"
        >
          {(Object.entries(VPN_TYPE_LABELS) as [VpnType, string][]).map(
            ([vpn, labelText]) => (
              <RadioOptionRow
                key={vpn}
                value={vpn}
                id={`${idPrefix}-vpn-${vpn}`}
                label={labelText}
                tooltip={VPN_TYPE_TOOLTIPS[vpn]}
              />
            ),
          )}
        </RadioGroup>
      </div>

      {value.vpnType !== "none" && (
        <div className="grid gap-4 sm:grid-cols-2">
          {(value.vpnType === "ipsec" || value.vpnType === "both") && (
            <FormField
              id={`${idPrefix}-ipsecTunnels`}
              label="Concurrent IPsec (SD-WAN) tunnels"
              tooltip={VPN_FIELD_TOOLTIPS.ipsecTunnels}
              type="number"
              value={value.ipsecTunnels}
              onChange={(v) => set("ipsecTunnels", v)}
              errors={errors.ipsecTunnels}
            />
          )}
          {(value.vpnType === "ssl" || value.vpnType === "both") && (
            <FormField
              id={`${idPrefix}-sslVpnTunnels`}
              label="Concurrent SSL VPN tunnels"
              tooltip={VPN_FIELD_TOOLTIPS.sslVpnTunnels}
              type="number"
              value={value.sslVpnTunnels}
              onChange={(v) => set("sslVpnTunnels", v)}
              errors={errors.sslVpnTunnels}
            />
          )}
          <FormField
            id={`${idPrefix}-peakVpnThroughputMbps`}
            label="Peak VPN throughput (Mbps)"
            tooltip={VPN_FIELD_TOOLTIPS.peakVpnThroughputMbps}
            type="number"
            className="sm:col-span-2"
            value={value.peakVpnThroughputMbps}
            onChange={(v) => set("peakVpnThroughputMbps", v)}
            errors={errors.peakVpnThroughputMbps}
          />
        </div>
      )}

      <FormField
        id={`${idPrefix}-endpointCount`}
        label="Users or endpoints (optional)"
        tooltip={USER_FIELD_TOOLTIPS.endpointCount}
        type="number"
        value={value.endpointCount}
        onChange={(v) => set("endpointCount", v)}
        errors={errors.endpointCount}
      />
      <YesNoField
        label="Will users authenticate through the firewall?"
        tooltip={USER_FIELD_TOOLTIPS.userAuthEnabled}
        value={value.userAuthEnabled}
        onChange={(v) => set("userAuthEnabled", v)}
      />
      {value.userAuthEnabled && (
        <FormField
          id={`${idPrefix}-authUserCount`}
          label="Users requiring firewall authentication"
          tooltip={USER_FIELD_TOOLTIPS.authUserCount}
          type="number"
          value={value.authUserCount}
          onChange={(v) => set("authUserCount", v)}
          errors={errors.authUserCount}
        />
      )}
      <YesNoField
        label="Will internal traffic be routed through the firewall?"
        tooltip={USER_FIELD_TOOLTIPS.internalTrafficEnabled}
        value={value.internalTrafficEnabled}
        onChange={(v) => set("internalTrafficEnabled", v)}
      />
      {value.internalTrafficEnabled && (
        <FormField
          id={`${idPrefix}-internalTrafficMbps`}
          label="Estimated internal traffic (Mbps)"
          tooltip={USER_FIELD_TOOLTIPS.internalTrafficMbps}
          type="number"
          value={value.internalTrafficMbps}
          onChange={(v) => set("internalTrafficMbps", v)}
          errors={errors.internalTrafficMbps}
        />
      )}
      <YesNoField
        label="High availability required?"
        tooltip={HA_TOOLTIPS.haRequired}
        value={value.haRequired}
        onChange={(v) => set("haRequired", v)}
      />
    </div>
  );
}
