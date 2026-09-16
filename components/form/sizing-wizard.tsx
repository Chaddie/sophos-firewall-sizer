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
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { submitSizingForm } from "@/lib/actions";
import {
  clearSizingDraftAction,
  loadSizingDraftAction,
  saveSizingDraftAction,
} from "@/lib/draft-actions";
import { applySeCorrectionAction } from "@/lib/request-actions";
import { submitInternalSizingAction } from "@/lib/internal-sizing-actions";
import { AppHeader } from "@/components/brand/app-header";
import { FirewallSiteForm } from "@/components/form/firewall-site-form";
import { SwitchSiteForm } from "@/components/form/switch-site-form";
import { WirelessSiteForm } from "@/components/form/wireless-site-form";
import { ProductToggle } from "@/components/form/form-field";
import { LabelWithTooltip } from "@/components/form/info-tooltip";
import { sophosBrand } from "@/lib/brand";
import {
  defaultSiteState,
  normalizeSiteFormState,
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
  /** Prefill sites (SE correction / restored server draft). */
  initialSites?: SiteFormState[];
  /** Prefill customer free-form notes (SE correction). */
  initialAdditionalNotes?: string;
  /**
   * When set, submit goes through SE correction instead of public submit.
   */
  correctionRequestId?: string;
  /**
   * When set, submit saves an internal SE size (no customer /r/ thanks page).
   */
  internalRequestId?: string;
}

interface DraftPayload {
  version: number;
  step: number;
  configureSiteIndex: number;
  sites: SiteFormState[];
  additionalNotes?: string;
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
            (w.sitePlanFiles?.length ?? 0) > 0
              ? w.sitePlanFiles!.map((f) => f.name).join(", ")
              : "None uploaded",
        },
      ],
    });
  }

  return sections;
}

export function SizingWizard({
  slug,
  label,
  initialSites,
  initialAdditionalNotes,
  correctionRequestId,
  internalRequestId,
}: SizingWizardProps) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [configureSiteIndex, setConfigureSiteIndex] = useState(0);
  const [sites, setSites] = useState<SiteFormState[]>(
    initialSites && initialSites.length > 0
      ? initialSites.map(normalizeSiteFormState)
      : [defaultSiteState("")],
  );
  const [additionalNotes, setAdditionalNotes] = useState(
    initialAdditionalNotes ?? "",
  );
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [submitting, setSubmitting] = useState(false);
  const [draftRestored, setDraftRestored] = useState(false);
  const [draftSavedAt, setDraftSavedAt] = useState<string | null>(null);
  const [correctionNote, setCorrectionNote] = useState("");
  const hydrated = useRef(false);
  const isCorrection = Boolean(correctionRequestId);
  const isInternal = Boolean(internalRequestId);
  const skipPublicDraft = isCorrection || isInternal;

  useEffect(() => {
    if (skipPublicDraft) {
      hydrated.current = true;
      return;
    }

    let cancelled = false;

    async function hydrate() {
      const local = loadDraft(slug);
      let server: Awaited<ReturnType<typeof loadSizingDraftAction>> = null;
      try {
        server = await loadSizingDraftAction(slug);
      } catch {
        server = null;
      }
      if (cancelled) return;

      const serverRaw = server?.draftJson as Record<string, unknown> | undefined;
      const serverPayload =
        serverRaw &&
        typeof serverRaw === "object" &&
        Array.isArray(serverRaw.sites)
          ? (serverRaw as unknown as DraftPayload)
          : null;

      const localTime = local?.updatedAt
        ? Date.parse(local.updatedAt)
        : 0;
      const serverTime = server?.updatedAt
        ? new Date(server.updatedAt).getTime()
        : 0;

      const chosen =
        serverPayload && serverTime >= localTime
          ? serverPayload
          : local && local.sites.length > 0
            ? local
            : serverPayload;

      if (chosen && chosen.sites.length > 0) {
        setSites(chosen.sites.map(normalizeSiteFormState));
        setAdditionalNotes(chosen.additionalNotes ?? "");
        setStep(Math.min(Math.max(chosen.step ?? 0, 0), STEP_LABELS.length - 1));
        setConfigureSiteIndex(
          Math.min(
            Math.max(chosen.configureSiteIndex ?? 0, 0),
            Math.max(chosen.sites.length - 1, 0),
          ),
        );
        setDraftRestored(true);
        setDraftSavedAt(
          chosen.updatedAt ??
            (server?.updatedAt
              ? new Date(server.updatedAt).toISOString()
              : null),
        );
      }
      hydrated.current = true;
    }

    void hydrate();
    return () => {
      cancelled = true;
    };
  }, [slug, skipPublicDraft]);

  useEffect(() => {
    if (!hydrated.current || skipPublicDraft) return;
    const handle = window.setTimeout(() => {
      const payload = { step, configureSiteIndex, sites, additionalNotes };
      saveDraft(slug, payload);
      setDraftSavedAt(new Date().toISOString());
      void saveSizingDraftAction(slug, {
        version: DRAFT_VERSION,
        ...payload,
        updatedAt: new Date().toISOString(),
      });
    }, 600);
    return () => window.clearTimeout(handle);
  }, [slug, step, configureSiteIndex, sites, additionalNotes, skipPublicDraft]);

  const safeConfigureIndex = Math.min(
    configureSiteIndex,
    Math.max(sites.length - 1, 0),
  );
  const activeSite = sites[safeConfigureIndex] ?? sites[0];

  const configureProductLabel = (() => {
    if (!activeSite) return null;
    const parts: string[] = [];
    if (activeSite.enableFirewall) parts.push("Firewall");
    if (activeSite.enableSwitches) parts.push("Switch");
    if (activeSite.enableWireless) parts.push("Wireless");
    return parts.length > 0 ? parts.join(" · ") : null;
  })();

  const progress = (() => {
    if (step === 0) return 12;
    if (step === 2) return 100;
    const siteCount = Math.max(sites.length, 1);
    return 12 + ((safeConfigureIndex + 1) / siteCount) * 76;
  })();

  const progressLabel = (() => {
    if (step === 0) return `Step 1 of ${STEP_LABELS.length}: Sites`;
    if (step === 2) return `Step 3 of ${STEP_LABELS.length}: Review`;
    const sitePart = `Site ${safeConfigureIndex + 1} of ${sites.length}`;
    return configureProductLabel
      ? `${sitePart} · ${configureProductLabel}`
      : `${sitePart} · Configure`;
  })();

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
      if (!w.numberOfFloors || Number(w.numberOfFloors) < 1)
        stepErrors[`sites.${index}.numberOfFloors`] = ["Required"];
      if (!w.internalWallMaterial)
        stepErrors[`sites.${index}.internalWallMaterial`] = ["Required"];
      if (!w.externalWallMaterial)
        stepErrors[`sites.${index}.externalWallMaterial`] = ["Required"];
      const hasNotes = Boolean(w.floorPlanNotes?.trim());
      const hasFiles = (w.sitePlanFiles?.length ?? 0) > 0;
      if (!hasNotes && !hasFiles) {
        stepErrors[`sites.${index}.floorPlanNotes`] = [
          "Add floor plan notes or upload a site plan file",
        ];
      }
      if (!w.totalUsers || Number(w.totalUsers) < 1)
        stepErrors[`sites.${index}.totalUsers`] = ["Required"];
      if (!w.usersPerAp || Number(w.usersPerAp) < 1)
        stepErrors[`sites.${index}.usersPerAp`] = ["Required"];
      if (w.designGoal !== "capacity" && w.designGoal !== "coverage") {
        stepErrors[`sites.${index}.designGoal`] = ["Required"];
      }
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

    try {
      const payload = sitesToSubmissionPayload(sites, { additionalNotes });
      const parsed = sizingSubmissionSchema.safeParse(payload);
      if (!parsed.success) {
        const flatErrors: Record<string, string[]> = {};
        for (const issue of parsed.error.issues) {
          // Prefer dotted site field keys the configure step understands
          // (e.g. sites.0.facilityType), not zod flatten's opaque "sites".
          const path = issue.path;
          let key = "_form";
          if (path[0] === "sites" && typeof path[1] === "number") {
            const siteIndex = path[1];
            const leaf = path[path.length - 1];
            if (typeof leaf === "string" && leaf !== "sites") {
              key = `sites.${siteIndex}.${leaf}`;
            } else {
              key = `sites.${siteIndex}.products`;
            }
          } else if (path.length > 0) {
            key = path.map(String).join(".");
          }
          flatErrors[key] = [...(flatErrors[key] ?? []), issue.message];
        }
        if (!flatErrors._form) {
          flatErrors._form = [
            "Please fix the highlighted fields before submitting.",
          ];
        }
        setErrors(flatErrors);
        const firstSiteWithError = sites.findIndex((_, i) =>
          Object.keys(flatErrors).some((k) => k.startsWith(`sites.${i}.`)),
        );
        if (firstSiteWithError >= 0) {
          setConfigureSiteIndex(firstSiteWithError);
          setStep(1);
          focusFirstError(flatErrors);
        } else {
          window.scrollTo({ top: 0, behavior: "smooth" });
        }
        setSubmitting(false);
        return;
      }

      if (isCorrection && correctionRequestId) {
        const result = await applySeCorrectionAction(
          correctionRequestId,
          JSON.stringify(parsed.data),
          correctionNote.trim() || undefined,
        );
        if (!result.ok) {
          setErrors({ _form: [result.error] });
          window.scrollTo({ top: 0, behavior: "smooth" });
          setSubmitting(false);
          return;
        }
        router.push(`/dashboard/${correctionRequestId}`);
        router.refresh();
        return;
      }

      if (isInternal && internalRequestId) {
        const result = await submitInternalSizingAction(
          internalRequestId,
          JSON.stringify(parsed.data),
        );
        if (!result.ok) {
          setErrors({ _form: [result.error] });
          window.scrollTo({ top: 0, behavior: "smooth" });
          setSubmitting(false);
          return;
        }
        router.push(`/dashboard/${internalRequestId}`);
        router.refresh();
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
        void clearSizingDraftAction(slug);
        router.push(`/r/${slug}/thanks`);
        return;
      }
      setErrors({
        _form: ["Submission did not complete. Please try again."],
      });
      setSubmitting(false);
    } catch (err) {
      const message =
        err instanceof Error && /Body exceeded|too large|413/i.test(err.message)
          ? "Submission is too large — try removing large site plan uploads or use smaller files."
          : "Something went wrong while submitting. Please try again.";
      setErrors({ _form: [message] });
      window.scrollTo({ top: 0, behavior: "smooth" });
      setSubmitting(false);
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
              {isCorrection
                ? "SE answer correction"
                : isInternal
                  ? "Internal hardware sizing"
                  : "Sophos Sizing Questionnaire"}
            </h1>
            <p className="text-sm text-[var(--sophos-gray)]">
              {isCorrection
                ? label
                  ? `Correct answers for ${label} — prior version is archived`
                  : "Correct customer answers and recalculate the BOM"
                : isInternal
                  ? label
                    ? `Internal size for ${label} — no customer link`
                    : "Size hardware without sending a customer link"
                  : label
                    ? `Sizing request for ${label}`
                    : "Firewall, switch, and wireless sizing across your sites"}
            </p>
            {!isInternal && !isCorrection && (
              <a
                href="/guides/customer-guide.pdf"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block text-xs font-medium text-[var(--sophos-blue)] underline underline-offset-2 hover:text-[var(--sophos-navy)]"
              >
                Need help? Download the guide (PDF)
              </a>
            )}
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{progressLabel}</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} />
            {step < 2 && !isCorrection && !isInternal && (
              <Alert className="border-[var(--sophos-grey-2)] bg-white/80">
                <AlertDescription className="text-xs text-[var(--sophos-navy)]">
                  Your account team will review recommendations after you
                  submit — you will not see model names or a bill of materials
                  here.
                </AlertDescription>
              </Alert>
            )}
            {step < 2 && isInternal && (
              <Alert className="border-[var(--sophos-grey-2)] bg-white/80">
                <AlertDescription className="text-xs text-[var(--sophos-navy)]">
                  Internal size — results stay private to Sales Engineers until
                  you share the request with the account team.
                </AlertDescription>
              </Alert>
            )}
            {(draftRestored || draftSavedAt) && !skipPublicDraft && (
              <p className="text-muted-foreground text-center text-xs">
                {draftRestored
                  ? "Draft restored — you can continue where you left off. "
                  : ""}
                Progress saves automatically on this device and on the server
                {draftSavedAt
                  ? ` (last saved ${new Date(draftSavedAt).toLocaleString()})`
                  : ""}
                . You can close this tab and resume later on this or another
                device using the same link.
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

                  <div className="space-y-2 rounded-lg border border-[var(--sophos-grey-2)] p-4">
                    <LabelWithTooltip
                      htmlFor="additionalNotes"
                      label="Additional notes (optional)"
                      tooltip="Anything else you want your Sophos account team to know — constraints, timelines, special requirements, or context not covered above."
                    />
                    <Textarea
                      id="additionalNotes"
                      value={additionalNotes}
                      onChange={(e) => setAdditionalNotes(e.target.value)}
                      placeholder="Share any extra context for your account team…"
                      rows={4}
                      maxLength={5000}
                      aria-invalid={Boolean(errors.additionalNotes)}
                    />
                    {errors.additionalNotes?.[0] && (
                      <p className="text-destructive text-xs">
                        {errors.additionalNotes[0]}
                      </p>
                    )}
                    <p className="text-muted-foreground text-xs">
                      {additionalNotes.length}/5000
                    </p>
                  </div>
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
                  <div className="flex flex-col items-end gap-2">
                    {isCorrection && (
                      <Input
                        value={correctionNote}
                        onChange={(e) => setCorrectionNote(e.target.value)}
                        placeholder="Correction note (optional)"
                        className="w-72"
                      />
                    )}
                    <Button
                      type="button"
                      onClick={handleSubmit}
                      disabled={submitting}
                    >
                      {submitting
                        ? isCorrection
                          ? "Applying…"
                          : isInternal
                            ? "Saving…"
                            : "Submitting…"
                        : isCorrection
                          ? "Apply correction"
                          : isInternal
                            ? "Save internal size"
                            : "Submit"}
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
