import { notFound } from "next/navigation";
import Link from "next/link";
import { SizingWizard } from "@/components/form/sizing-wizard";
import { AppHeader } from "@/components/brand/app-header";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { getPublicRequest } from "@/lib/actions";

function BrandedMessagePage({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <>
      <AppHeader />
      <div className="mx-auto flex max-w-lg flex-1 flex-col justify-center gap-4 px-4 py-16 text-center">
        <h1 className="font-heading text-3xl font-light text-[var(--sophos-navy)]">
          {title}
        </h1>
        <p className="text-[var(--sophos-gray)]">{description}</p>
        {action}
      </div>
    </>
  );
}

export default async function PublicFormPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const request = await getPublicRequest(slug);

  if (!request) notFound();

  const expired =
    request.expiresAt !== null && request.expiresAt < new Date();

  if (expired) {
    return (
      <>
        <AppHeader />
        <div className="mx-auto max-w-lg flex-1 px-4 py-16">
          <Alert variant="destructive">
            <AlertTitle>Link expired</AlertTitle>
            <AlertDescription>
              This sizing link is no longer accepting submissions. Please contact
              your account team for a new link.
            </AlertDescription>
          </Alert>
        </div>
      </>
    );
  }

  if (request.status === "submitted") {
    return (
      <BrandedMessagePage
        title="Already submitted"
        description="Thank you — your firewall sizing questionnaire has already been submitted. Your account team will be in touch with recommendations."
        action={
          <Link href={`/r/${slug}/thanks`}>
            <Button variant="outline">View confirmation</Button>
          </Link>
        }
      />
    );
  }

  return <SizingWizard slug={slug} label={request.label} />;
}
