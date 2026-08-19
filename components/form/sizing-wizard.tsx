"use client";

import { useEffect, useRef, useState } from "react";
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
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { submitSizingForm } from "@/lib/actions";
import { AppHeader } from "@/components/brand/app-header";
import { FirewallSiteForm } from "@/components/form/firewall-site-form";
import { SwitchSiteForm } from "@/components/form/switch-site-form";
import { WirelessSiteForm } from "@/components/form/wireless-site-form";
import { ProductToggle } from "@/components/form/form-field";
import { LabelWithTooltip } from "@/components/form/info-tooltip";
import { sophosBrand } from "@/lib/brand";
import {
  defaultSiteState,
  sitesToSubmissionPayload,
  type SiteFormState,
} from "@/lib/form/defaults";
import {
  PRODUCT_TOGGLE_TOOLTIPS,
  SITE_FIELD_TOOLTIPS,
  WAF_LICENSE_LABELS,
} from "@/lib/form-tooltips";
import {
  ENVIRONMENT_LABELS,
  SITE_ROLE_LABELS,
  TLS_INSPECTION_LABELS,
  VPN_TYPE_LABELS,
  WIRELESS_DESIGN_GOAL_LABELS,
  sizingSubmissionSchema,
} from "@/lib/validations";

const STEP_LABELS = ["Sites", "Configure", "Review"] as const;
const DRAFT_VERSION = 1;

interface SizingWizardProps {
  slug: string;
  label?: string | null;
}

interface DraftPayload {
  version: number;
  step: number;
  configureSiteIndex: number;
  sites: SiteFormState[];
  updatedAt: string;
}

function draftStorageKey(slug: string) {
  return `sophos-sizing-draft:${slug}`;
}

function loadDraft(slug: string): DraftPayload | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(draftStorageKey(slug));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as DraftPayload;
    if (parsed.version !== DRAFT_VERSION || !Array.isArray(parsed.sites)) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function saveDraft(slug: string, payload: Omit<DraftPayload, "version" | "updatedAt">) {
  try {
    const full: DraftPayload = {
      version: DRAFT_VERSION,
      ...payload,
      updatedAt: new Date().toISOString(),
    };
    localStorage.setItem(draftStorageKey(slug), JSON.stringify(full));
  } catch {
    // Ignore quota / private mode failures.
  }
}

function clearDraft(slug: string) {
  try {
    localStorage.removeItem(draftStorageKey(slug));
  } catch {
    // ignore
  }
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-muted-foreground text-xs">{label}</dt>
      <dd className="text-sm font-medium">{value}</dd>
    </div>
  );
}

function siteReviewSections(site: SiteFormState) {
  const sections: { title: string; rows: { label: string; value: string }[] }[] =
    [];

  if (site.enableFirewall) {
    const fw = site.firewall;
    const rows: { label: string; value: string }[] = [
      {
        label: "Deployment",
        value: ENVIRONMENT_LABELS[fw.environment],
      },
      { label: "Site role", value: SITE_ROLE_LABELS[fw.siteRole] },
      {
        label: "Internet circuit",
        value: fw.totalWanBandwidthMbps
          ? `${fw.totalWanBandwidthMbps} Mbps`
          : "—",
      },
      {
        label: "Typical usage",
        value: fw.averageWanConsumptionMbps
          ? `${fw.averageWanConsumptionMbps} Mbps`
          : "—",
      },
      {
        label: "Peak throughput",
        value: fw.expectedPeakThroughputMbps
          ? `${fw.expectedPeakThroughputMbps} Mbps`
          : "—",
      },
      {
        label: "Protection",
        value: fw.protection === "xstream" ? "Xstream" : "Standard",
      },
      {
        label: "TLS inspection",
        value: TLS_INSPECTION_LABELS[fw.tlsInspectionScope],
      },
      {
        label: "WAF",
        value: WAF_LICENSE_LABELS[fw.wafLicense],
      },
      { label: "VPN", value: VPN_TYPE_LABELS[fw.vpnType] },
      { label: "High availability", value: fw.haRequired ? "Yes" : "No" },
    ];
    if (fw.endpointCount) {
      rows.push({ label: "Endpoints", value: fw.endpointCount });
    }
    sections.push({ title: "Firewall", rows });
  }

  if (site.enableSwitches) {
    const sw = site.switches;
    const rows: { label: string; value: string }[] = [
      {
        label: "Port count",
        value: sw.switchPortCount || "—",
      },
      { label: "Needs 2.5GbE", value: sw.needs2_5GbE ? "Yes" : "No" },
      { label: "Needs 10GbE", value: sw.needs10GbE ? "Yes" : "No" },
      {
        label: "10Gb SFP+ uplink",
        value: sw.needs10GbSfpUplink ? "Yes" : "No",
      },
      { label: "PoE", value: sw.needsPoE ? "Yes" : "No" },
    ];
    if (sw.needsPoE) {
      rows.push({
        label: "30W PoE devices",
        value: sw.poe30wDeviceCount || "0",
      });
      rows.push({
        label: "60W BT PoE devices",
        value: sw.poeBt60wDeviceCount || "0",
      });
    }
    sections.push({ title: "Switches", rows });
  }

  if (site.enableWireless) {
    const w = site.wireless;
    sections.push({
      title: "Wireless",
      rows: [
        { label: "Facility type", value: w.facilityType || "—" },
        { label: "Ceiling height", value: w.ceilingHeight || "—" },
        { label: "Floors", value: w.numberOfFloors || "—" },
        {
          label: "Internal walls",
          value: w.internalWallMaterial || "—",
        },
        {
          label: "External walls",
          value: w.externalWallMaterial || "—",
        },
        { label: "Floor plan notes", value: w.floorPlanNotes || "—" },
        { label: "Total users", value: w.totalUsers || "—" },
        { label: "Users per AP", value: w.usersPerAp || "—" },
        {
          label: "Design goal",
          value: WIRELESS_DESIGN_GOAL_LABELS[w.designGoal],
        },
        {
          label: "Site plans",
          value:
            w.sitePlanFiles.length > 0
              ? w.sitePlanFiles.map((f) => f.name).join(", ")
              : "None uploaded",
        },
      ],
    });
  }

  return sections;
}

export function SizingWizard({ slug, label }: SizingWizardProps) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [configureSiteIndex, setConfigureSiteIndex] = useState(0);
  const [sites, setSites] = useState<SiteFormState[]>([defaultSiteState("")]);
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [submitting, setSubmitting] = useState(false);
  const [draftRestored, setDraftRestored] = useState(false);
  const [draftSavedAt, setDraftSavedAt] = useState<string | null>(null);
  const hydrated = useRef(false);

  useEffect(() => {
    const draft = loadDraft(slug);
    if (draft && draft.sites.length > 0) {
      setSites(draft.sites);
      setStep(Math.min(Math.max(draft.step, 0), STEP_LABELS.length - 1));
      setConfigureSiteIndex(
        Math.min(
          Math.max(draft.configureSiteIndex, 0),
          Math.max(draft.sites.length - 1, 0),
        ),
      );
      setDraftRestored(true);
      setDraftSavedAt(draft.updatedAt);
    }
    hydrated.current = true;
  }, [slug]);

  useEffect(() => {
    if (!hydrated.current) return;
    const handle = window.setTimeout(() => {
      saveDraft(slug, { step, configureSiteIndex, sites });
      setDraftSavedAt(new Date().toISOString());
    }, 400);
    return () => window.clearTimeout(handle);
  }, [slug, step, configureSiteIndex, sites]);

  const progress = ((step + 1) / STEP_LABELS.length) * 100;
  const safeConfigureIndex = Math.min(
    configureSiteIndex,
    Math.max(sites.length - 1, 0),
  );
  const activeSite = sites[safeConfigureIndex] ?? sites[0];

  function updateSite(index: number, site: SiteFormState) {
    setSites((prev) => prev.map((s, i) => (i === index ? site : s)));
  }

  function addSite() {
    setSites((prev) => [...prev, defaultSiteState("")]);
  }

  function removeSite(index: number) {
    if (sites.length <= 1) return;
    setSites((prev) => prev.filter((_, i) => i !== index));
    setConfigureSiteIndex((prev) => {
      if (prev > index) return prev - 1;
      if (prev >= sites.length - 1) return Math.max(sites.length - 2, 0);
      return prev;
    });
  }

  function focusFirstError(stepErrors: Record<string, string[]>) {
    const firstKey = Object.keys(stepErrors)[0];
    if (!firstKey) return;
    const domId = firstKey.replace(/\./g, "-");
    requestAnimationFrame(() => {
      const el = document.getElementById(domId);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        if (typeof (el as HTMLElement).focus === "function") {
          (el as HTMLElement).focus({ preventScroll: true });
        }
      } else {
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    });
  }

  function validateSiteAt(index: number): Record<string, string[]> {
    const stepErrors: Record<string, string[]> = {};
    const site = sites[index];
    if (!site) return stepErrors;

    if (
      !site.enableFirewall &&
      !site.enableSwitches &&
      !site.enableWireless
    ) {
      stepErrors[`sites.${index}.products`] = ["Select at least one product"];
    }
    if (site.enableFirewall) {
      const fw = site.firewall;
      if (!fw.totalWanBandwidthMbps)
        stepErrors[`sites.${index}.totalWanBandwidthMbps`] = ["Required"];
      if (!fw.averageWanConsumptionMbps)
        stepErrors[`sites.${index}.averageWanConsumptionMbps`] = ["Required"];
      if (!fw.expectedPeakThroughputMbps)
        stepErrors[`sites.${index}.expectedPeakThroughputMbps`] = ["Required"];
      if (fw.vpnType !== "none") {
        if (
          (fw.vpnType === "ipsec" || fw.vpnType === "both") &&
          !fw.ipsecTunnels
        ) {
          stepErrors[`sites.${index}.ipsecTunnels`] = ["Required"];
        }
        if (
          (fw.vpnType === "ssl" || fw.vpnType === "both") &&
          !fw.sslVpnTunnels
        ) {
          stepErrors[`sites.${index}.sslVpnTunnels`] = ["Required"];
        }
        if (!fw.peakVpnThroughputMbps) {
          stepErrors[`sites.${index}.peakVpnThroughputMbps`] = ["Required"];
        }
      }
      if (fw.userAuthEnabled && !fw.authUserCount) {
        stepErrors[`sites.${index}.authUserCount`] = ["Required"];
      }
      if (fw.internalTrafficEnabled && !fw.internalTrafficMbps) {
        stepErrors[`sites.${index}.internalTrafficMbps`] = ["Required"];
      }
      if (
        fw.environment === "physical" &&
        fw.requiresSfpPlus &&
        fw.includeSophosTransceivers &&
        !fw.sfpTransceiverCount
      ) {
        stepErrors[`sites.${index}.sfpTransceiverCount`] = ["Required"];
      }
    }
    if (site.enableSwitches && !site.switches.switchPortCount) {
      stepErrors[`sites.${index}.switchPortCount`] = ["Required"];
    }
    if (site.enableWireless) {
      const w = site.wireless;
      if (!w.facilityType)
        stepErrors[`sites.${index}.facilityType`] = ["Required"];
      if (!w.ceilingHeight)
        stepErrors[`sites.${index}.ceilingHeight`] = ["Required"];
      if (!w.numberOfFloors)
        stepErrors[`sites.${index}.numberOfFloors`] = ["Required"];
      if (!w.internalWallMaterial)
        stepErrors[`sites.${index}.internalWallMaterial`] = ["Required"];
      if (!w.externalWallMaterial)
        stepErrors[`sites.${index}.externalWallMaterial`] = ["Required"];
      if (!w.floorPlanNotes)
        stepErrors[`sites.${index}.floorPlanNotes`] = ["Required"];
      if (!w.totalUsers) stepErrors[`sites.${index}.totalUsers`] = ["Required"];
      if (!w.usersPerAp) stepErrors[`sites.${index}.usersPerAp`] = ["Required"];
    }
    return stepErrors;
  }

  function validateStep(): boolean {
    const stepErrors: Record<string, string[]> = {};

    if (step === 0) {
      sites.forEach((site, i) => {
        if (!site.siteName.trim()) {
          stepErrors[`sites.${i}.siteName`] = ["Site name is required"];
        }
      });
      const names = sites.map((s) => s.siteName.trim().toLowerCase());
      if (new Set(names).size !== names.length) {
        stepErrors.siteNames = ["Site names must be unique"];
      }
    }

    if (step === 1) {
      Object.assign(stepErrors, validateSiteAt(safeConfigureIndex));
    }

    setErrors(stepErrors);
    if (Object.keys(stepErrors).length > 0) {
      focusFirstError(stepErrors);
      return false;
    }
    return true;
  }

  function nextStep() {
    if (!validateStep()) return;
    if (step === 0) {
      setConfigureSiteIndex(0);
      setStep(1);
      return;
    }
    if (step === 1) {
      if (safeConfigureIndex < sites.length - 1) {
        setConfigureSiteIndex(safeConfigureIndex + 1);
        window.scrollTo({ top: 0, behavior: "smooth" });
        return;
      }
      setStep(2);
      return;
    }
    setStep((s) => Math.min(s + 1, STEP_LABELS.length - 1));
  }

  function prevStep() {
    if (step === 1 && safeConfigureIndex > 0) {
      setConfigureSiteIndex(safeConfigureIndex - 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    if (step === 2) {
      setConfigureSiteIndex(Math.max(sites.length - 1, 0));
    }
    setStep((s) => Math.max(s - 1, 0));
  }

  function editSite(index: number) {
    setConfigureSiteIndex(index);
    setStep(1);
    setErrors({});
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleSubmit() {
    // Validate all sites before submit from Review.
    const allErrors: Record<string, string[]> = {};
    sites.forEach((_, i) => Object.assign(allErrors, validateSiteAt(i)));
    if (Object.keys(allErrors).length > 0) {
      setErrors(allErrors);
      const firstSiteWithError = sites.findIndex((_, i) =>
        Object.keys(allErrors).some((k) => k.startsWith(`sites.${i}.`)),
      );
      if (firstSiteWithError >= 0) {
        setConfigureSiteIndex(firstSiteWithError);
        setStep(1);
      }
      focusFirstError(allErrors);
      return;
    }

    setSubmitting(true);
    setErrors({});

    const payload = sitesToSubmissionPayload(sites);
    const parsed = sizingSubmissionSchema.safeParse(payload);
    if (!parsed.success) {
      const flatErrors = parsed.error.flatten().fieldErrors as Record<
        string,
        string[]
      >;
      setErrors(flatErrors);
      window.scrollTo({ top: 0, behavior: "smooth" });
      setSubmitting(false);
      return;
    }

    const result = await submitSizingForm(slug, JSON.stringify(parsed.data));
    if (result?.error) {
      const flat: Record<string, string[]> = {};
      for (const [key, val] of Object.entries(result.error)) {
        if (val) flat[key] = val;
      }
      setErrors(flat);
      window.scrollTo({ top: 0, behavior: "smooth" });
      setSubmitting(false);
      return;
    }
    if (result?.success) {
      clearDraft(slug);
      router.push(`/r/${slug}/thanks`);
    }
  }

  const continueLabel =
    step === 1 && safeConfigureIndex < sites.length - 1
      ? `Continue to ${sites[safeConfigureIndex + 1]?.siteName || `site ${safeConfigureIndex + 2}`}`
      : step < STEP_LABELS.length - 1
        ? "Continue"
        : null;

  return (
    <>
      <AppHeader />
      <div className="flex-1 bg-[var(--sophos-grey-1)]">
        <div className="mx-auto w-full max-w-3xl space-y-6 px-4 py-8">
          <div className="space-y-2 text-center">
            <p className="text-xs font-medium tracking-[0.2em] text-[var(--sophos-grey-4)] uppercase">
              {sophosBrand.tagline}
            </p>
            <h1 className="font-heading text-3xl text-[var(--sophos-navy)]">
              Sophos Sizing Questionnaire
            </h1>
            <p className="text-sm text-[var(--sophos-gray)]">
              {label
                ? `Sizing request for ${label}`
                : "Firewall, switch, and wireless sizing across your sites"}
            </p>
            <a
              href="/guides/customer-guide.pdf"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block text-xs font-medium text-[var(--sophos-blue)] underline underline-offset-2 hover:text-[var(--sophos-navy)]"
            >
              Need help? Download the guide (PDF)
            </a>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>
                Step {step + 1} of {STEP_LABELS.length}: {STEP_LABELS[step]}
                {step === 1 && sites.length > 1
                  ? ` — Site ${safeConfigureIndex + 1} of ${sites.length}`
                  : ""}
              </span>
              <span>{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} />
            {(draftRestored || draftSavedAt) && (
              <p className="text-muted-foreground text-center text-xs">
                {draftRestored ? "Draft restored from this browser. " : ""}
                Progress is saved automatically
                {draftSavedAt
                  ? ` (last saved ${new Date(draftSavedAt).toLocaleString()})`
                  : ""}
                .
              </p>
            )}
          </div>

          {errors._form && (
            <Alert variant="destructive">
              <AlertDescription>{errors._form.join(", ")}</AlertDescription>
            </Alert>
          )}
          {errors.siteNames && (
            <Alert variant="destructive">
              <AlertDescription>{errors.siteNames.join(", ")}</AlertDescription>
            </Alert>
          )}

          <Card className="border-[var(--sophos-grey-2)] shadow-sm">
            <CardHeader>
              <CardTitle className="font-heading text-2xl font-light text-[var(--sophos-navy)]">
                {STEP_LABELS[step]}
                {step === 1 && activeSite
                  ? ` — ${activeSite.siteName || `Site ${safeConfigureIndex + 1}`}`
                  : ""}
              </CardTitle>
              <CardDescription>
                {step === 0 &&
                  "Add each location you need to size. You can configure firewall, switches, and wireless per site."}
                {step === 1 &&
                  (sites.length > 1
                    ? "Configure one site at a time. Continue to move to the next site."
                    : "Choose which products apply and complete the relevant questions.")}
                {step === 2 &&
                  "Review your answers for each site before submitting. Use Edit to go back and change a site."}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {step === 0 && (
                <div className="space-y-4">
                  {sites.map((site, index) => (
                    <div
                      key={index}
                      className="flex items-end gap-3 rounded-lg border p-4"
                    >
                      <div className="flex-1">
                        <LabelWithTooltip
                          htmlFor={`sites-${index}-siteName`}
                          label="Site / location name"
                          tooltip={SITE_FIELD_TOOLTIPS.siteName}
                        />
                        <Input
                          id={`sites-${index}-siteName`}
                          value={site.siteName}
                          onChange={(e) =>
                            updateSite(index, {
                              ...site,
                              siteName: e.target.value,
                            })
                          }
                          placeholder="e.g. London HQ"
                          className="mt-1.5"
                        />
                        {errors[`sites.${index}.siteName`] && (
                          <p className="text-destructive mt-1 text-xs">
                            {errors[`sites.${index}.siteName`].join(", ")}
                          </p>
                        )}
                      </div>
                      {sites.length > 1 && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => removeSite(index)}
                        >
                          Remove
                        </Button>
                      )}
                    </div>
                  ))}
                  <Button type="button" variant="outline" onClick={addSite}>
                    Add another site
                  </Button>
                </div>
              )}

              {step === 1 && activeSite && (
                <div className="space-y-4">
                  {sites.length > 1 && (
                    <div className="flex flex-wrap gap-2">
                      {sites.map((site, index) => (
                        <Button
                          key={index}
                          type="button"
                          size="sm"
                          variant={
                            index === safeConfigureIndex ? "default" : "outline"
                          }
                          onClick={() => {
                            if (
                              index !== safeConfigureIndex &&
                              !validateStep()
                            ) {
                              return;
                            }
                            setConfigureSiteIndex(index);
                            setErrors({});
                          }}
                        >
                          {site.siteName || `Site ${index + 1}`}
                        </Button>
                      ))}
                    </div>
                  )}

                  <div
                    id={`sites-${safeConfigureIndex}-products`}
                    className="grid gap-3 sm:grid-cols-3"
                  >
                    <ProductToggle
                      label="Firewall"
                      tooltip={PRODUCT_TOGGLE_TOOLTIPS.firewall}
                      checked={activeSite.enableFirewall}
                      onChange={(v) =>
                        updateSite(safeConfigureIndex, {
                          ...activeSite,
                          enableFirewall: v,
                        })
                      }
                    />
                    <ProductToggle
                      label="Switches"
                      tooltip={PRODUCT_TOGGLE_TOOLTIPS.switches}
                      checked={activeSite.enableSwitches}
                      onChange={(v) =>
                        updateSite(safeConfigureIndex, {
                          ...activeSite,
                          enableSwitches: v,
                        })
                      }
                    />
                    <ProductToggle
                      label="Wireless / APs"
                      tooltip={PRODUCT_TOGGLE_TOOLTIPS.wireless}
                      checked={activeSite.enableWireless}
                      onChange={(v) =>
                        updateSite(safeConfigureIndex, {
                          ...activeSite,
                          enableWireless: v,
                        })
                      }
                    />
                  </div>
                  {errors[`sites.${safeConfigureIndex}.products`] && (
                    <p className="text-destructive text-xs">
                      {errors[`sites.${safeConfigureIndex}.products`].join(
                        ", ",
                      )}
                    </p>
                  )}

                  {activeSite.enableFirewall && (
                    <div className="border-t pt-4">
                      <h4 className="mb-4 text-sm font-medium">Firewall</h4>
                      <FirewallSiteForm
                        value={activeSite.firewall}
                        onChange={(fw) =>
                          updateSite(safeConfigureIndex, {
                            ...activeSite,
                            firewall: fw,
                          })
                        }
                        idPrefix={`sites-${safeConfigureIndex}`}
                        errors={{
                          totalWanBandwidthMbps:
                            errors[
                              `sites.${safeConfigureIndex}.totalWanBandwidthMbps`
                            ],
                          averageWanConsumptionMbps:
                            errors[
                              `sites.${safeConfigureIndex}.averageWanConsumptionMbps`
                            ],
                          expectedPeakThroughputMbps:
                            errors[
                              `sites.${safeConfigureIndex}.expectedPeakThroughputMbps`
                            ],
                          ipsecTunnels:
                            errors[`sites.${safeConfigureIndex}.ipsecTunnels`],
                          sslVpnTunnels:
                            errors[`sites.${safeConfigureIndex}.sslVpnTunnels`],
                          peakVpnThroughputMbps:
                            errors[
                              `sites.${safeConfigureIndex}.peakVpnThroughputMbps`
                            ],
                          authUserCount:
                            errors[`sites.${safeConfigureIndex}.authUserCount`],
                          internalTrafficMbps:
                            errors[
                              `sites.${safeConfigureIndex}.internalTrafficMbps`
                            ],
                          sfpTransceiverCount:
                            errors[
                              `sites.${safeConfigureIndex}.sfpTransceiverCount`
                            ],
                        }}
                      />
                    </div>
                  )}

                  {activeSite.enableSwitches && (
                    <div className="border-t pt-4">
                      <h4 className="mb-4 text-sm font-medium">Switches</h4>
                      <SwitchSiteForm
                        value={activeSite.switches}
                        onChange={(sw) =>
                          updateSite(safeConfigureIndex, {
                            ...activeSite,
                            switches: sw,
                          })
                        }
                        idPrefix={`sites-${safeConfigureIndex}`}
                        errors={{
                          switchPortCount:
                            errors[
                              `sites.${safeConfigureIndex}.switchPortCount`
                            ],
                          poe30wDeviceCount:
                            errors[
                              `sites.${safeConfigureIndex}.poe30wDeviceCount`
                            ],
                        }}
                      />
                    </div>
                  )}

                  {activeSite.enableWireless && (
                    <div className="border-t pt-4">
                      <h4 className="mb-4 text-sm font-medium">
                        Wireless / access points
                      </h4>
                      <WirelessSiteForm
                        value={activeSite.wireless}
                        onChange={(w) =>
                          updateSite(safeConfigureIndex, {
                            ...activeSite,
                            wireless: w,
                          })
                        }
                        idPrefix={`sites-${safeConfigureIndex}`}
                        errors={{
                          facilityType:
                            errors[`sites.${safeConfigureIndex}.facilityType`],
                          ceilingHeight:
                            errors[`sites.${safeConfigureIndex}.ceilingHeight`],
                          numberOfFloors:
                            errors[
                              `sites.${safeConfigureIndex}.numberOfFloors`
                            ],
                          internalWallMaterial:
                            errors[
                              `sites.${safeConfigureIndex}.internalWallMaterial`
                            ],
                          externalWallMaterial:
                            errors[
                              `sites.${safeConfigureIndex}.externalWallMaterial`
                            ],
                          floorPlanNotes:
                            errors[
                              `sites.${safeConfigureIndex}.floorPlanNotes`
                            ],
                          totalUsers:
                            errors[`sites.${safeConfigureIndex}.totalUsers`],
                          usersPerAp:
                            errors[`sites.${safeConfigureIndex}.usersPerAp`],
                        }}
                      />
                    </div>
                  )}
                </div>
              )}

              {step === 2 && (
                <div className="space-y-4">
                  {sites.map((site, index) => {
                    const sections = siteReviewSections(site);
                    return (
                      <div
                        key={index}
                        className="space-y-4 rounded-lg border border-[var(--sophos-grey-2)] p-4"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-heading text-lg text-[var(--sophos-navy)]">
                              {site.siteName}
                            </p>
                            <p className="text-muted-foreground text-xs">
                              {[
                                site.enableFirewall && "Firewall",
                                site.enableSwitches && "Switches",
                                site.enableWireless && "Wireless",
                              ]
                                .filter(Boolean)
                                .join(" · ") || "No products selected"}
                            </p>
                          </div>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => editSite(index)}
                          >
                            Edit
                          </Button>
                        </div>
                        {sections.map((section) => (
                          <div key={section.title}>
                            <p className="text-muted-foreground mb-2 text-xs uppercase tracking-wide">
                              {section.title}
                            </p>
                            <dl className="grid gap-3 sm:grid-cols-2">
                              {section.rows.map((row) => (
                                <ReviewRow
                                  key={`${section.title}-${row.label}`}
                                  label={row.label}
                                  value={row.value}
                                />
                              ))}
                            </dl>
                          </div>
                        ))}
                      </div>
                    );
                  })}
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
                {continueLabel ? (
                  <Button type="button" onClick={nextStep}>
                    {continueLabel}
                  </Button>
                ) : (
                  <Button
                    type="button"
                    onClick={handleSubmit}
                    disabled={submitting}
                  >
                    {submitting ? "Submitting…" : "Submit"}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
