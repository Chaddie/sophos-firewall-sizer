import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { SubmissionVersionRow } from "@/lib/sizing/submission-versions";

const SOURCE_LABELS: Record<string, string> = {
  customer_resubmit: "Customer resubmit",
  se_correction: "SE correction",
  reopen: "Reopened",
  catalog_recompute: "Catalog recompute",
};

export function SubmissionVersionHistory({
  currentVersion,
  versions,
}: {
  currentVersion: number;
  versions: SubmissionVersionRow[];
}) {
  if (versions.length === 0) return null;

  return (
    <Card className="border-[var(--sophos-grey-2)] shadow-sm">
      <CardHeader>
        <CardTitle className="font-heading text-xl font-light">
          Submission history
        </CardTitle>
        <CardDescription>
          Current version is v{currentVersion}. Prior submissions are kept for
          audit when the customer resubmits or an SE applies a correction.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ul className="space-y-2">
          {versions.map((v) => (
            <li
              key={v.id}
              className="flex flex-wrap items-baseline justify-between gap-2 rounded-md border border-[var(--sophos-grey-2)] bg-[var(--sophos-grey-1)] px-3 py-2 text-sm"
            >
              <span className="font-medium text-[var(--sophos-navy)]">
                v{v.version}
              </span>
              <span className="text-muted-foreground">
                {SOURCE_LABELS[v.source] ?? v.source}
              </span>
              <span className="text-muted-foreground text-xs">
                Submitted {new Date(v.submittedAt).toLocaleString()} · archived{" "}
                {new Date(v.archivedAt).toLocaleString()}
              </span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
