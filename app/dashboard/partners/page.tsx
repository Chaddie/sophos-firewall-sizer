import { DashboardNav } from "@/components/dashboard/dashboard-nav";
import { InvitePartnerForm } from "@/components/dashboard/invite-partner-form";
import { getSessionRole } from "@/lib/actions";
import { isSalesEngineer } from "@/lib/auth-utils";
import { redirect } from "next/navigation";

export default async function PartnersPage() {
  const role = await getSessionRole();
  if (!isSalesEngineer(role)) redirect("/dashboard");

  return (
    <div className="flex min-h-full flex-col">
      <DashboardNav showAdmin />
      <main className="mx-auto w-full max-w-3xl flex-1 bg-[var(--sophos-grey-1)] px-4 py-8">
        <div className="mb-8">
          <h1 className="font-heading text-3xl font-light text-[var(--sophos-navy)]">
            Partners
          </h1>
          <p className="text-muted-foreground text-sm">
            Invite partners with a magic-link sign-in. Their sizing links appear
            under All requests with Partner attribution.
          </p>
        </div>
        <InvitePartnerForm />
      </main>
    </div>
  );
}
