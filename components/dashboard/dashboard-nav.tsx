import { auth } from "@/lib/auth";
import { DashboardNavClient } from "@/components/dashboard/dashboard-nav-client";

export async function DashboardNav({
  showAdmin = false,
  showCatalogAdmin = false,
}: {
  showAdmin?: boolean;
  showCatalogAdmin?: boolean;
}) {
  const session = await auth();

  return (
    <DashboardNavClient
      showAdmin={showAdmin}
      showCatalogAdmin={showCatalogAdmin}
      userName={session?.user?.name ?? null}
      userEmail={session?.user?.email ?? null}
      userRole={session?.user?.role ?? null}
    />
  );
}
