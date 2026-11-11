import { redirect } from "next/navigation";
import { CreateUserForm } from "@/components/admin/create-user-form";
import { EntraSsoSetupCard } from "@/components/admin/entra-sso-setup-card";
import { DashboardNav } from "@/components/dashboard/dashboard-nav";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getSessionRole } from "@/lib/actions";
import {
  listUsersForAdmin,
  roleDisplayLabel,
} from "@/lib/admin-users";
import { getMicrosoftEntraSetupInfo } from "@/lib/auth/config";
import { canAccessCatalogAdmin, hasSePrivileges } from "@/lib/auth-utils";
import { getAppUrl } from "@/lib/app-url";

function formatDate(value: Date | null): string {
  if (!value) return "—";
  return value.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function signInMethods(hasPassword: boolean, passkeyCount: number): string {
  const parts: string[] = [];
  if (hasPassword) parts.push("Password");
  if (passkeyCount > 0) {
    parts.push(passkeyCount === 1 ? "1 passkey" : `${passkeyCount} passkeys`);
  }
  if (parts.length === 0) return "SSO / magic link";
  return parts.join(" · ");
}

export default async function AdminUsersPage() {
  const role = await getSessionRole();
  if (!role) redirect("/login");
  if (!canAccessCatalogAdmin(role)) redirect("/dashboard");

  const users = await listUsersForAdmin();
  const entraSetup = getMicrosoftEntraSetupInfo(getAppUrl());

  return (
    <div className="flex min-h-full flex-col">
      <DashboardNav
        showAdmin={hasSePrivileges(role)}
        showCatalogAdmin
      />
      <main className="mx-auto w-full max-w-5xl flex-1 space-y-6 bg-[var(--sophos-grey-1)] px-4 py-8">
        <div>
          <h1 className="font-heading text-3xl font-light text-[var(--sophos-navy)]">
            Users
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Accounts that can sign in to this app ({users.length}).
          </p>
        </div>

        <EntraSsoSetupCard info={entraSetup} />

        <CreateUserForm />

        <Card className="border-[var(--sophos-grey-2)] shadow-sm">
          <CardHeader>
            <CardTitle className="font-heading text-xl font-light">
              Login accounts
            </CardTitle>
            <CardDescription>
              Includes account managers, sales engineers, admins, and partners.
              Password and passkey columns reflect local credentials; SSO or
              magic-link users may have neither.
            </CardDescription>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            {users.length === 0 ? (
              <p className="text-muted-foreground text-sm">No users found.</p>
            ) : (
              <table className="w-full min-w-[40rem] border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-[var(--sophos-grey-2)] text-xs uppercase tracking-wide text-[var(--sophos-grey-4)]">
                    <th className="py-2 pr-4 font-medium">Name</th>
                    <th className="py-2 pr-4 font-medium">Email</th>
                    <th className="py-2 pr-4 font-medium">Role</th>
                    <th className="py-2 pr-4 font-medium">Sign-in</th>
                    <th className="py-2 pr-4 font-medium">Sponsored by</th>
                    <th className="py-2 font-medium">Created</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr
                      key={u.id}
                      className="border-b border-[var(--sophos-grey-2)]/80 last:border-0"
                    >
                      <td className="py-3 pr-4 font-medium text-[var(--sophos-navy)]">
                        {u.name}
                      </td>
                      <td className="py-3 pr-4 text-[var(--sophos-gray)]">
                        {u.email}
                      </td>
                      <td className="py-3 pr-4">
                        <span className="inline-flex rounded-full border border-[var(--sophos-grey-2)] bg-white px-2.5 py-0.5 text-xs text-[var(--sophos-navy)]">
                          {roleDisplayLabel(u.role)}
                        </span>
                      </td>
                      <td className="py-3 pr-4 text-[var(--sophos-gray)]">
                        {signInMethods(u.hasPassword, u.passkeyCount)}
                      </td>
                      <td className="py-3 pr-4 text-[var(--sophos-gray)]">
                        {u.sponsoredByEmail ?? "—"}
                      </td>
                      <td className="py-3 whitespace-nowrap text-[var(--sophos-gray)]">
                        {formatDate(u.createdAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
