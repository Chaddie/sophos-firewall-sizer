"use client";

import { Suspense, useEffect, useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { AppHeader } from "@/components/brand/app-header";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

function PartnerVerifyInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!token || done) return;

    let cancelled = false;

    async function verify() {
      const result = await signIn("partner-magic-link", {
        token,
        redirect: false,
      });

      if (cancelled) return;

      if (result?.error) {
        setError(
          "This sign-in link is invalid or has expired. Request a new one.",
        );
        return;
      }

      setDone(true);
      router.replace("/dashboard");
      router.refresh();
    }

    void verify();

    return () => {
      cancelled = true;
    };
  }, [token, done, router]);

  return (
    <div className="w-full max-w-md space-y-4 text-center">
      {!token && (
        <Alert variant="destructive">
          <AlertDescription>
            Missing sign-in token.{" "}
            <Link href="/partner" className="underline underline-offset-4">
              Request a new link
            </Link>
          </AlertDescription>
        </Alert>
      )}
      {token && !error && (
        <p className="text-muted-foreground text-sm">Signing you in…</p>
      )}
      {error && (
        <>
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
          <Link href="/partner">
            <Button variant="outline">Back to partner access</Button>
          </Link>
        </>
      )}
    </div>
  );
}

export default function PartnerVerifyPage() {
  return (
    <>
      <AppHeader />
      <div className="flex flex-1 items-center justify-center bg-[var(--sophos-grey-1)] px-4 py-16">
        <Suspense
          fallback={
            <p className="text-muted-foreground text-sm">Signing you in…</p>
          }
        >
          <PartnerVerifyInner />
        </Suspense>
      </div>
    </>
  );
}
