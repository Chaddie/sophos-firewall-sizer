import { redirect } from "next/navigation";
import { DashboardNav } from "@/components/dashboard/dashboard-nav";
import { AccessoryCatalogTable } from "@/components/admin/accessory-catalog-table";
import { CatalogAuditList } from "@/components/admin/catalog-audit-list";
import { CatalogRecomputeButton } from "@/components/admin/catalog-recompute-button";
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
import { listCatalogAudit } from "@/lib/catalog-audit";
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

  const [firewallModels, switchModels, accessories, auditEntries] =
    await Promise.all([
      getFirewallCatalog(),
      getSwitchCatalog(),
      getAccessoryCatalog(),
      listCatalogAudit(40),
    ]);

  return (
    <div className="flex min-h-full flex-col">
      <DashboardNav
        showAdmin={hasSePrivileges(role)}
        showCatalogAdmin
      />
      <main className="mx-auto w-full max-w-6xl flex-1 space-y-8 bg-[var(--sophos-grey-1)] px-4 py-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="font-heading text-3xl font-light text-[var(--sophos-navy)]">
              Catalog admin
            </h1>
            <p className="text-muted-foreground mt-1 text-sm">
              Edit firewall and switch specs (admin only), including order SKUs.
              New submissions use the latest catalog immediately. Use
              &quot;Recalculate open BOMs&quot; to refresh active submitted
              deals after SKU or spec changes.
            </p>
          </div>
          <CatalogRecomputeButton />
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

        <CatalogAuditList entries={auditEntries} />
      </main>
    </div>
  );
}
