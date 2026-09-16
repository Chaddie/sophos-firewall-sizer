import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { DashboardNav } from "@/components/dashboard/dashboard-nav";
import { SizingWizard } from "@/components/form/sizing-wizard";
import { getRequestDetail, getSessionRole } from "@/lib/actions";
import {
  canAccessCatalogAdmin,
  hasSePrivileges,
} from "@/lib/auth-utils";

export default async function InternalSizeWizardPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [data, role] = await Promise.all([
    getRequestDetail(id),
    getSessionRole(),
  ]);

  if (!role || !hasSePrivileges(role)) redirect("/dashboard");
  if (!data) notFound();

  const { request, submission } = data;
  if (request.source !== "internal") {
    redirect(`/dashboard/${id}`);
  }
  if (submission) {
    redirect(`/dashboard/${id}`);
  }

  return (
    <div className="flex min-h-full flex-col">
      <DashboardNav
        showAdmin
        showCatalogAdmin={canAccessCatalogAdmin(role)}
      />
      <div className="bg-[var(--sophos-grey-1)] px-4 pt-4">
        <Link
          href={`/dashboard/${id}`}
          className="text-sm text-[var(--sophos-blue)] underline"
        >
          Back to request
        </Link>
      </div>
      <SizingWizard
        slug={request.slug}
        label={request.label}
        internalRequestId={request.id}
      />
    </div>
  );
}
