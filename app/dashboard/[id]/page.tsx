import { notFound } from "next/navigation";
import Link from "next/link";
import { DashboardNav } from "@/components/dashboard/dashboard-nav";
import { CopyLinkButton } from "@/components/dashboard/copy-link-button";
import { CustomerInviteEmail } from "@/components/dashboard/customer-invite-email";
import { ShareInternalRequestButton } from "@/components/dashboard/share-internal-request-button";
import { RequestWorkflowPanel } from "@/components/dashboard/request-workflow-panel";
import { SubmissionDetail } from "@/components/dashboard/submission-detail";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getRequestDetail, getSessionRole } from "@/lib/actions";
import { auth } from "@/lib/auth";
import {
  creatorAttributionLabel,
  canAccessCatalogAdmin,
  hasSePrivileges,
  isAdmin,
} from "@/lib/auth-utils";
import { buildVanityUrl } from "@/lib/app-url";
import { buildFlagChecklist } from "@/lib/sizing/flag-checklist";
import { listSubmissionVersions } from "@/lib/sizing/submission-versions";
import { SubmissionVersionHistory } from "@/components/dashboard/submission-version-history";

export default async function RequestDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [data, role, session] = await Promise.all([
    getRequestDetail(id),
    getSessionRole(),
    auth(),
  ]);

  if (!data) notFound();

  const { request, submission, creator, alignedSe } = data;
  const versions = await listSubmissionVersions(request.id);
  const vanityUrl = buildVanityUrl(request.slug);
  const showCreator = hasSePrivileges(role);
  const admin = isAdmin(role);
  const archived = Boolean(request.archivedAt);
  const expired =
    request.expiresAt !== null && request.expiresAt < new Date();
  const isInternal = request.source === "internal";
  const isPrivate = request.visibility === "private";
  const contactDomain = request.contactEmail?.split("@")[1];
  const awaitingResubmit = request.status === "pending" && Boolean(submission);
  const showCustomerInvite =
    !isInternal &&
    !submission &&
    !archived &&
    !expired &&
    Boolean(request.contactEmail);
  const inviteProps = request.contactEmail
    ? {
        label: request.label,
        vanityUrl,
        contactEmail: request.contactEmail,
        contactName: request.contactName,
        contactDomain: contactDomain ?? null,
        expiresAt: request.expiresAt,
        senderName: session?.user?.name ?? null,
        senderEmail: session?.user?.email ?? null,
      }
    : null;
  const flagChecklist = submission
    ? buildFlagChecklist({
        opportunityId: request.opportunityId,
        answers: submission.answers,
        recommendation: submission.recommendation,
      })
    : [];

  return (
    <div className="flex min-h-full flex-col">
      <DashboardNav
        showAdmin={showCreator}
        showCatalogAdmin={canAccessCatalogAdmin(role)}
      />
      <main className="mx-auto w-full max-w-4xl flex-1 space-y-6 bg-[var(--sophos-grey-1)] px-4 py-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="font-heading text-3xl font-light text-[var(--sophos-navy)]">
              {request.label}
            </h1>
            {!isInternal && (
              <p className="text-muted-foreground mt-1 text-sm">{vanityUrl}</p>
            )}
            {isInternal && (
              <p className="text-muted-foreground mt-1 text-sm">
                Internal SE sizing — no customer questionnaire link
              </p>
            )}
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
            {alignedSe && !isInternal && (
              <p className="text-muted-foreground mt-1 text-xs">
                Aligned SE: {alignedSe.name} ({alignedSe.email})
              </p>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {isInternal && <Badge variant="outline">Internal</Badge>}
            {isInternal && isPrivate && (
              <Badge variant="outline">Private</Badge>
            )}
            {isInternal && !isPrivate && (
              <Badge variant="outline">Shared</Badge>
            )}
            {archived && <Badge variant="outline">Archived</Badge>}
            {request.reviewStatus === "flagged" && (
              <Badge variant="outline">Pending SE Review</Badge>
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
            {!isInternal && <CopyLinkButton url={vanityUrl} />}
            {showCustomerInvite && inviteProps && (
              <CustomerInviteEmail {...inviteProps} variant="buttons" />
            )}
            {isInternal && isPrivate && showCreator && (
              <ShareInternalRequestButton requestId={request.id} />
            )}
          </div>
        </div>

        {!submission && contactDomain && !isInternal && (
          <p className="rounded-md border border-[var(--sophos-grey-2)] bg-white px-3 py-2 text-sm text-[var(--sophos-navy)]">
            Who can open this link: anyone with an email ending in{" "}
            <strong>@{contactDomain}</strong> (domain match — not necessarily{" "}
            {request.contactEmail}).
          </p>
        )}

        {isInternal && isPrivate && showCreator && (
          <p className="rounded-md border border-[var(--sophos-grey-2)] bg-white px-3 py-2 text-sm text-[var(--sophos-navy)]">
            This internal size is private to Sales Engineers. Share with the
            account team when you want Account Managers to see it in their
            request list.
          </p>
        )}

        {showCustomerInvite && inviteProps && (
          <CustomerInviteEmail {...inviteProps} />
        )}

        <RequestWorkflowPanel
          requestId={request.id}
          isSe={showCreator}
          isAdmin={admin}
          status={request.status}
          reviewStatus={request.reviewStatus ?? null}
          reviewNote={request.reviewNote ?? null}
          reviewNotes={request.reviewNotes ?? null}
          flaggedNote={request.flaggedNote ?? null}
          opportunityId={request.opportunityId ?? null}
          archivedAt={request.archivedAt ?? null}
          reviewedAt={request.reviewedAt ?? null}
          reviewedById={request.reviewedById ?? null}
          hasSubmission={Boolean(submission)}
          flagChecklist={flagChecklist}
          hasAlignedSe={Boolean(request.alignedSeId)}
        />

        {!submission ? (
          <Card className="border-[var(--sophos-grey-2)] shadow-sm">
            <CardHeader>
              <CardTitle className="font-heading text-xl font-light">
                {isInternal
                  ? "Awaiting internal sizing"
                  : "Awaiting customer submission"}
              </CardTitle>
              <CardDescription>
                {isInternal
                  ? "Complete the in-app questionnaire to generate a BOM. No customer link is involved."
                  : "Use Email customer above to open Outlook with the form link, or copy the link / email text. You will get an in-app notification (and email when configured) when they submit. The recommendation appears here after submit."}
              </CardDescription>
              {isInternal && showCreator && !archived && (
                <div className="pt-2">
                  <Link href={`/dashboard/internal/${request.id}`}>
                    <Button>Continue internal size</Button>
                  </Link>
                </div>
              )}
            </CardHeader>
          </Card>
        ) : (
          <>
            {awaitingResubmit && (
              <p className="rounded-md bg-amber-50 px-3 py-2 text-sm font-medium text-amber-800">
                Customer resubmit is open. Showing the last submitted BOM until
                they submit again (then this version moves to history).
              </p>
            )}
            {!showCreator &&
              !isInternal &&
              request.reviewStatus !== "reviewed" && (
                <p className="rounded-md bg-amber-50 px-3 py-2 text-sm font-medium text-amber-800">
                  Please review this recommendation with your Sales Engineer
                  before sending a quote. Use “Flag for SE” above when ready.
                  CSV export unlocks after SE review.
                </p>
              )}
            {request.reviewStatus === "reviewed" && (
              <p className="rounded-md bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-800">
                {isInternal
                  ? "Internal size saved. Export is available."
                  : "Sales Engineer has marked this recommendation as reviewed."}
              </p>
            )}
            <SubmissionDetail
              requestId={request.id}
              answers={submission.answers}
              recommendation={submission.recommendation}
              submittedAt={submission.submittedAt}
              opportunityId={request.opportunityId ?? null}
              label={request.label}
              exportAllowed={
                showCreator ||
                isInternal ||
                request.reviewStatus === "reviewed"
              }
              exportBlockedReason={
                showCreator ||
                isInternal ||
                request.reviewStatus === "reviewed"
                  ? null
                  : "CSV and quote export unlock after a Sales Engineer marks this request as reviewed. Flag for SE review above when ready."
              }
            />
            <SubmissionVersionHistory
              currentVersion={submission.version ?? 1}
              versions={versions}
            />
          </>
        )}
      </main>
    </div>
  );
}
