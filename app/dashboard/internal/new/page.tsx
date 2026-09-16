import { redirect } from "next/navigation";
import { DashboardNav } from "@/components/dashboard/dashboard-nav";
import { CreateInternalSizeForm } from "@/components/dashboard/create-internal-size-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getSessionRole } from "@/lib/actions";
import {
  canAccessCatalogAdmin,
  hasSePrivileges,
} from "@/lib/auth-utils";

export default async function NewInternalSizePage() {
  const role = await getSessionRole();
  if (!role || !hasSePrivileges(role)) redirect("/dashboard");

  return (
    <div className="flex min-h-full flex-col">
      <DashboardNav
        showAdmin
        showCatalogAdmin={canAccessCatalogAdmin(role)}
      />
      <main className="mx-auto w-full max-w-lg flex-1 space-y-6 bg-[var(--sophos-grey-1)] px-4 py-8">
        <div>
          <h1 className="font-heading text-3xl font-light text-[var(--sophos-navy)]">
            Internal size
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Size firewall / switch / wireless hardware without sending a
            customer questionnaire link.
          </p>
        </div>
        <Card className="border-[var(--sophos-grey-2)] shadow-sm">
          <CardHeader>
            <CardTitle className="font-heading text-xl font-light">
              New internal sizing
            </CardTitle>
            <CardDescription>
              Saved to your requests list with full BOM export. Hidden from
              account managers until you share.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <CreateInternalSizeForm />
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
