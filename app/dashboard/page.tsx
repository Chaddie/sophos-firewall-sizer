import Link from "next/link";
import { DashboardNav } from "@/components/dashboard/dashboard-nav";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getDashboardRequests } from "@/lib/actions";
import { buildVanityUrl } from "@/lib/app-url";

export default async function DashboardPage() {
  const requests = await getDashboardRequests();

  return (
    <div className="flex min-h-full flex-col">
      <DashboardNav />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              Sizing requests
            </h1>
            <p className="text-muted-foreground text-sm">
              Create vanity links and view customer submissions.
            </p>
          </div>
          <Link href="/dashboard/new">
            <Button>New link</Button>
          </Link>
        </div>

        {requests.length === 0 ? (
          <Card>
            <CardHeader>
              <CardTitle>No sizing links yet</CardTitle>
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
                className="block rounded-xl border bg-card p-4 transition-colors hover:bg-muted/40"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-medium">
                      {req.label ?? req.slug}
                    </p>
                    <p className="text-muted-foreground text-sm">
                      {buildVanityUrl(req.slug)}
                    </p>
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
