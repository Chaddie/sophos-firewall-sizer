import { notFound } from "next/navigation";
import { DashboardNav } from "@/components/dashboard/dashboard-nav";
import { CopyLinkButton } from "@/components/dashboard/copy-link-button";
import { SubmissionDetail } from "@/components/dashboard/submission-detail";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getRequestDetail, getSessionRole } from "@/lib/actions";
import { isSalesEngineer } from "@/lib/auth-utils";
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
            {showCreator && creator && (
              <p className="text-muted-foreground mt-1 text-xs">
                Created by {creator.name} ({creator.email})
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Badge
              variant={request.status === "submitted" ? "default" : "secondary"}
            >
              {request.status}
            </Badge>
            <CopyLinkButton url={vanityUrl} />
          </div>
        </div>

        {!submission ? (
          <Card className="border-[var(--sophos-grey-2)] shadow-sm">
            <CardHeader>
              <CardTitle className="font-heading text-xl font-light">
                Awaiting customer submission
              </CardTitle>
              <CardDescription>
                Share the link above with your customer. The recommendation will
                appear here once they submit the questionnaire.
              </CardDescription>
            </CardHeader>
          </Card>
        ) : (
          <SubmissionDetail
            requestId={request.id}
            answers={submission.answers}
            recommendation={submission.recommendation}
            submittedAt={submission.submittedAt}
          />
        )}
      </main>
    </div>
  );
}
