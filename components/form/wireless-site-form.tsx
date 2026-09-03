"use client";

import { useRef, useState } from "react";
import { upload } from "@vercel/blob/client";
import { Button } from "@/components/ui/button";
import { RadioGroup } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { FormField } from "@/components/form/form-field";
import { LabelWithTooltip } from "@/components/form/info-tooltip";
import { RadioOptionRow } from "@/components/form/radio-option-card";
import {
  WIRELESS_DESIGN_GOAL_TOOLTIPS,
  WIRELESS_FIELD_TOOLTIPS,
} from "@/lib/form-tooltips";
import type { WirelessFormState } from "@/lib/form/defaults";
import type { SitePlanFile, WirelessDesignGoal } from "@/lib/sizing/types";
import {
  AP6_MODEL_OPTIONS,
  WIRELESS_DESIGN_GOAL_LABELS,
} from "@/lib/validations";

const MAX_FILE_BYTES = 20 * 1024 * 1024;

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

async function uploadSitePlanFile(file: File): Promise<SitePlanFile> {
  try {
    const blob = await upload(`site-plans/${file.name}`, file, {
      access: "public",
      handleUploadUrl: "/api/blob/upload",
    });
    return {
      name: file.name,
      type: file.type || "application/octet-stream",
      url: blob.url,
    };
  } catch (err) {
    // No BLOB_READ_WRITE_TOKEN configured (e.g. local/demo) — fall back to
    // storing the file inline as a data URL so the flow still works end to end.
    console.warn("Vercel Blob upload failed, falling back to inline storage", err);
    return {
      name: file.name,
      type: file.type || "application/octet-stream",
      url: await readFileAsDataUrl(file),
    };
  }
}

interface WirelessSiteFormProps {
  value: WirelessFormState;
  onChange: (value: WirelessFormState) => void;
  errors?: Record<string, string[]>;
  idPrefix?: string;
}

export function WirelessSiteForm({
  value,
  onChange,
  errors = {},
  idPrefix = "ap",
}: WirelessSiteFormProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  function set<K extends keyof WirelessFormState>(
    key: K,
    val: WirelessFormState[K],
  ) {
    onChange({ ...value, [key]: val });
  }

  async function handleFilesSelected(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return;
    setUploadError(null);

    const files = Array.from(fileList);
    const oversized = files.filter((f) => f.size > MAX_FILE_BYTES);
    if (oversized.length > 0) {
      setUploadError(
        `File(s) too large (max 20MB each): ${oversized.map((f) => f.name).join(", ")}`,
      );
      return;
    }
    if ((value.sitePlanFiles?.length ?? 0) + files.length > 10) {
      setUploadError("You can attach up to 10 site plan files per location.");
      return;
    }

    setUploading(true);
    try {
      const uploaded = await Promise.all(files.map(uploadSitePlanFile));
      set("sitePlanFiles", [...(value.sitePlanFiles ?? []), ...uploaded]);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  function removeFile(index: number) {
    set(
      "sitePlanFiles",
      (value.sitePlanFiles ?? []).filter((_, i) => i !== index),
    );
  }

  return (
    <div className="space-y-4">
      <FormField
        id={`${idPrefix}-facilityType`}
        label="Type of facility *"
        tooltip={WIRELESS_FIELD_TOOLTIPS.facilityType}
        value={value.facilityType}
        onChange={(v) => set("facilityType", v)}
        errors={errors.facilityType}
        hint="e.g. Office, Stadium, Warehouse"
      />
      <FormField
        id={`${idPrefix}-ceilingHeight`}
        label="Ceiling height *"
        tooltip={WIRELESS_FIELD_TOOLTIPS.ceilingHeight}
        value={value.ceilingHeight}
        onChange={(v) => set("ceilingHeight", v)}
        errors={errors.ceilingHeight}
      />
      <FormField
        id={`${idPrefix}-numberOfFloors`}
        label="Number of floors *"
        tooltip={WIRELESS_FIELD_TOOLTIPS.numberOfFloors}
        type="number"
        value={value.numberOfFloors}
        onChange={(v) => set("numberOfFloors", v)}
        errors={errors.numberOfFloors}
      />
      <FormField
        id={`${idPrefix}-internalWallMaterial`}
        label="Internal wall material *"
        tooltip={WIRELESS_FIELD_TOOLTIPS.internalWallMaterial}
        value={value.internalWallMaterial}
        onChange={(v) => set("internalWallMaterial", v)}
        errors={errors.internalWallMaterial}
      />
      <FormField
        id={`${idPrefix}-externalWallMaterial`}
        label="External wall material *"
        tooltip={WIRELESS_FIELD_TOOLTIPS.externalWallMaterial}
        value={value.externalWallMaterial}
        onChange={(v) => set("externalWallMaterial", v)}
        errors={errors.externalWallMaterial}
      />

      <div>
        <LabelWithTooltip
          htmlFor={`${idPrefix}-floorPlanNotes`}
          label="Floor plan notes / approx area (ft/m)"
          tooltip={WIRELESS_FIELD_TOOLTIPS.floorPlanNotes}
        />
        <Textarea
          id={`${idPrefix}-floorPlanNotes`}
          className="mt-1.5 min-h-24"
          value={value.floorPlanNotes}
          onChange={(e) => set("floorPlanNotes", e.target.value)}
          placeholder="Describe floor plan coverage and dimensions, or upload the floor plan file(s) below."
        />
        {errors.floorPlanNotes && (
          <p className="text-destructive mt-1 text-xs">
            {errors.floorPlanNotes.join(", ")}
          </p>
        )}
        <p className="text-muted-foreground mt-1 text-xs">
          Provide notes and/or upload at least one site plan file.
        </p>
      </div>

      <div>
        <LabelWithTooltip
          htmlFor={`${idPrefix}-siteplan-upload`}
          label="Upload site plan(s)"
          tooltip={WIRELESS_FIELD_TOOLTIPS.sitePlanFiles}
        />
        <input
          ref={fileInputRef}
          id={`${idPrefix}-siteplan-upload`}
          type="file"
          multiple
          disabled={uploading}
          accept="image/*,.pdf,.dwg,.vsdx"
          onChange={(e) => handleFilesSelected(e.target.files)}
          className="border-input mt-1.5 block w-full cursor-pointer rounded-md border text-sm file:mr-4 file:cursor-pointer file:rounded-md file:border-0 file:bg-[var(--sophos-blue)] file:px-3 file:py-2 file:text-sm file:font-medium file:text-white disabled:cursor-not-allowed disabled:opacity-60"
        />
        <p className="text-muted-foreground mt-1 text-xs">
          Attach floor plans or site drawings (image, PDF, or CAD file). Max
          20MB per file, up to 10 files.
        </p>
        {uploading && (
          <p className="mt-1 text-xs text-[var(--sophos-blue)]">Uploading…</p>
        )}
        {uploadError && (
          <p className="text-destructive mt-1 text-xs">{uploadError}</p>
        )}
        {(value.sitePlanFiles?.length ?? 0) > 0 && (
          <ul className="mt-2 space-y-1">
            {(value.sitePlanFiles ?? []).map((file, index) => (
              <li
                key={`${file.name}-${index}`}
                className="flex items-center justify-between rounded-md border px-3 py-1.5 text-sm"
              >
                <span className="truncate">{file.name}</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => removeFile(index)}
                >
                  Remove
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField
          id={`${idPrefix}-totalUsers`}
          label="Number of users total *"
          tooltip={WIRELESS_FIELD_TOOLTIPS.totalUsers}
          type="number"
          value={value.totalUsers}
          onChange={(v) => set("totalUsers", v)}
          errors={errors.totalUsers}
        />
        <FormField
          id={`${idPrefix}-usersPerAp`}
          label="Number of users per AP *"
          tooltip={WIRELESS_FIELD_TOOLTIPS.usersPerAp}
          type="number"
          value={value.usersPerAp}
          onChange={(v) => set("usersPerAp", v)}
          errors={errors.usersPerAp}
        />
      </div>

      <div className="space-y-3">
        <LabelWithTooltip
          label="Is the Wi-Fi network designed for capacity or coverage? *"
          tooltip="Choose the design priority for this site's wireless survey."
        />
        <RadioGroup
          value={value.designGoal}
          onValueChange={(v) => set("designGoal", v as WirelessDesignGoal)}
          className="space-y-3"
        >
          {(
            Object.entries(WIRELESS_DESIGN_GOAL_LABELS) as [
              WirelessDesignGoal,
              string,
            ][]
          ).map(([goal, labelText]) => (
            <RadioOptionRow
              key={goal}
              value={goal}
              id={`${idPrefix}-${goal}`}
              label={labelText}
              tooltip={WIRELESS_DESIGN_GOAL_TOOLTIPS[goal]}
            />
          ))}
        </RadioGroup>
      </div>

      <FormField
        id={`${idPrefix}-low-signal`}
        label="Areas where low signal strength is acceptable"
        tooltip={WIRELESS_FIELD_TOOLTIPS.lowSignalAcceptableAreas}
        value={value.lowSignalAcceptableAreas}
        onChange={(v) => set("lowSignalAcceptableAreas", v)}
        hint="e.g. Toilet, Garden, Prayer Room"
      />
      <FormField
        id={`${idPrefix}-high-bw`}
        label="Areas requiring highest bandwidth"
        tooltip={WIRELESS_FIELD_TOOLTIPS.highBandwidthAreas}
        value={value.highBandwidthAreas}
        onChange={(v) => set("highBandwidthAreas", v)}
        hint="e.g. Classroom, office area"
      />
      <FormField
        id={`${idPrefix}-devices`}
        label="Devices per user utilizing bandwidth"
        tooltip={WIRELESS_FIELD_TOOLTIPS.devicesPerUser}
        value={value.devicesPerUser}
        onChange={(v) => set("devicesPerUser", v)}
        hint="Laptops, phones, etc."
      />
      <div>
        <LabelWithTooltip
          htmlFor={`${idPrefix}-suggestedApModels`}
          label="Preferred AP6 model"
          tooltip={WIRELESS_FIELD_TOOLTIPS.suggestedApModels}
        />
        <select
          id={`${idPrefix}-suggestedApModels`}
          className="border-input mt-1.5 flex h-8 w-full rounded-lg border bg-transparent px-2.5 text-sm"
          value={value.suggestedApModels}
          onChange={(e) => set("suggestedApModels", e.target.value)}
        >
          {AP6_MODEL_OPTIONS.map((opt) => (
            <option key={opt.value || "none"} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>
      <FormField
        id={`${idPrefix}-unavail-ch`}
        label="Unavailable / saturated channels"
        tooltip={WIRELESS_FIELD_TOOLTIPS.unavailableChannels}
        value={value.unavailableChannels}
        onChange={(v) => set("unavailableChannels", v)}
      />
      <FormField
        id={`${idPrefix}-restricted-ch`}
        label="Restricted channels or frequencies"
        tooltip={WIRELESS_FIELD_TOOLTIPS.restrictedChannels}
        value={value.restrictedChannels}
        onChange={(v) => set("restrictedChannels", v)}
      />
    </div>
  );
}
