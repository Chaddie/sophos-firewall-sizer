"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { InfoTooltip, LabelWithTooltip } from "@/components/form/info-tooltip";
import type { FirewallFormState } from "@/lib/form/defaults";

export function FormField({
  id,
  label,
  hint,
  tooltip,
  value,
  onChange,
  errors,
  type = "text",
  className,
}: {
  id: string;
  label: string;
  hint?: string;
  tooltip?: string;
  value: string;
  onChange: (v: string) => void;
  errors?: string[];
  type?: string;
  className?: string;
}) {
  return (
    <div className={className}>
      {tooltip ? (
        <LabelWithTooltip htmlFor={id} label={label} tooltip={tooltip} />
      ) : (
        <Label htmlFor={id}>{label}</Label>
      )}
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

export function YesNoField({
  label,
  tooltip,
  value,
  onChange,
}: {
  label: string;
  tooltip?: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  const groupId = label.replace(/\s+/g, "-").toLowerCase();

  return (
    <RadioGroup
      value={value ? "yes" : "no"}
      onValueChange={(v) => onChange(v === "yes")}
      className="flex flex-wrap items-center gap-4"
    >
      <div className="flex items-center gap-1.5">
        <span className="text-sm font-medium">{label}</span>
        {tooltip && <InfoTooltip content={tooltip} />}
      </div>
      <div className="flex items-center gap-2">
        <RadioGroupItem value="yes" id={`${groupId}-yes`} />
        <Label htmlFor={`${groupId}-yes`} className="font-normal">
          Yes
        </Label>
      </div>
      <div className="flex items-center gap-2">
        <RadioGroupItem value="no" id={`${groupId}-no`} />
        <Label htmlFor={`${groupId}-no`} className="font-normal">
          No
        </Label>
      </div>
    </RadioGroup>
  );
}

export function ProductToggle({
  label,
  tooltip,
  checked,
  onChange,
}: {
  label: string;
  tooltip?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-2 rounded-lg border p-3">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="size-4 accent-[var(--sophos-blue)]"
      />
      <span className="text-sm font-medium">{label}</span>
      {tooltip && (
        <InfoTooltip
          content={tooltip}
          className="ml-auto"
          side="right"
        />
      )}
    </label>
  );
}

export type { FirewallFormState };
