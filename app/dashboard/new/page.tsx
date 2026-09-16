import { DashboardNav } from "@/components/dashboard/dashboard-nav";
import { CreateRequestForm } from "@/components/dashboard/create-request-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  getSessionRole,
  listAlignableSalesEngineers,
} from "@/lib/actions";
import {
  canAccessCatalogAdmin,
  hasSePrivileges,
} from "@/lib/auth-utils";

export default async function NewRequestPage() {
  const [role, salesEngineers] = await Promise.all([
    getSessionRole(),
    listAlignableSalesEngineers(),
  ]);
  return (
    <div className="flex min-h-full flex-col">
      <DashboardNav
        showAdmin={hasSePrivileges(role)}
        showCatalogAdmin={canAccessCatalogAdmin(role)}
      />
      <main className="mx-auto w-full max-w-2xl flex-1 bg-[var(--sophos-grey-1)] px-4 py-8">
        <Card className="border-[var(--sophos-grey-2)] shadow-sm">
          <CardHeader>
            <CardTitle className="font-heading text-2xl font-light text-[var(--sophos-navy)]">
              Create sizing link
            </CardTitle>
            <CardDescription>
              Create a customer link to send for sizing. Select the aligned
              Sales Engineer so they are notified when the link is created and
              when the customer submits.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <CreateRequestForm
              salesEngineers={salesEngineers}
              requireAlignedSe={!hasSePrivileges(role)}
            />
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
