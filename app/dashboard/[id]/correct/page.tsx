import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { DashboardNav } from "@/components/dashboard/dashboard-nav";
import { SizingWizard } from "@/components/form/sizing-wizard";
import { getRequestDetail, getSessionRole } from "@/lib/actions";
import {
  answersToSiteFormStates,
} from "@/lib/form/defaults";
import {
  canAccessCatalogAdmin,
  hasSePrivileges,
} from "@/lib/auth-utils";
import { isV2Answers } from "@/lib/sizing/types";

export default async function SeCorrectionPage({
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
  if (!data?.submission) notFound();

  const { request, submission } = data;
  if (!isV2Answers(submission.answers)) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <p className="text-sm text-[var(--sophos-gray)]">
          Legacy single-site submissions cannot be corrected in-app. Ask the
          customer to resubmit on a new link, or recreate the request.
        </p>
        <Link
          href={`/dashboard/${id}`}
          className="mt-4 inline-block text-sm text-[var(--sophos-blue)] underline"
        >
          Back to request
        </Link>
      </div>
    );
  }

  const initialSites = answersToSiteFormStates(submission.answers);

  return (
    <div className="flex min-h-full flex-col">
      <DashboardNav
        showAdmin
        showCatalogAdmin={canAccessCatalogAdmin(role)}
      />
      <SizingWizard
        slug={request.slug}
        label={request.label}
        initialSites={initialSites}
        initialAdditionalNotes={submission.answers.additionalNotes}
        correctionRequestId={request.id}
      />
    </div>
  );
}
