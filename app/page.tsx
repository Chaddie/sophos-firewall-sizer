import Link from "next/link";
import { auth } from "@/lib/auth";
import { Button } from "@/components/ui/button";

export default async function HomePage() {
  const session = await auth();

  return (
    <div className="flex flex-1 flex-col items-center justify-center px-4 py-16">
      <div className="max-w-lg space-y-6 text-center">
        <div className="space-y-2">
          <p className="text-primary text-sm font-medium tracking-wide uppercase">
            Sophos
          </p>
          <h1 className="text-3xl font-semibold tracking-tight">
            Firewall Sizing
          </h1>
          <p className="text-muted-foreground">
            Send customers a simple questionnaire and get appliance
            recommendations on your dashboard — no spreadsheet back-and-forth.
          </p>
        </div>
        <div className="flex flex-col justify-center gap-3 sm:flex-row">
          {session ? (
            <Link href="/dashboard">
              <Button>Go to dashboard</Button>
            </Link>
          ) : (
            <Link href="/login">
              <Button>Presales sign in</Button>
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
