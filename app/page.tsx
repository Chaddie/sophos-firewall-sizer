import Link from "next/link";
import { auth } from "@/lib/auth";
import { isDemoMode } from "@/lib/db/demo-store";
import { sophosBrand } from "@/lib/brand";
import { AppHeader } from "@/components/brand/app-header";
import { SophosLogo } from "@/components/brand/sophos-logo";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default async function HomePage() {
  const session = await auth();
  const demoMode = isDemoMode();

  return (
    <>
      <AppHeader />
      <div className="relative flex flex-1 flex-col overflow-hidden">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,var(--sophos-blue)_0%,transparent_45%),radial-gradient(circle_at_bottom_left,var(--sophos-turquoise)_0%,transparent_35%)] opacity-[0.07]"
        />
        <div className="relative mx-auto flex w-full max-w-3xl flex-1 flex-col items-center justify-center px-4 py-16">
          <div className="w-full max-w-xl space-y-8 text-center">
            {demoMode && (
              <Alert className="border-[var(--sophos-grey-2)] bg-[var(--sophos-grey-1)] text-left">
                <AlertDescription>
                  Running in demo mode (in-memory data). Account manager:{" "}
                  <strong>admin@example.com</strong> /{" "}
                  <strong>changeme123</strong>. Sales engineer:{" "}
                  <strong>se@example.com</strong> /{" "}
                  <strong>changeme123</strong>. Try the customer form at{" "}
                  <Link
                    href="/r/demo-review"
                    className="font-medium text-[var(--sophos-blue)] underline-offset-4 hover:underline"
                  >
                    /r/demo-review
                  </Link>
                  .
                </AlertDescription>
              </Alert>
            )}

            <div className="space-y-4">
              <SophosLogo
                href={undefined}
                priority
                className="mx-auto h-5 w-auto"
              />
              <p className="text-sm font-medium tracking-[0.2em] text-[var(--sophos-grey-4)] uppercase">
                {sophosBrand.tagline}
              </p>
              <h1 className="font-heading text-4xl leading-tight sm:text-5xl">
                Sophos Hardware Sizing
              </h1>
              <p className="text-base leading-relaxed text-[var(--sophos-gray)]">
                Send customers a simple questionnaire and get appliance
                recommendations on your dashboard — no spreadsheet
                back-and-forth.
              </p>
            </div>

            <div className="flex flex-col justify-center gap-3 sm:flex-row">
              {session ? (
                <Link href="/dashboard">
                  <Button size="lg" className="min-w-44">
                    Go to dashboard
                  </Button>
                </Link>
              ) : (
                <Link href="/login">
                  <Button size="lg" className="min-w-44">
                    Presales sign in
                  </Button>
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
