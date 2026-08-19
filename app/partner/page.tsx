import { redirect } from "next/navigation";
import { AppHeader } from "@/components/brand/app-header";
import { PartnerMagicLinkForm } from "@/components/partner/partner-magic-link-form";
import { auth } from "@/lib/auth";
import { sophosBrand } from "@/lib/brand";

export default async function PartnerPage() {
  const session = await auth();
  if (session?.user?.id) {
    redirect("/dashboard");
  }

  return (
    <>
      <AppHeader />
      <div className="flex flex-1 items-center justify-center bg-[var(--sophos-grey-1)] px-4 py-16">
        <div className="w-full max-w-md space-y-6">
          <div className="text-center">
            <p className="text-sm font-medium tracking-[0.2em] text-[var(--sophos-grey-4)] uppercase">
              {sophosBrand.tagline}
            </p>
            <h1 className="font-heading mt-2 text-3xl">Partner access</h1>
            <p className="text-muted-foreground mt-2 text-sm">
              No password required — we email you a secure link.
            </p>
          </div>
          <PartnerMagicLinkForm />
        </div>
      </div>
    </>
  );
}
