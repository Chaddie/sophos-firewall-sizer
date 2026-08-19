import { notFound } from "next/navigation";
import { DashboardNav } from "@/components/dashboard/dashboard-nav";
import { CopyLinkButton } from "@/components/dashboard/copy-link-button";
import { RequestWorkflowPanel } from "@/components/dashboard/request-workflow-panel";
import { SubmissionDetail } from "@/components/dashboard/submission-detail";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getRequestDetail, getSessionRole } from "@/lib/actions";
import {
  creatorAttributionLabel,
  isSalesEngineer,
} from "@/lib/auth-utils";
import { buildVanityUrl } from "@/lib/app-url";

export default async function RequestDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [data, role] = await Promise.all([
    getRequestDetail(id),
    getSessionRole(),
  ]);

  if (!data) notFound();

  const { request, submission, creator } = data;
  const vanityUrl = buildVanityUrl(request.slug);
  const showCreator = isSalesEngineer(role);
  const expired =
    request.expiresAt !== null && request.expiresAt < new Date();
  const contactDomain = request.contactEmail?.split("@")[1];

  return (
    <div className="flex min-h-full flex-col">
      <DashboardNav showAdmin={showCreator} />
      <main className="mx-auto w-full max-w-4xl flex-1 space-y-6 bg-[var(--sophos-grey-1)] px-4 py-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="font-heading text-3xl font-light text-[var(--sophos-navy)]">
              {request.label}
            </h1>
            <p className="text-muted-foreground mt-1 text-sm">{vanityUrl}</p>
            {request.contactEmail && (
              <p className="text-muted-foreground mt-1 text-xs">
                For: {request.contactName ? `${request.contactName} ` : ""}
                {`<${request.contactEmail}>`}
              </p>
            )}
            {request.expiresAt && (
              <p
                className={`mt-1 text-xs ${expired ? "font-medium text-amber-700" : "text-muted-foreground"}`}
              >
                {expired ? "Expired" : "Expires"}{" "}
                {request.expiresAt.toLocaleString()}
              </p>
            )}
            {showCreator && creator && (
              <p className="text-muted-foreground mt-1 text-xs">
                {creatorAttributionLabel(
                  creator.role,
                  creator.name,
                  creator.email,
                )}
              </p>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {request.reviewStatus === "flagged" && (
              <Badge variant="outline">Flagged for SE</Badge>
            )}
            {request.reviewStatus === "reviewed" && (
              <Badge variant="outline">Reviewed</Badge>
            )}
            {request.reviewStatus === "needs_changes" && (
              <Badge variant="outline">Needs changes</Badge>
            )}
            {expired && <Badge variant="destructive">Expired</Badge>}
            <Badge
              variant={request.status === "submitted" ? "default" : "secondary"}
            >
              {request.status}
            </Badge>
            <CopyLinkButton url={vanityUrl} />
          </div>
        </div>

        {!submission && contactDomain && (
          <p className="rounded-md border border-[var(--sophos-grey-2)] bg-white px-3 py-2 text-sm text-[var(--sophos-navy)]">
            Who can open this link: anyone with an email ending in{" "}
            <strong>@{contactDomain}</strong> (domain match — not necessarily{" "}
            {request.contactEmail}).
          </p>
        )}

        <RequestWorkflowPanel
          requestId={request.id}
          isSe={showCreator}
          status={request.status}
          reviewStatus={request.reviewStatus ?? null}
          reviewNote={request.reviewNote ?? null}
          flaggedNote={request.flaggedNote ?? null}
          opportunityId={request.opportunityId ?? null}
        />

        {!submission ? (
          <Card className="border-[var(--sophos-grey-2)] shadow-sm">
            <CardHeader>
              <CardTitle className="font-heading text-xl font-light">
                Awaiting customer submission
              </CardTitle>
              <CardDescription>
                Share the link above with your customer. You will be emailed when
                they submit (when email delivery is configured). The
                recommendation appears here after submit.
              </CardDescription>
            </CardHeader>
          </Card>
        ) : (
          <>
            {!showCreator && request.reviewStatus !== "reviewed" && (
              <p className="rounded-md bg-amber-50 px-3 py-2 text-sm font-medium text-amber-800">
                Please review this recommendation with your Sales Engineer
                before sending a quote. Use “Flag for SE” above when ready.
              </p>
            )}
            {request.reviewStatus === "reviewed" && (
              <p className="rounded-md bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-800">
                Sales Engineer has marked this recommendation as reviewed
                {request.reviewNote ? `: ${request.reviewNote}` : "."}
              </p>
            )}
            <SubmissionDetail
              requestId={request.id}
              answers={submission.answers}
              recommendation={submission.recommendation}
              submittedAt={submission.submittedAt}
              opportunityId={request.opportunityId ?? null}
              label={request.label}
            />
          </>
        )}
      </main>
    </div>
  );
}
