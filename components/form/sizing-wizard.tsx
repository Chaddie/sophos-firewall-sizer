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
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { submitSizingForm } from "@/lib/actions";
import { AppHeader } from "@/components/brand/app-header";
import { FirewallSiteForm } from "@/components/form/firewall-site-form";
import { SwitchSiteForm } from "@/components/form/switch-site-form";
import { WirelessSiteForm } from "@/components/form/wireless-site-form";
import {
  FormField,
  ProductToggle,
} from "@/components/form/form-field";
import { LabelWithTooltip } from "@/components/form/info-tooltip";
import { sophosBrand } from "@/lib/brand";
import {
  defaultSiteState,
  sitesToSubmissionPayload,
  type ContactFormState,
  type SiteFormState,
} from "@/lib/form/defaults";
import {
  CONTACT_FIELD_TOOLTIPS,
  PRODUCT_TOGGLE_TOOLTIPS,
  SITE_FIELD_TOOLTIPS,
} from "@/lib/form-tooltips";
import { sizingSubmissionSchema } from "@/lib/validations";

const STEP_LABELS = ["Sites", "Configure", "Contact", "Review"] as const;

interface SizingWizardProps {
  slug: string;
  label?: string | null;
}

export function SizingWizard({ slug, label }: SizingWizardProps) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [sites, setSites] = useState<SiteFormState[]>([defaultSiteState("")]);
  const [contact, setContact] = useState<ContactFormState>({
    customerName: "",
    customerEmail: "",
  });
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [submitting, setSubmitting] = useState(false);

  const progress = ((step + 1) / STEP_LABELS.length) * 100;

  function updateSite(index: number, site: SiteFormState) {
    setSites((prev) => prev.map((s, i) => (i === index ? site : s)));
  }

  function addSite() {
    setSites((prev) => [...prev, defaultSiteState("")]);
  }

  function removeSite(index: number) {
    if (sites.length <= 1) return;
    setSites((prev) => prev.filter((_, i) => i !== index));
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
      sites.forEach((site, i) => {
        if (
          !site.enableFirewall &&
          !site.enableSwitches &&
          !site.enableWireless
        ) {
          stepErrors[`sites.${i}.products`] = [
            "Select at least one product",
          ];
        }
        if (site.enableFirewall) {
          const fw = site.firewall;
          if (!fw.totalWanBandwidthMbps)
            stepErrors[`sites.${i}.totalWanBandwidthMbps`] = ["Required"];
          if (!fw.averageWanConsumptionMbps)
            stepErrors[`sites.${i}.averageWanConsumptionMbps`] = ["Required"];
          if (!fw.expectedPeakThroughputMbps)
            stepErrors[`sites.${i}.expectedPeakThroughputMbps`] = ["Required"];
          if (fw.vpnType !== "none") {
            if (
              (fw.vpnType === "ipsec" || fw.vpnType === "both") &&
              !fw.ipsecTunnels
            ) {
              stepErrors[`sites.${i}.ipsecTunnels`] = ["Required"];
            }
            if (
              (fw.vpnType === "ssl" || fw.vpnType === "both") &&
              !fw.sslVpnTunnels
            ) {
              stepErrors[`sites.${i}.sslVpnTunnels`] = ["Required"];
            }
            if (!fw.peakVpnThroughputMbps) {
              stepErrors[`sites.${i}.peakVpnThroughputMbps`] = ["Required"];
            }
          }
          if (fw.userAuthEnabled && !fw.authUserCount) {
            stepErrors[`sites.${i}.authUserCount`] = ["Required"];
          }
          if (fw.internalTrafficEnabled && !fw.internalTrafficMbps) {
            stepErrors[`sites.${i}.internalTrafficMbps`] = ["Required"];
          }
        }
        if (site.enableSwitches && !site.switches.switchPortCount) {
          stepErrors[`sites.${i}.switchPortCount`] = ["Required"];
        }
        if (site.enableWireless) {
          const w = site.wireless;
          if (!w.facilityType)
            stepErrors[`sites.${i}.facilityType`] = ["Required"];
          if (!w.ceilingHeight)
            stepErrors[`sites.${i}.ceilingHeight`] = ["Required"];
          if (!w.internalWallMaterial)
            stepErrors[`sites.${i}.internalWallMaterial`] = ["Required"];
          if (!w.externalWallMaterial)
            stepErrors[`sites.${i}.externalWallMaterial`] = ["Required"];
          if (!w.floorPlanNotes)
            stepErrors[`sites.${i}.floorPlanNotes`] = ["Required"];
          if (!w.totalUsers) stepErrors[`sites.${i}.totalUsers`] = ["Required"];
          if (!w.usersPerAp) stepErrors[`sites.${i}.usersPerAp`] = ["Required"];
        }
      });
    }

    setErrors(stepErrors);
    return Object.keys(stepErrors).length === 0;
  }

  function nextStep() {
    if (!validateStep()) return;
    setStep((s) => Math.min(s + 1, STEP_LABELS.length - 1));
  }

  function prevStep() {
    setStep((s) => Math.max(s - 1, 0));
  }

  async function handleSubmit() {
    if (!validateStep()) return;
    setSubmitting(true);
    setErrors({});

    const payload = sitesToSubmissionPayload(sites, contact);
    const parsed = sizingSubmissionSchema.safeParse(payload);
    if (!parsed.success) {
      setErrors(parsed.error.flatten().fieldErrors as Record<string, string[]>);
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
      setSubmitting(false);
      return;
    }
    if (result?.success) {
      router.push(`/r/${slug}/thanks`);
    }
  }

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
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>
                Step {step + 1} of {STEP_LABELS.length}: {STEP_LABELS[step]}
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
          {errors.siteNames && (
            <Alert variant="destructive">
              <AlertDescription>{errors.siteNames.join(", ")}</AlertDescription>
            </Alert>
          )}

          <Card className="border-[var(--sophos-grey-2)] shadow-sm">
            <CardHeader>
              <CardTitle className="font-heading text-2xl font-light text-[var(--sophos-navy)]">
                {STEP_LABELS[step]}
              </CardTitle>
              <CardDescription>
                {step === 0 &&
                  "Add each location you need to size. You can configure firewall, switches, and wireless per site."}
                {step === 1 &&
                  "For each site, choose which products apply and complete the relevant questions."}
                {step === 2 &&
                  "Optional contact details for your Sophos Account Management team."}
                {step === 3 &&
                  "Review your answers before submitting."}
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
                          htmlFor={`site-name-${index}`}
                          label="Site / location name"
                          tooltip={SITE_FIELD_TOOLTIPS.siteName}
                        />
                        <Input
                          id={`site-name-${index}`}
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

              {step === 1 && (
                <div className="space-y-8">
                  {sites.map((site, index) => (
                    <div
                      key={index}
                      className="space-y-4 rounded-xl border border-[var(--sophos-grey-2)] p-4"
                    >
                      <h3 className="font-heading text-lg text-[var(--sophos-navy)]">
                        {site.siteName || `Site ${index + 1}`}
                      </h3>

                      <div className="grid gap-3 sm:grid-cols-3">
                        <ProductToggle
                          label="Firewall"
                          tooltip={PRODUCT_TOGGLE_TOOLTIPS.firewall}
                          checked={site.enableFirewall}
                          onChange={(v) =>
                            updateSite(index, {
                              ...site,
                              enableFirewall: v,
                            })
                          }
                        />
                        <ProductToggle
                          label="Switches"
                          tooltip={PRODUCT_TOGGLE_TOOLTIPS.switches}
                          checked={site.enableSwitches}
                          onChange={(v) =>
                            updateSite(index, {
                              ...site,
                              enableSwitches: v,
                            })
                          }
                        />
                        <ProductToggle
                          label="Wireless / APs"
                          tooltip={PRODUCT_TOGGLE_TOOLTIPS.wireless}
                          checked={site.enableWireless}
                          onChange={(v) =>
                            updateSite(index, {
                              ...site,
                              enableWireless: v,
                            })
                          }
                        />
                      </div>
                      {errors[`sites.${index}.products`] && (
                        <p className="text-destructive text-xs">
                          {errors[`sites.${index}.products`].join(", ")}
                        </p>
                      )}

                      {site.enableFirewall && (
                        <div className="border-t pt-4">
                          <h4 className="mb-4 text-sm font-medium">Firewall</h4>
                          <FirewallSiteForm
                            value={site.firewall}
                            onChange={(fw) =>
                              updateSite(index, { ...site, firewall: fw })
                            }
                            idPrefix={`site-${index}-fw`}
                            errors={{
                              totalWanBandwidthMbps:
                                errors[`sites.${index}.totalWanBandwidthMbps`],
                              averageWanConsumptionMbps:
                                errors[
                                  `sites.${index}.averageWanConsumptionMbps`
                                ],
                              expectedPeakThroughputMbps:
                                errors[
                                  `sites.${index}.expectedPeakThroughputMbps`
                                ],
                              ipsecTunnels:
                                errors[`sites.${index}.ipsecTunnels`],
                              sslVpnTunnels:
                                errors[`sites.${index}.sslVpnTunnels`],
                              peakVpnThroughputMbps:
                                errors[`sites.${index}.peakVpnThroughputMbps`],
                              authUserCount:
                                errors[`sites.${index}.authUserCount`],
                              internalTrafficMbps:
                                errors[`sites.${index}.internalTrafficMbps`],
                            }}
                          />
                        </div>
                      )}

                      {site.enableSwitches && (
                        <div className="border-t pt-4">
                          <h4 className="mb-4 text-sm font-medium">Switches</h4>
                          <SwitchSiteForm
                            value={site.switches}
                            onChange={(sw) =>
                              updateSite(index, { ...site, switches: sw })
                            }
                            idPrefix={`site-${index}-sw`}
                            errors={{
                              switchPortCount:
                                errors[`sites.${index}.switchPortCount`],
                              poe30wDeviceCount:
                                errors[`sites.${index}.poe30wDeviceCount`],
                            }}
                          />
                        </div>
                      )}

                      {site.enableWireless && (
                        <div className="border-t pt-4">
                          <h4 className="mb-4 text-sm font-medium">
                            Wireless / access points
                          </h4>
                          <WirelessSiteForm
                            value={site.wireless}
                            onChange={(w) =>
                              updateSite(index, { ...site, wireless: w })
                            }
                            idPrefix={`site-${index}-ap`}
                            errors={{
                              facilityType:
                                errors[`sites.${index}.facilityType`],
                              ceilingHeight:
                                errors[`sites.${index}.ceilingHeight`],
                              internalWallMaterial:
                                errors[`sites.${index}.internalWallMaterial`],
                              externalWallMaterial:
                                errors[`sites.${index}.externalWallMaterial`],
                              floorPlanNotes:
                                errors[`sites.${index}.floorPlanNotes`],
                              totalUsers: errors[`sites.${index}.totalUsers`],
                              usersPerAp: errors[`sites.${index}.usersPerAp`],
                            }}
                          />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {step === 2 && (
                <div className="grid gap-4">
                  <FormField
                    id="customerName"
                    label="Your name (optional)"
                    tooltip={CONTACT_FIELD_TOOLTIPS.customerName}
                    value={contact.customerName}
                    onChange={(v) =>
                      setContact((c) => ({ ...c, customerName: v }))
                    }
                  />
                  <FormField
                    id="customerEmail"
                    label="Your email (optional)"
                    tooltip={CONTACT_FIELD_TOOLTIPS.customerEmail}
                    type="email"
                    value={contact.customerEmail}
                    onChange={(v) =>
                      setContact((c) => ({ ...c, customerEmail: v }))
                    }
                    errors={errors.customerEmail}
                  />
                </div>
              )}

              {step === 3 && (
                <div className="space-y-4 text-sm">
                  {sites.map((site, index) => (
                    <div
                      key={index}
                      className="rounded-lg border p-4"
                    >
                      <p className="font-medium">{site.siteName}</p>
                      <ul className="text-muted-foreground mt-2 list-inside list-disc">
                        {site.enableFirewall && <li>Firewall sizing</li>}
                        {site.enableSwitches && <li>Switch sizing</li>}
                        {site.enableWireless && (
                          <li>Wireless intake (presales handoff)</li>
                        )}
                      </ul>
                    </div>
                  ))}
                  {(contact.customerName || contact.customerEmail) && (
                    <p className="text-muted-foreground">
                      Contact: {contact.customerName}{" "}
                      {contact.customerEmail && `<${contact.customerEmail}>`}
                    </p>
                  )}
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
                {step < STEP_LABELS.length - 1 ? (
                  <Button type="button" onClick={nextStep}>
                    Continue
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
