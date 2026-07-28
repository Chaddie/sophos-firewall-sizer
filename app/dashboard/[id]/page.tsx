import { notFound } from "next/navigation";
import { DashboardNav } from "@/components/dashboard/dashboard-nav";
import { CopyLinkButton } from "@/components/dashboard/copy-link-button";
import { CopyQuoteButton } from "@/components/dashboard/copy-quote-button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { getRequestDetail } from "@/lib/actions";
import { buildVanityUrl } from "@/lib/app-url";
import { formatQuoteSummary } from "@/lib/sizing/engine";
import { ENVIRONMENT_LABELS } from "@/lib/validations";

export default async function RequestDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const data = await getRequestDetail(id);

  if (!data) notFound();

  const { request, submission } = data;
  const vanityUrl = buildVanityUrl(request.slug);
  const quoteText = submission
    ? formatQuoteSummary(submission.recommendation)
    : null;

  return (
    <div className="flex min-h-full flex-col">
      <DashboardNav />
      <main className="mx-auto w-full max-w-4xl flex-1 space-y-6 px-4 py-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              {request.label ?? request.slug}
            </h1>
            <p className="text-muted-foreground mt-1 text-sm">{vanityUrl}</p>
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
          <Card>
            <CardHeader>
              <CardTitle>Awaiting customer submission</CardTitle>
              <CardDescription>
                Share the link above with your customer. The recommendation will
                appear here once they submit the questionnaire.
              </CardDescription>
            </CardHeader>
          </Card>
        ) : (
          <>
            <Card>
              <CardHeader className="flex flex-row items-start justify-between gap-4">
                <div>
                  <CardTitle>Recommendation</CardTitle>
                  <CardDescription>
                    Submitted {submission.submittedAt.toLocaleString()}
                  </CardDescription>
                </div>
                {quoteText && <CopyQuoteButton text={quoteText} />}
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <Info label="Model" value={submission.recommendation.modelName} />
                  <Info
                    label="Environment"
                    value={
                      ENVIRONMENT_LABELS[submission.recommendation.environment]
                    }
                  />
                  <Info
                    label="Protection"
                    value={
                      submission.recommendation.protection === "xstream"
                        ? "Xstream"
                        : "Standard"
                    }
                  />
                  <Info
                    label="Sizing basis"
                    value={submission.recommendation.sizingBasis}
                  />
                </div>

                {submission.recommendation.instanceRecommendation && (
                  <Info
                    label="Instance / sizing"
                    value={submission.recommendation.instanceRecommendation}
                  />
                )}

                <Separator />

                <div>
                  <h3 className="mb-2 text-sm font-medium">Bill of materials</h3>
                  <ul className="space-y-2">
                    {submission.recommendation.bom.map((item) => (
                      <li
                        key={`${item.sku}-${item.description}`}
                        className="flex justify-between text-sm"
                      >
                        <span>
                          {item.quantity}× {item.description}
                        </span>
                        <span className="text-muted-foreground">{item.sku}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {submission.recommendation.sizingNotes.length > 0 && (
                  <>
                    <Separator />
                    <div>
                      <h3 className="mb-2 text-sm font-medium">Sizing notes</h3>
                      <ul className="text-muted-foreground list-disc space-y-1 pl-5 text-sm">
                        {submission.recommendation.sizingNotes.map((note) => (
                          <li key={note}>{note}</li>
                        ))}
                      </ul>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Customer answers</CardTitle>
              </CardHeader>
              <CardContent>
                <dl className="grid gap-3 sm:grid-cols-2">
                  {submission.answers.customerName && (
                    <Info label="Name" value={submission.answers.customerName} />
                  )}
                  {submission.answers.customerEmail && (
                    <Info
                      label="Email"
                      value={submission.answers.customerEmail}
                    />
                  )}
                  <Info
                    label="Total WAN bandwidth"
                    value={`${submission.answers.totalWanBandwidthMbps} Mbps`}
                  />
                  <Info
                    label="Average consumption"
                    value={`${submission.answers.averageWanConsumptionMbps} Mbps`}
                  />
                  <Info
                    label="3-year growth"
                    value={`${submission.answers.wanGrowth3yrPercent}%`}
                  />
                  <Info
                    label="Peak growth"
                    value={`${submission.answers.anticipatedPeakGrowthMbps} Mbps`}
                  />
                  <Info
                    label="Average growth"
                    value={`${submission.answers.anticipatedAverageGrowthMbps} Mbps`}
                  />
                  <Info
                    label="VPN"
                    value={
                      submission.answers.vpnEnabled
                        ? `Yes — ${submission.answers.ipsecTunnels} IPsec, ${submission.answers.sslVpnTunnels} SSL, ${submission.answers.peakVpnThroughputMbps} Mbps peak`
                        : "No"
                    }
                  />
                  <Info
                    label="User authentication"
                    value={
                      submission.answers.userAuthEnabled
                        ? `Yes — ${submission.answers.authUserCount} users`
                        : "No"
                    }
                  />
                  <Info
                    label="High availability"
                    value={submission.answers.haRequired ? "Yes" : "No"}
                  />
                </dl>
              </CardContent>
            </Card>
          </>
        )}
      </main>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-muted-foreground text-xs">{label}</dt>
      <dd className="text-sm font-medium">{value}</dd>
    </div>
  );
}
