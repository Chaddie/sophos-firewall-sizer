import { redirect } from "next/navigation";
import { DashboardNav } from "@/components/dashboard/dashboard-nav";
import { AccessoryCatalogTable } from "@/components/admin/accessory-catalog-table";
import { FirewallCatalogTable } from "@/components/admin/firewall-catalog-table";
import { SwitchCatalogTable } from "@/components/admin/switch-catalog-table";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getSessionRole } from "@/lib/actions";
import { canAccessCatalogAdmin, hasSePrivileges } from "@/lib/auth-utils";
import {
  getAccessoryCatalog,
  getFirewallCatalog,
  getSwitchCatalog,
} from "@/lib/sizing/catalog-store";

export default async function CatalogAdminPage() {
  const role = await getSessionRole();
  if (!role) redirect("/login");
  if (!canAccessCatalogAdmin(role)) redirect("/dashboard");

  const [firewallModels, switchModels, accessories] = await Promise.all([
    getFirewallCatalog(),
    getSwitchCatalog(),
    getAccessoryCatalog(),
  ]);

  return (
    <div className="flex min-h-full flex-col">
      <DashboardNav
        showAdmin={hasSePrivileges(role)}
        showCatalogAdmin
      />
      <main className="mx-auto w-full max-w-6xl flex-1 space-y-8 bg-[var(--sophos-grey-1)] px-4 py-8">
        <div>
          <h1 className="font-heading text-3xl font-light text-[var(--sophos-navy)]">
            Catalog admin
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Edit the firewall and switch model specs the sizing engine uses,
            including real order SKUs. Import or export CSV for bulk updates.
            Changes take effect immediately for new submissions and don&apos;t
            require a deploy.
          </p>
        </div>

        <Card className="border-[var(--sophos-grey-2)] shadow-sm">
          <CardHeader>
            <CardTitle className="font-heading text-xl font-light">
              Firewall models
            </CardTitle>
            <CardDescription>
              Throughput, VPN, connection limits, and optional redundant PSU
              SKUs used when quoting physical appliances.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <FirewallCatalogTable models={firewallModels} />
          </CardContent>
        </Card>

        <Card className="border-[var(--sophos-grey-2)] shadow-sm">
          <CardHeader>
            <CardTitle className="font-heading text-xl font-light">
              Switch models
            </CardTitle>
            <CardDescription>
              Port counts and PoE budgets used to pick Sophos Switch tiers.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <SwitchCatalogTable models={switchModels} />
          </CardContent>
        </Card>

        <Card className="border-[var(--sophos-grey-2)] shadow-sm">
          <CardHeader>
            <CardTitle className="font-heading text-xl font-light">
              Accessories (SFP+ optics)
            </CardTitle>
            <CardDescription>
              Global SR/LR transceiver SKUs added to firewall quotes when the
              customer asks for Sophos optics.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <AccessoryCatalogTable models={accessories} />
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
