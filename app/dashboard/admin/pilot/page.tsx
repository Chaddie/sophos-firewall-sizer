import { notFound } from "next/navigation";
import { DashboardNav } from "@/components/dashboard/dashboard-nav";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getSessionRole } from "@/lib/actions";
import { canAccessCatalogAdmin, hasSePrivileges } from "@/lib/auth-utils";
import { getPilotMetrics } from "@/lib/pilot-metrics";

function Metric({
  label,
  value,
  hint,
}: {
  label: string;
  value: string | number;
  hint?: string;
}) {
  return (
    <div className="rounded-lg border border-[var(--sophos-grey-2)] bg-white p-4">
      <p className="text-muted-foreground text-xs uppercase tracking-wide">
        {label}
      </p>
      <p className="mt-1 font-heading text-3xl font-light text-[var(--sophos-navy)]">
        {value}
      </p>
      {hint && <p className="text-muted-foreground mt-1 text-xs">{hint}</p>}
    </div>
  );
}

export default async function PilotMetricsPage() {
  const role = await getSessionRole();
  if (!hasSePrivileges(role)) notFound();

  const metrics = await getPilotMetrics(14);

  return (
    <div className="flex min-h-full flex-col">
      <DashboardNav
        showAdmin
        showCatalogAdmin={canAccessCatalogAdmin(role)}
      />
      <main className="mx-auto w-full max-w-4xl flex-1 space-y-6 bg-[var(--sophos-grey-1)] px-4 py-8">
        <div>
          <h1 className="font-heading text-3xl font-light text-[var(--sophos-navy)]">
            2-week pilot metrics
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Funnel signals for AM/SE adoption pilots. Window starts{" "}
            {new Date(metrics.since).toLocaleString()}.
          </p>
        </div>

        <Card className="border-[var(--sophos-grey-2)] shadow-sm">
          <CardHeader>
            <CardTitle className="font-heading text-xl font-light">
              Last {metrics.windowDays} days
            </CardTitle>
            <CardDescription>
              Track submit %, flag → reviewed latency, and export-ready deals
              (opportunity ID set). Pair with a short AM/SE pilot rather than
              chasing more features first.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <Metric label="Links created" value={metrics.linksCreated} />
            <Metric
              label="Submissions"
              value={metrics.submissions}
              hint={
                metrics.submitRatePercent != null
                  ? `${metrics.submitRatePercent}% of links submitted`
                  : undefined
              }
            />
            <Metric label="Flagged for SE" value={metrics.flagged} />
            <Metric label="Reviewed" value={metrics.reviewed} />
            <Metric label="Needs changes" value={metrics.needsChanges} />
            <Metric
              label="With opportunity ID"
              value={metrics.withOpportunityId}
              hint="Proxy for export / CPQ handoff readiness"
            />
            <Metric
              label="Avg flag → review (hrs)"
              value={
                metrics.avgFlagToReviewHours != null
                  ? metrics.avgFlagToReviewHours
                  : "—"
              }
            />
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
