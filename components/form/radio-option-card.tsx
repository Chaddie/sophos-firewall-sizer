"use client";

import { Label } from "@/components/ui/label";
import { RadioGroupItem } from "@/components/ui/radio-group";
import { InfoTooltip } from "@/components/form/info-tooltip";

interface RadioOptionCardProps {
  value: string;
  id: string;
  label: string;
  tooltip: string;
  description?: string;
  note?: string;
  includes?: string[];
}

export function RadioOptionCard({
  value,
  id,
  label,
  tooltip,
  description,
  note,
  includes,
}: RadioOptionCardProps) {
  return (
    <div className="flex items-start gap-3 rounded-lg border p-4">
      <RadioGroupItem value={value} id={id} className="mt-1" />
      <div className="min-w-0 flex-1 space-y-2">
        <div className="flex items-center gap-2">
          <Label htmlFor={id} className="cursor-pointer font-medium">
            {label}
          </Label>
          <InfoTooltip content={tooltip} side="right" />
        </div>
        {description && (
          <p className="text-muted-foreground text-sm">{description}</p>
        )}
        {note && (
          <p className="rounded-md bg-amber-50 px-2 py-1.5 text-xs font-medium text-amber-800">
            {note}
          </p>
        )}
        {includes && includes.length > 0 && (
          <div>
            <p className="text-xs font-medium text-[var(--sophos-navy)]">
              Includes:
            </p>
            <ul className="text-muted-foreground mt-1 list-inside list-disc space-y-0.5 text-xs">
              {includes.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

interface RadioOptionRowProps {
  value: string;
  id: string;
  label: string;
  tooltip: string;
}

export function RadioOptionRow({
  value,
  id,
  label,
  tooltip,
}: RadioOptionRowProps) {
  return (
    <div className="flex items-center gap-3 rounded-lg border p-4">
      <RadioGroupItem value={value} id={id} />
      <Label htmlFor={id} className="flex flex-1 cursor-pointer items-center gap-2 font-normal">
        <span>{label}</span>
        <InfoTooltip content={tooltip} side="right" />
      </Label>
    </div>
  );
}
