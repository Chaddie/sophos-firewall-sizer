import { redirect } from "next/navigation";
import { DashboardNav } from "@/components/dashboard/dashboard-nav";
import { AccountSecurityForms } from "@/components/dashboard/account-security-forms";
import { getAccountSecurityState } from "@/lib/account-actions";
import { getSessionRole } from "@/lib/actions";
import { isSalesEngineer } from "@/lib/auth-utils";

export default async function ProfilePage() {
  const [role, state] = await Promise.all([
    getSessionRole(),
    getAccountSecurityState(),
  ]);

  if (!state) redirect("/login");

  return (
    <div className="flex min-h-full flex-col">
      <DashboardNav showAdmin={isSalesEngineer(role)} />
      <main className="mx-auto w-full max-w-3xl flex-1 bg-[var(--sophos-grey-1)] px-4 py-8">
        <div className="mb-8">
          <h1 className="font-heading text-3xl font-light text-[var(--sophos-navy)]">
            Profile
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            {state.name} · {state.email}
          </p>
          <p className="text-muted-foreground mt-2 text-sm">
            Manage your password and multi-factor authentication (passkeys).
          </p>
        </div>
        <AccountSecurityForms
          hasPassword={state.hasPassword}
          initialPasskeys={state.passkeys}
        />
      </main>
    </div>
  );
}
