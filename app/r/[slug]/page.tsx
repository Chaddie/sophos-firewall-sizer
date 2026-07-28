import { notFound } from "next/navigation";
import Link from "next/link";
import { SizingWizard } from "@/components/form/sizing-wizard";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { getPublicRequest } from "@/lib/actions";

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
      <div className="mx-auto max-w-lg px-4 py-16">
        <Alert variant="destructive">
          <AlertTitle>Link expired</AlertTitle>
          <AlertDescription>
            This sizing link is no longer accepting submissions. Please contact
            your account team for a new link.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (request.status === "submitted") {
    return (
      <div className="mx-auto max-w-lg space-y-4 px-4 py-16 text-center">
        <h1 className="text-2xl font-semibold">Already submitted</h1>
        <p className="text-muted-foreground">
          Thank you — your firewall sizing questionnaire has already been
          submitted. Your account team will be in touch with recommendations.
        </p>
        <Link href={`/r/${slug}/thanks`}>
          <Button variant="outline">View confirmation</Button>
        </Link>
      </div>
    );
  }

  return <SizingWizard slug={slug} label={request.label} />;
}
