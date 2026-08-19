import { AppHeader } from "@/components/brand/app-header";
import { ResetPasswordForm } from "@/components/auth/reset-password-form";
import { sophosBrand } from "@/lib/brand";

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const params = await searchParams;

  return (
    <>
      <AppHeader />
      <div className="flex flex-1 items-center justify-center bg-[var(--sophos-grey-1)] px-4 py-16">
        <div className="w-full max-w-md space-y-6">
          <div className="text-center">
            <p className="text-sm font-medium tracking-[0.2em] text-[var(--sophos-grey-4)] uppercase">
              {sophosBrand.tagline}
            </p>
            <h1 className="font-heading mt-2 text-3xl">Choose a new password</h1>
          </div>
          <ResetPasswordForm token={params.token ?? ""} />
        </div>
      </div>
    </>
  );
}
