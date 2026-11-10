import { Suspense } from "react";
import { AppHeader } from "@/components/brand/app-header";
import { LoginForm } from "@/components/dashboard/login-form";
import { getPublicAuthConfig } from "@/lib/auth/config";
import { sophosBrand } from "@/lib/brand";

export default function LoginPage() {
  const authConfig = getPublicAuthConfig();

  return (
    <>
      <AppHeader />
      <div className="flex flex-1 items-center justify-center bg-[var(--sophos-grey-1)] px-4 py-16">
        <div className="w-full max-w-md space-y-6">
          <div className="text-center">
            <p className="text-sm font-medium tracking-[0.2em] text-[var(--sophos-grey-4)] uppercase">
              {sophosBrand.tagline}
            </p>
            <h1 className="font-heading mt-2 text-3xl">Presales sign in</h1>
            <p className="mt-3 text-xs leading-relaxed text-[var(--sophos-grey-4)]">
              Unofficial project by a Sales Engineering team member — not
              affiliated with Sophos officially. Intended as an experimental
              scoping tool.
            </p>
          </div>
          <Suspense>
            <LoginForm authConfig={authConfig} />
          </Suspense>
        </div>
      </div>
    </>
  );
}
