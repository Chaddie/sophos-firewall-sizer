import { DashboardNav } from "@/components/dashboard/dashboard-nav";
import { CreateRequestForm } from "@/components/dashboard/create-request-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getSessionRole } from "@/lib/actions";
import { isSalesEngineer } from "@/lib/auth-utils";

export default async function NewRequestPage() {
  const role = await getSessionRole();
  return (
    <div className="flex min-h-full flex-col">
      <DashboardNav showAdmin={isSalesEngineer(role)} />
      <main className="mx-auto w-full max-w-2xl flex-1 bg-[var(--sophos-grey-1)] px-4 py-8">
        <Card className="border-[var(--sophos-grey-2)] shadow-sm">
          <CardHeader>
            <CardTitle className="font-heading text-2xl font-light text-[var(--sophos-navy)]">
              Create sizing link
            </CardTitle>
            <CardDescription>
              Generate a vanity URL to send to your customer. They will complete
              the questionnaire and you will see the recommendation here.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <CreateRequestForm />
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
