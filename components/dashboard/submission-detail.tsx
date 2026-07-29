import { CopyQuoteButton } from "@/components/dashboard/copy-quote-button";
import {
  FirewallTierControl,
  SwitchTierControl,
} from "@/components/dashboard/tier-quote-control";
import { WirelessHandoffButtons } from "@/components/dashboard/wireless-handoff-buttons";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { formatAnswersForDisplay } from "@/lib/format-answers";
import { formatQuoteSummary } from "@/lib/sizing/engine";
import { WIRELESS_PRESALES_EMAIL } from "@/lib/sizing/wireless-handoff";
import {
  isV2Recommendation,
  type StoredAnswers,
  type StoredRecommendation,
} from "@/lib/sizing/types";
import { ENVIRONMENT_LABELS } from "@/lib/validations";

interface SubmissionDetailProps {
  requestId: string;
  answers: StoredAnswers;
  recommendation: StoredRecommendation;
  submittedAt: Date;
}

export function SubmissionDetail({
  requestId,
  answers,
  recommendation,
  submittedAt,
}: SubmissionDetailProps) {
  const quoteText = formatQuoteSummary(recommendation);
  const formattedAnswers = formatAnswersForDisplay(answers);

  if (isV2Recommendation(recommendation)) {
    return (
      <>
        <Card className="border-[var(--sophos-grey-2)] shadow-sm">
          <CardHeader className="flex flex-row items-start justify-between gap-4">
            <div>
              <CardTitle className="font-heading text-2xl font-light">
                Recommendation
              </CardTitle>
              <CardDescription>
                Submitted {submittedAt.toLocaleString()} —{" "}
                {recommendation.sites.length} site
                {recommendation.sites.length === 1 ? "" : "s"}
              </CardDescription>
            </div>
            <CopyQuoteButton text={quoteText} />
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <h3 className="mb-2 text-sm font-medium">
                Consolidated bill of materials
              </h3>
              {recommendation.bom.length === 0 ? (
                <p className="text-muted-foreground text-sm">
                  No BOM line items (wireless-only sites require presales
                  handoff).
                </p>
              ) : (
                <ul className="space-y-2">
                  {recommendation.bom.map((item) => (
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
              )}
            </div>

            <Separator />

            {recommendation.sites.map((site) => (
              <div key={site.siteName} className="space-y-4">
                <h3 className="font-heading text-lg text-[var(--sophos-navy)]">
                  {site.siteName}
                </h3>

                {site.firewall && (
                  <div className="space-y-2 rounded-lg bg-muted/40 p-4">
                    <p className="text-sm font-medium">Firewall</p>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <Info label="Model" value={site.firewall.modelName} />
                      <Info
                        label="Environment"
                        value={ENVIRONMENT_LABELS[site.firewall.environment]}
                      />
                      <Info
                        label="Protection"
                        value={
                          site.firewall.protection === "xstream"
                            ? "Xstream"
                            : "Standard"
                        }
                      />
                      <Info
                        label="Sizing basis"
                        value={site.firewall.sizingBasis}
                      />
                    </div>
                    {site.firewall.modelOptions &&
                      site.firewall.modelOptions.length > 0 && (
                        <FirewallTierControl
                          requestId={requestId}
                          siteName={site.siteName}
                          options={site.firewall.modelOptions}
                          quotedTier={site.firewall.quotedTier}
                        />
                      )}
                  </div>
                )}

                {site.switches && (
                  <div className="space-y-2 rounded-lg bg-muted/40 p-4">
                    <p className="text-sm font-medium">Switch</p>
                    <Info label="Model" value={site.switches.modelName} />
                    {site.switches.modelOptions &&
                      site.switches.modelOptions.length > 0 && (
                        <SwitchTierControl
                          requestId={requestId}
                          siteName={site.siteName}
                          options={site.switches.modelOptions}
                          quotedTier={site.switches.quotedTier}
                        />
                      )}
                  </div>
                )}

                {site.wireless && (
                  <div className="space-y-3 rounded-lg border border-dashed p-4">
                    <p className="text-sm font-medium">
                      Wireless — presales handoff
                    </p>
                    <Alert>
                      <AlertTitle>Instructions for account managers</AlertTitle>
                      <AlertDescription className="space-y-2 text-sm">
                        <p>
                          Wireless access points are scoped by the presales
                          wireless team — not automatically by this tool. Review
                          the customer&apos;s answers and uploaded site plans
                          below, then complete the SFDC opportunity URL in the
                          email before sending.
                        </p>
                        <p>
                          Send the package to{" "}
                          <strong>{WIRELESS_PRESALES_EMAIL}</strong> and attach
                          any site plan files downloaded below.
                        </p>
                      </AlertDescription>
                    </Alert>

                    {site.wireless.answers.sitePlanFiles &&
                    site.wireless.answers.sitePlanFiles.length > 0 ? (
                      <div>
                        <p className="mb-1 text-xs font-medium text-[var(--sophos-navy)]">
                          Site plan files (download and attach to the email)
                        </p>
                        <ul className="space-y-1">
                          {site.wireless.answers.sitePlanFiles.map((file) => (
                            <li key={file.name}>
                              <a
                                href={file.url}
                                download={file.name}
                                className="text-sm text-[var(--sophos-blue)] underline underline-offset-2"
                              >
                                {file.name}
                              </a>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : (
                      <p className="text-muted-foreground text-xs">
                        No site plan files were uploaded by the customer.
                      </p>
                    )}

                    <pre className="text-muted-foreground max-h-48 overflow-auto whitespace-pre-wrap text-xs">
                      {site.wireless.summaryText}
                    </pre>
                    <WirelessHandoffButtons
                      mailtoUrl={site.wireless.mailtoUrl}
                      summaryText={site.wireless.summaryText}
                      filename={`wireless-${site.siteName.replace(/\s+/g, "-").toLowerCase()}.txt`}
                    />
                  </div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="border-[var(--sophos-grey-2)] shadow-sm">
          <CardHeader>
            <CardTitle className="font-heading text-xl font-light">
              Customer answers
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {formattedAnswers.schemaVersion === 2 &&
              formattedAnswers.contactRows.length > 0 && (
                <dl className="grid gap-3 sm:grid-cols-2">
                  {formattedAnswers.contactRows.map((row) => (
                    <Info key={row.label} label={row.label} value={row.value} />
                  ))}
                </dl>
              )}
            {formattedAnswers.schemaVersion === 2 &&
              formattedAnswers.sites.map((site) => (
                <div key={site.siteName} className="space-y-3">
                  <h4 className="font-medium">{site.siteName}</h4>
                  {site.sections.map((section) => (
                    <div key={section.title}>
                      <p className="text-muted-foreground mb-2 text-xs uppercase tracking-wide">
                        {section.title}
                      </p>
                      <dl className="grid gap-3 sm:grid-cols-2">
                        {section.rows.map((row) => (
                          <Info
                            key={`${section.title}-${row.label}`}
                            label={row.label}
                            value={row.value}
                          />
                        ))}
                      </dl>
                    </div>
                  ))}
                </div>
              ))}
          </CardContent>
        </Card>
      </>
    );
  }

  const legacy = recommendation;
  return (
    <>
      <Card className="border-[var(--sophos-grey-2)] shadow-sm">
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div>
            <CardTitle className="font-heading text-2xl font-light">
              Recommendation
            </CardTitle>
            <CardDescription>
              Submitted {submittedAt.toLocaleString()} (legacy single-site
              submission)
            </CardDescription>
          </div>
          <CopyQuoteButton text={quoteText} />
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Info label="Model" value={legacy.modelName} />
            <Info
              label="Environment"
              value={ENVIRONMENT_LABELS[legacy.environment]}
            />
            <Info
              label="Protection"
              value={legacy.protection === "xstream" ? "Xstream" : "Standard"}
            />
            <Info label="Sizing basis" value={legacy.sizingBasis} />
          </div>
          {legacy.instanceRecommendation && (
            <Info
              label="Instance / sizing"
              value={legacy.instanceRecommendation}
            />
          )}
          {legacy.modelOptions && legacy.modelOptions.length > 0 && (
            <FirewallTierControl
              requestId={requestId}
              siteName={null}
              options={legacy.modelOptions}
              quotedTier={legacy.quotedTier}
            />
          )}
          <Separator />
          <div>
            <h3 className="mb-2 text-sm font-medium">Bill of materials</h3>
            <ul className="space-y-2">
              {legacy.bom.map((item) => (
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
        </CardContent>
      </Card>

      <Card className="border-[var(--sophos-grey-2)] shadow-sm">
        <CardHeader>
          <CardTitle className="font-heading text-xl font-light">
            Customer answers
          </CardTitle>
        </CardHeader>
        <CardContent>
          {formattedAnswers.schemaVersion === 1 && (
            <dl className="grid gap-3 sm:grid-cols-2">
              {formattedAnswers.rows.map((row) => (
                <Info key={row.label} label={row.label} value={row.value} />
              ))}
            </dl>
          )}
        </CardContent>
      </Card>
    </>
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
