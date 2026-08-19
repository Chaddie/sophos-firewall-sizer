import Link from "next/link";
import { DashboardNav } from "@/components/dashboard/dashboard-nav";
import { SeRequestScopeFilter } from "@/components/dashboard/se-request-scope-filter";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  getDashboardRequests,
  getSessionRole,
} from "@/lib/actions";
import {
  creatorAttributionLabel,
  isPartner,
  isSalesEngineer,
} from "@/lib/auth-utils";
import { buildVanityUrl } from "@/lib/app-url";
import { cn } from "@/lib/utils";

function isExpired(expiresAt: Date | null) {
  return Boolean(expiresAt && expiresAt < new Date());
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ scope?: string; q?: string; status?: string }>;
}) {
  const params = await searchParams;
  const role = await getSessionRole();
  const showCreator = isSalesEngineer(role);
  const partner = isPartner(role);
  const scope: "mine" | "all" =
    showCreator && params.scope === "all" ? "all" : "mine";
  const mineOnly = !showCreator || scope === "mine";
  const creatorQuery = showCreator ? (params.q?.trim() ?? "") : "";
  const status: "all" | "pending" | "submitted" =
    params.status === "pending" || params.status === "submitted"
      ? params.status
      : "all";

  const requests = await getDashboardRequests({
    mineOnly,
    creatorQuery,
    status,
  });

  return (
    <div className="flex min-h-full flex-col">
      <DashboardNav showAdmin={showCreator} />
      <main className="mx-auto w-full max-w-6xl flex-1 bg-[var(--sophos-grey-1)] px-4 py-8">
        <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="font-heading text-3xl font-light text-[var(--sophos-navy)]">
              Sizing requests
            </h1>
            <p className="text-muted-foreground text-sm">
              {showCreator
                ? scope === "mine"
                  ? "Your sizing links and customer submissions."
                  : "All sizing links across the team and partners."
                : partner
                  ? "Your partner sizing links and customer submissions."
                  : "Your sizing links and customer submissions."}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {showCreator ? (
              <SeRequestScopeFilter
                scope={scope}
                creatorQuery={creatorQuery}
                status={status}
              />
            ) : (
              <div className="inline-flex rounded-lg border border-[var(--sophos-grey-2)] bg-white p-0.5 shadow-sm">
                {(["all", "pending", "submitted"] as const).map((s) => (
                  <Link
                    key={s}
                    href={
                      s === "all" ? "/dashboard" : `/dashboard?status=${s}`
                    }
                    className={cn(
                      "rounded-md px-3 py-1.5 text-sm capitalize transition-colors",
                      status === s
                        ? "bg-[var(--sophos-navy)] text-white"
                        : "text-[var(--sophos-grey-4)] hover:text-[var(--sophos-navy)]",
                    )}
                  >
                    {s === "all" ? "Any status" : s}
                  </Link>
                ))}
              </div>
            )}
            <Link href="/dashboard/new">
              <Button>New link</Button>
            </Link>
          </div>
        </div>

        {requests.length === 0 ? (
          <Card className="border-[var(--sophos-grey-2)] shadow-sm">
            <CardHeader>
              <CardTitle className="font-heading text-2xl font-light">
                No sizing links yet
              </CardTitle>
              <CardDescription>
                {showCreator && creatorQuery
                  ? `No sizing requests match “${creatorQuery}”.`
                  : showCreator && scope === "all"
                    ? "No sizing links have been created yet."
                    : "Create your first vanity URL to send to a customer."}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/dashboard/new">
                <Button>Create sizing link</Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {requests.map((req) => {
              const expired = isExpired(req.expiresAt);
              return (
                <Link
                  key={req.id}
                  href={`/dashboard/${req.id}`}
                  className="block rounded-xl border border-[var(--sophos-grey-2)] bg-white p-4 shadow-sm transition-colors hover:border-[var(--sophos-blue)]/30"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="font-medium">{req.label}</p>
                      <p className="text-muted-foreground text-sm">
                        {buildVanityUrl(req.slug)}
                      </p>
                      {req.contactEmail && (
                        <p className="text-muted-foreground mt-1 text-xs">
                          For: {req.contactName ? `${req.contactName} ` : ""}
                          {`<${req.contactEmail}>`}
                        </p>
                      )}
                      {showCreator && req.createdByName && (
                        <p className="text-muted-foreground mt-1 text-xs">
                          {creatorAttributionLabel(
                            req.createdByRole,
                            req.createdByName,
                            req.createdByEmail,
                          )}
                        </p>
                      )}
                      {req.expiresAt && (
                        <p
                          className={cn(
                            "mt-1 text-xs",
                            expired
                              ? "font-medium text-amber-700"
                              : "text-muted-foreground",
                          )}
                        >
                          {expired ? "Expired" : "Expires"}{" "}
                          {req.expiresAt.toLocaleString()}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {req.reviewStatus === "flagged" && (
                        <Badge variant="outline">Flagged</Badge>
                      )}
                      {req.reviewStatus === "reviewed" && (
                        <Badge variant="outline">Reviewed</Badge>
                      )}
                      {req.reviewStatus === "needs_changes" && (
                        <Badge variant="outline">Needs changes</Badge>
                      )}
                      {expired && <Badge variant="destructive">Expired</Badge>}
                      <Badge
                        variant={
                          req.status === "submitted" ? "default" : "secondary"
                        }
                      >
                        {req.status}
                      </Badge>
                      <span className="text-muted-foreground text-xs">
                        {req.createdAt.toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
