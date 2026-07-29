"use client";

import { Info } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface InfoTooltipProps {
  content: string;
  className?: string;
  side?: "top" | "right" | "bottom" | "left";
}

export function InfoTooltip({
  content,
  className,
  side = "top",
}: InfoTooltipProps) {
  return (
    <Tooltip>
      <TooltipTrigger
        type="button"
        className={cn(
          "inline-flex shrink-0 text-muted-foreground transition-colors hover:text-foreground",
          className,
        )}
        aria-label="More information"
        onClick={(e) => e.preventDefault()}
      >
        <Info className="size-4" />
      </TooltipTrigger>
      <TooltipContent
        side={side}
        className="max-w-sm whitespace-normal text-left leading-relaxed"
      >
        {content}
      </TooltipContent>
    </Tooltip>
  );
}

interface LabelWithTooltipProps {
  htmlFor?: string;
  label: string;
  tooltip: string;
  className?: string;
}

export function LabelWithTooltip({
  htmlFor,
  label,
  tooltip,
  className,
}: LabelWithTooltipProps) {
  return (
    <div className={cn("flex items-center gap-1.5", className)}>
      <label htmlFor={htmlFor} className="text-sm font-medium">
        {label}
      </label>
      <InfoTooltip content={tooltip} />
    </div>
  );
}
