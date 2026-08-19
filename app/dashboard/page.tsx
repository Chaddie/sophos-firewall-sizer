import Link from "next/link";
import { DashboardNav } from "@/components/dashboard/dashboard-nav";
import { InvitePartnerForm } from "@/components/dashboard/invite-partner-form";
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

export default async function DashboardPage() {
  const [requests, role] = await Promise.all([
    getDashboardRequests(),
    getSessionRole(),
  ]);
  const showCreator = isSalesEngineer(role);
  const partner = isPartner(role);

  return (
    <div className="flex min-h-full flex-col">
      <DashboardNav showAdmin={showCreator} />
      <main className="mx-auto w-full max-w-6xl flex-1 bg-[var(--sophos-grey-1)] px-4 py-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="font-heading text-3xl font-light text-[var(--sophos-navy)]">
              Sizing requests
            </h1>
            <p className="text-muted-foreground text-sm">
              {showCreator
                ? "All sizing links across the team and partners."
                : partner
                  ? "Your partner sizing links and customer submissions."
                  : "Your sizing links and customer submissions."}
            </p>
          </div>
          <Link href="/dashboard/new">
            <Button>New link</Button>
          </Link>
        </div>

        {showCreator && (
          <div className="mb-6">
            <InvitePartnerForm />
          </div>
        )}

        {requests.length === 0 ? (
          <Card className="border-[var(--sophos-grey-2)] shadow-sm">
            <CardHeader>
              <CardTitle className="font-heading text-2xl font-light">
                No sizing links yet
              </CardTitle>
              <CardDescription>
                Create your first vanity URL to send to a customer.
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
            {requests.map((req) => (
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
                  </div>
                  <div className="flex items-center gap-3">
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
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
