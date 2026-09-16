import { Badge } from "@/components/ui/badge";
import type {
  CatalogProvenance,
  SizingConfidence,
} from "@/lib/sizing/types";
import { cn } from "@/lib/utils";

const CONFIDENCE_LABEL: Record<SizingConfidence, string> = {
  green: "Green — constraints met with headroom",
  amber: "Amber — tight on a limit (>75% or low headroom)",
  red: "Red — no model fully meets requirements",
};

const CONFIDENCE_CLASS: Record<SizingConfidence, string> = {
  green:
    "border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-100",
  amber:
    "border-amber-200 bg-amber-50 text-amber-950 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-100",
  red: "border-red-200 bg-red-50 text-red-900 dark:border-red-800 dark:bg-red-950 dark:text-red-100",
};

export function ConfidenceChip({
  confidence,
}: {
  confidence?: SizingConfidence | null;
}) {
  if (!confidence) return null;
  return (
    <Badge
      variant="outline"
      className={cn("h-auto max-w-full whitespace-normal", CONFIDENCE_CLASS[confidence])}
      title={CONFIDENCE_LABEL[confidence]}
    >
      {confidence === "green"
        ? "Confidence: Green"
        : confidence === "amber"
          ? "Confidence: Amber"
          : "Confidence: Red"}
    </Badge>
  );
}

export function SizingExplainability({
  bindingConstraint,
  whyRecommended,
  confidence,
  sizingNotes,
  constraintsMet,
  catalogProvenance,
}: {
  bindingConstraint?: string | null;
  whyRecommended?: string | null;
  confidence?: SizingConfidence | null;
  sizingNotes?: string[];
  constraintsMet?: string[];
  catalogProvenance?: CatalogProvenance | null;
}) {
  const notes = sizingNotes ?? [];
  const constraints = constraintsMet ?? [];
  const hasBody =
    Boolean(bindingConstraint) ||
    Boolean(whyRecommended) ||
    notes.length > 0 ||
    constraints.length > 0 ||
    Boolean(catalogProvenance);

  if (!hasBody && !confidence) return null;

  return (
    <div className="space-y-3 rounded-md border border-[var(--sophos-grey-2)] bg-white/70 p-3">
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-xs font-medium uppercase tracking-wide text-[var(--sophos-navy)]">
          Why this size
        </p>
        <ConfidenceChip confidence={confidence} />
      </div>

      {bindingConstraint && (
        <div>
          <p className="text-muted-foreground text-xs">Binding constraint</p>
          <p className="text-sm font-medium text-[var(--sophos-navy)]">
            {bindingConstraint}
          </p>
        </div>
      )}

      {whyRecommended && (
        <div>
          <p className="text-muted-foreground text-xs">
            Why Recommended ≠ Minimum
          </p>
          <p className="text-sm text-[var(--sophos-navy)]">{whyRecommended}</p>
        </div>
      )}

      {constraints.length > 0 && (
        <div>
          <p className="text-muted-foreground mb-1 text-xs">Constraints considered</p>
          <div className="flex flex-wrap gap-1.5">
            {constraints.map((item) => (
              <Badge key={item} variant="secondary" className="font-normal">
                {item}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {notes.length > 0 && (
        <div>
          <p className="text-muted-foreground mb-1 text-xs">Sizing notes</p>
          <ul className="list-disc space-y-1 pl-4 text-sm text-[var(--sophos-navy)]">
            {notes.map((note) => (
              <li key={note}>{note}</li>
            ))}
          </ul>
        </div>
      )}

      {catalogProvenance && (
        <p className="text-muted-foreground text-xs">
          Catalog {catalogProvenance.version}
          {catalogProvenance.asOf ? ` · as of ${catalogProvenance.asOf}` : ""}
          {catalogProvenance.lastReviewed
            ? ` · last reviewed ${catalogProvenance.lastReviewed}`
            : ""}{" "}
          ({catalogProvenance.source})
        </p>
      )}
    </div>
  );
}
