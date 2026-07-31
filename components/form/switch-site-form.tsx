"use client";

import type { SwitchFormState } from "@/lib/form/defaults";
import { FormField, YesNoField } from "@/components/form/form-field";
import { SWITCH_FIELD_TOOLTIPS } from "@/lib/form-tooltips";

interface SwitchSiteFormProps {
  value: SwitchFormState;
  onChange: (value: SwitchFormState) => void;
  errors?: Record<string, string[]>;
  idPrefix?: string;
}

export function SwitchSiteForm({
  value,
  onChange,
  errors = {},
  idPrefix = "sw",
}: SwitchSiteFormProps) {
  function set<K extends keyof SwitchFormState>(
    key: K,
    val: SwitchFormState[K],
  ) {
    onChange({ ...value, [key]: val });
  }

  return (
    <div className="space-y-4">
      <p className="text-muted-foreground text-sm">
        Answer the questions below to size Sophos Switch(es) for this location.
        Recommendations are based on the Sophos Switch 200 and 1000 series
        specifications.
      </p>

      <FormField
        id={`${idPrefix}-switchPortCount`}
        label="How many switch ports are needed at this location?"
        tooltip={SWITCH_FIELD_TOOLTIPS.switchPortCount}
        type="number"
        value={value.switchPortCount}
        onChange={(v) => set("switchPortCount", v)}
        errors={errors.switchPortCount}
      />

      <YesNoField
        label="Do any connected devices need 2.5GbE ports?"
        tooltip={SWITCH_FIELD_TOOLTIPS.needs2_5GbE}
        value={value.needs2_5GbE}
        onChange={(v) => set("needs2_5GbE", v)}
      />
      <YesNoField
        label="Do any connected devices require 10GbE ports?"
        tooltip={SWITCH_FIELD_TOOLTIPS.needs10GbE}
        value={value.needs10GbE}
        onChange={(v) => set("needs10GbE", v)}
      />
      <YesNoField
        label="Do you require a 10Gb fiber (SFP+) uplink port?"
        tooltip={SWITCH_FIELD_TOOLTIPS.needs10GbSfpUplink}
        value={value.needs10GbSfpUplink}
        onChange={(v) => set("needs10GbSfpUplink", v)}
      />
      <YesNoField
        label="Do any connected devices need to be powered using PoE?"
        tooltip={SWITCH_FIELD_TOOLTIPS.needsPoE}
        value={value.needsPoE}
        onChange={(v) => set("needsPoE", v)}
      />

      {value.needsPoE && (
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            id={`${idPrefix}-poe30wDeviceCount`}
            label="Devices requiring 30W PoE"
            tooltip={SWITCH_FIELD_TOOLTIPS.poe30wDeviceCount}
            type="number"
            value={value.poe30wDeviceCount}
            onChange={(v) => set("poe30wDeviceCount", v)}
            errors={errors.poe30wDeviceCount}
          />
          <FormField
            id={`${idPrefix}-poeBt60wDeviceCount`}
            label="Devices requiring BT (60W) PoE"
            tooltip={SWITCH_FIELD_TOOLTIPS.poeBt60wDeviceCount}
            type="number"
            value={value.poeBt60wDeviceCount}
            onChange={(v) => set("poeBt60wDeviceCount", v)}
            errors={errors.poeBt60wDeviceCount}
          />
        </div>
      )}
    </div>
  );
}
