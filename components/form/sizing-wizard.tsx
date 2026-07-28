"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { submitSizingForm } from "@/lib/actions";
import { ENVIRONMENT_LABELS } from "@/lib/validations";
import type { Environment, ProtectionLevel } from "@/lib/sizing/types";

const STEPS = [
  "Environment",
  "WAN traffic",
  "Protection",
  "VPN",
  "Authentication",
  "High availability",
  "Contact",
] as const;

interface FormState {
  environment: Environment;
  totalWanBandwidthMbps: string;
  averageWanConsumptionMbps: string;
  wanGrowth3yrPercent: string;
  anticipatedPeakGrowthMbps: string;
  anticipatedAverageGrowthMbps: string;
  protection: ProtectionLevel;
  vpnEnabled: boolean;
  ipsecTunnels: string;
  sslVpnTunnels: string;
  peakVpnThroughputMbps: string;
  userAuthEnabled: boolean;
  authUserCount: string;
  haRequired: boolean;
  customerName: string;
  customerEmail: string;
}

const initialState: FormState = {
  environment: "physical",
  totalWanBandwidthMbps: "",
  averageWanConsumptionMbps: "",
  wanGrowth3yrPercent: "20",
  anticipatedPeakGrowthMbps: "",
  anticipatedAverageGrowthMbps: "",
  protection: "standard",
  vpnEnabled: false,
  ipsecTunnels: "",
  sslVpnTunnels: "",
  peakVpnThroughputMbps: "",
  userAuthEnabled: false,
  authUserCount: "",
  haRequired: false,
  customerName: "",
  customerEmail: "",
};

interface SizingWizardProps {
  slug: string;
  label?: string | null;
}

export function SizingWizard({ slug, label }: SizingWizardProps) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<FormState>(initialState);
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [submitting, setSubmitting] = useState(false);

  const progress = ((step + 1) / STEPS.length) * 100;

  function updateField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }

  function validateStep(): boolean {
    const stepErrors: Record<string, string[]> = {};

    if (step === 1) {
      if (!form.totalWanBandwidthMbps)
        stepErrors.totalWanBandwidthMbps = ["Required"];
      if (!form.averageWanConsumptionMbps)
        stepErrors.averageWanConsumptionMbps = ["Required"];
      if (!form.anticipatedPeakGrowthMbps)
        stepErrors.anticipatedPeakGrowthMbps = ["Required"];
      if (!form.anticipatedAverageGrowthMbps)
        stepErrors.anticipatedAverageGrowthMbps = ["Required"];
    }

    if (step === 3 && form.vpnEnabled) {
      if (!form.ipsecTunnels) stepErrors.ipsecTunnels = ["Required"];
      if (!form.sslVpnTunnels) stepErrors.sslVpnTunnels = ["Required"];
      if (!form.peakVpnThroughputMbps)
        stepErrors.peakVpnThroughputMbps = ["Required"];
    }

    if (step === 4 && form.userAuthEnabled) {
      if (!form.authUserCount) stepErrors.authUserCount = ["Required"];
    }

    setErrors(stepErrors);
    return Object.keys(stepErrors).length === 0;
  }

  function nextStep() {
    if (!validateStep()) return;
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  }

  function prevStep() {
    setStep((s) => Math.max(s - 1, 0));
  }

  async function handleSubmit() {
    if (!validateStep()) return;
    setSubmitting(true);
    setErrors({});

    const fd = new FormData();
    fd.set("environment", form.environment);
    fd.set("totalWanBandwidthMbps", form.totalWanBandwidthMbps);
    fd.set("averageWanConsumptionMbps", form.averageWanConsumptionMbps);
    fd.set("wanGrowth3yrPercent", form.wanGrowth3yrPercent);
    fd.set("anticipatedPeakGrowthMbps", form.anticipatedPeakGrowthMbps);
    fd.set("anticipatedAverageGrowthMbps", form.anticipatedAverageGrowthMbps);
    fd.set("protection", form.protection);
    fd.set("vpnEnabled", String(form.vpnEnabled));
    if (form.vpnEnabled) {
      fd.set("ipsecTunnels", form.ipsecTunnels);
      fd.set("sslVpnTunnels", form.sslVpnTunnels);
      fd.set("peakVpnThroughputMbps", form.peakVpnThroughputMbps);
    }
    fd.set("userAuthEnabled", String(form.userAuthEnabled));
    if (form.userAuthEnabled) {
      fd.set("authUserCount", form.authUserCount);
    }
    fd.set("haRequired", String(form.haRequired));
    if (form.customerName) fd.set("customerName", form.customerName);
    if (form.customerEmail) fd.set("customerEmail", form.customerEmail);

    const result = await submitSizingForm(slug, fd);
    if (result?.error) {
      const flat: Record<string, string[]> = {};
      for (const [key, val] of Object.entries(result.error)) {
        if (val) flat[key] = val;
      }
      setErrors(flat);
      setSubmitting(false);
      return;
    }
    if (result?.success) {
      router.push(`/r/${slug}/thanks`);
    }
  }

  return (
    <div className="mx-auto w-full max-w-2xl space-y-6 px-4 py-8">
      <div className="space-y-2 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">
          Firewall Sizing Questionnaire
        </h1>
        <p className="text-muted-foreground text-sm">
          {label
            ? `Sizing request for ${label}`
            : "Help us understand your network requirements"}
        </p>
      </div>

      <div className="space-y-2">
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>
            Step {step + 1} of {STEPS.length}: {STEPS[step]}
          </span>
          <span>{Math.round(progress)}%</span>
        </div>
        <Progress value={progress} />
      </div>

      {errors._form && (
        <Alert variant="destructive">
          <AlertDescription>{errors._form.join(", ")}</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>{STEPS[step]}</CardTitle>
          <CardDescription>
            {step === 0 && "Where will the firewall be deployed?"}
            {step === 1 && "Tell us about your WAN connectivity and growth plans."}
            {step === 2 && "Choose your protection level."}
            {step === 3 && "Will site-to-site or remote access VPN be used?"}
            {step === 4 && "Will users authenticate through the firewall?"}
            {step === 5 && "Do you require a high availability pair?"}
            {step === 6 && "Optional contact details for your presales team."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {step === 0 && (
            <RadioGroup
              value={form.environment}
              onValueChange={(v) => updateField("environment", v as Environment)}
              className="space-y-3"
            >
              {(Object.entries(ENVIRONMENT_LABELS) as [Environment, string][]).map(
                ([value, labelText]) => (
                  <div key={value} className="flex items-center gap-3 rounded-lg border p-4">
                    <RadioGroupItem value={value} id={value} />
                    <Label htmlFor={value} className="cursor-pointer font-normal">
                      {labelText}
                    </Label>
                  </div>
                ),
              )}
            </RadioGroup>
          )}

          {step === 1 && (
            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                id="totalWanBandwidthMbps"
                label="Total WAN bandwidth (Mbps)"
                hint="Your contracted line speed"
                value={form.totalWanBandwidthMbps}
                onChange={(v) => updateField("totalWanBandwidthMbps", v)}
                errors={errors.totalWanBandwidthMbps}
              />
              <Field
                id="averageWanConsumptionMbps"
                label="Average WAN consumption (Mbps)"
                hint="Typical usage during business hours"
                value={form.averageWanConsumptionMbps}
                onChange={(v) => updateField("averageWanConsumptionMbps", v)}
                errors={errors.averageWanConsumptionMbps}
              />
              <Field
                id="wanGrowth3yrPercent"
                label="Anticipated WAN growth over 3 years (%)"
                value={form.wanGrowth3yrPercent}
                onChange={(v) => updateField("wanGrowth3yrPercent", v)}
                errors={errors.wanGrowth3yrPercent}
              />
              <Field
                id="anticipatedPeakGrowthMbps"
                label="Anticipated peak growth (Mbps)"
                hint="Maximum expected throughput"
                value={form.anticipatedPeakGrowthMbps}
                onChange={(v) => updateField("anticipatedPeakGrowthMbps", v)}
                errors={errors.anticipatedPeakGrowthMbps}
              />
              <Field
                id="anticipatedAverageGrowthMbps"
                label="Anticipated average growth (Mbps)"
                className="sm:col-span-2"
                value={form.anticipatedAverageGrowthMbps}
                onChange={(v) => updateField("anticipatedAverageGrowthMbps", v)}
                errors={errors.anticipatedAverageGrowthMbps}
              />
            </div>
          )}

          {step === 2 && (
            <RadioGroup
              value={form.protection}
              onValueChange={(v) =>
                updateField("protection", v as ProtectionLevel)
              }
              className="space-y-3"
            >
              <div className="flex items-start gap-3 rounded-lg border p-4">
                <RadioGroupItem value="standard" id="standard" className="mt-1" />
                <div>
                  <Label htmlFor="standard" className="cursor-pointer font-medium">
                    Standard protection
                  </Label>
                  <p className="text-muted-foreground mt-1 text-sm">
                    Full threat stack without Zero-Day Protection (sandboxing of
                    unknown files).
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3 rounded-lg border p-4">
                <RadioGroupItem value="xstream" id="xstream" className="mt-1" />
                <div>
                  <Label htmlFor="xstream" className="cursor-pointer font-medium">
                    Xstream protection
                  </Label>
                  <p className="text-muted-foreground mt-1 text-sm">
                    Includes Zero-Day Protection module for sandboxing unknown
                    files. Requires higher throughput headroom.
                  </p>
                </div>
              </div>
            </RadioGroup>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <YesNo
                label="Will VPN be used?"
                value={form.vpnEnabled}
                onChange={(v) => updateField("vpnEnabled", v)}
              />
              {form.vpnEnabled && (
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field
                    id="ipsecTunnels"
                    label="Concurrent IPsec tunnels"
                    value={form.ipsecTunnels}
                    onChange={(v) => updateField("ipsecTunnels", v)}
                    errors={errors.ipsecTunnels}
                  />
                  <Field
                    id="sslVpnTunnels"
                    label="Concurrent SSL VPN tunnels"
                    value={form.sslVpnTunnels}
                    onChange={(v) => updateField("sslVpnTunnels", v)}
                    errors={errors.sslVpnTunnels}
                  />
                  <Field
                    id="peakVpnThroughputMbps"
                    label="Peak VPN throughput (Mbps)"
                    className="sm:col-span-2"
                    value={form.peakVpnThroughputMbps}
                    onChange={(v) => updateField("peakVpnThroughputMbps", v)}
                    errors={errors.peakVpnThroughputMbps}
                  />
                </div>
              )}
            </div>
          )}

          {step === 4 && (
            <div className="space-y-4">
              <YesNo
                label="Will user authentication be used?"
                value={form.userAuthEnabled}
                onChange={(v) => updateField("userAuthEnabled", v)}
              />
              {form.userAuthEnabled && (
                <Field
                  id="authUserCount"
                  label="Number of authenticated users"
                  value={form.authUserCount}
                  onChange={(v) => updateField("authUserCount", v)}
                  errors={errors.authUserCount}
                />
              )}
            </div>
          )}

          {step === 5 && (
            <div className="space-y-4">
              <YesNo
                label="High availability required?"
                value={form.haRequired}
                onChange={(v) => updateField("haRequired", v)}
              />
              {form.haRequired && (
                <p className="text-muted-foreground rounded-lg bg-muted p-4 text-sm">
                  A high availability deployment will recommend two appliances
                  plus Enhanced Support and Upgrade entitlement.
                </p>
              )}
            </div>
          )}

          {step === 6 && (
            <div className="grid gap-4">
              <Field
                id="customerName"
                label="Your name (optional)"
                value={form.customerName}
                onChange={(v) => updateField("customerName", v)}
              />
              <Field
                id="customerEmail"
                label="Your email (optional)"
                type="email"
                value={form.customerEmail}
                onChange={(v) => updateField("customerEmail", v)}
                errors={errors.customerEmail}
              />
            </div>
          )}

          <div className="flex justify-between pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={prevStep}
              disabled={step === 0 || submitting}
            >
              Back
            </Button>
            {step < STEPS.length - 1 ? (
              <Button type="button" onClick={nextStep}>
                Continue
              </Button>
            ) : (
              <Button type="button" onClick={handleSubmit} disabled={submitting}>
                {submitting ? "Submitting…" : "Submit"}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function Field({
  id,
  label,
  hint,
  value,
  onChange,
  errors,
  type = "number",
  className,
}: {
  id: string;
  label: string;
  hint?: string;
  value: string;
  onChange: (v: string) => void;
  errors?: string[];
  type?: string;
  className?: string;
}) {
  return (
    <div className={className}>
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        type={type}
        min={type === "number" ? 0 : undefined}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1.5"
      />
      {hint && (
        <p className="text-muted-foreground mt-1 text-xs">{hint}</p>
      )}
      {errors && (
        <p className="text-destructive mt-1 text-xs">{errors.join(", ")}</p>
      )}
    </div>
  );
}

function YesNo({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <RadioGroup
      value={value ? "yes" : "no"}
      onValueChange={(v) => onChange(v === "yes")}
      className="flex gap-4"
    >
      <span className="text-sm font-medium">{label}</span>
      <div className="flex items-center gap-2">
        <RadioGroupItem value="yes" id={`${label}-yes`} />
        <Label htmlFor={`${label}-yes`} className="font-normal">
          Yes
        </Label>
      </div>
      <div className="flex items-center gap-2">
        <RadioGroupItem value="no" id={`${label}-no`} />
        <Label htmlFor={`${label}-no`} className="font-normal">
          No
        </Label>
      </div>
    </RadioGroup>
  );
}
