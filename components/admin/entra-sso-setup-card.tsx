import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { getMicrosoftEntraSetupInfo } from "@/lib/auth/config";
import { roleDisplayLabel } from "@/lib/admin-users";

type SetupInfo = ReturnType<typeof getMicrosoftEntraSetupInfo>;

export function EntraSsoSetupCard({ info }: { info: SetupInfo }) {
  return (
    <Card className="border-[var(--sophos-grey-2)] shadow-sm">
      <CardHeader>
        <CardTitle className="font-heading text-xl font-light">
          Microsoft Entra ID (SSO)
        </CardTitle>
        <CardDescription>
          App code is ready. Register an Entra app, then set the env vars on
          Vercel and redeploy. See{" "}
          <code className="text-xs">docs/entra-sso.md</code> in the repo.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[var(--sophos-grey-4)]">Status:</span>
          <span
            className={
              info.configured
                ? "rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-xs text-emerald-800"
                : "rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-xs text-amber-900"
            }
          >
            {info.configured
              ? "Configured — Microsoft button on /login"
              : "Not configured — password / passkey only"}
          </span>
        </div>

        <div className="space-y-1">
          <p className="text-xs font-medium tracking-wide text-[var(--sophos-grey-4)] uppercase">
            Redirect URI (paste into Entra → Web)
          </p>
          <code className="block break-all rounded-md border border-[var(--sophos-grey-2)] bg-[var(--sophos-grey-1)] px-3 py-2 text-xs text-[var(--sophos-navy)]">
            {info.callbackUrl}
          </code>
        </div>

        <ul className="text-muted-foreground list-disc space-y-1 pl-5 text-xs">
          <li>
            Issuer:{" "}
            {info.issuerConfigured
              ? info.issuer
              : "not set (Auth.js uses multi-tenant “common”)"}
          </li>
          <li>
            Allowed SSO domains:{" "}
            {info.allowedDomains.length > 0
              ? info.allowedDomains.join(", ")
              : "any (recommended: sophos.com)"}
          </li>
          <li>
            New SSO users default role: {roleDisplayLabel(info.defaultRole)}
            {info.seEmailCount > 0
              ? ` · ${info.seEmailCount} email(s) force SE on first login`
              : ""}
          </li>
          <li>
            Required env:{" "}
            <code>AUTH_MICROSOFT_ENTRA_ID_ID</code>,{" "}
            <code>AUTH_MICROSOFT_ENTRA_ID_SECRET</code>, and issuer or{" "}
            <code>AUTH_MICROSOFT_ENTRA_ID_TENANT_ID</code>
          </li>
        </ul>
      </CardContent>
    </Card>
  );
}
