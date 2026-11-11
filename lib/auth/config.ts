/**
 * Public + server auth feature flags. SSO providers are opt-in via env so
 * credentials login keeps working until an IdP is configured.
 */

export type PublicAuthConfig = {
  credentialsEnabled: boolean;
  microsoftEntraEnabled: boolean;
  oidcEnabled: boolean;
  /** Display name for the generic OIDC button (e.g. "Okta", "Ping"). */
  oidcDisplayName: string;
};

function envFlag(value: string | undefined, defaultValue: boolean): boolean {
  if (value === undefined || value === "") return defaultValue;
  return !["0", "false", "no", "off"].includes(value.toLowerCase());
}

export function isCredentialsEnabled(): boolean {
  return envFlag(process.env.AUTH_ALLOW_CREDENTIALS, true);
}

/**
 * Optional tenant-scoped issuer. Prefer AUTH_MICROSOFT_ENTRA_ID_ISSUER; or set
 * AUTH_MICROSOFT_ENTRA_ID_TENANT_ID and we build the v2.0 issuer URL.
 * If neither is set, Auth.js defaults to the "common" multi-tenant endpoint.
 */
export function getMicrosoftEntraIssuer(): string | undefined {
  const issuer = process.env.AUTH_MICROSOFT_ENTRA_ID_ISSUER?.trim();
  if (issuer) return issuer.replace(/\/+$/, "");

  const tenant = process.env.AUTH_MICROSOFT_ENTRA_ID_TENANT_ID?.trim();
  if (tenant) {
    return `https://login.microsoftonline.com/${tenant}/v2.0`;
  }
  return undefined;
}

export function isMicrosoftEntraConfigured(): boolean {
  return Boolean(
    process.env.AUTH_MICROSOFT_ENTRA_ID_ID?.trim() &&
      process.env.AUTH_MICROSOFT_ENTRA_ID_SECRET?.trim(),
  );
}

/** Values admins need when registering the Entra app (safe to show in UI). */
export function getMicrosoftEntraSetupInfo(appOrigin: string): {
  configured: boolean;
  callbackUrl: string;
  issuerConfigured: boolean;
  issuer: string | null;
  allowedDomains: string[];
  defaultRole: "account_manager" | "sales_engineer";
  seEmailCount: number;
} {
  const origin = appOrigin.replace(/\/$/, "");
  return {
    configured: isMicrosoftEntraConfigured(),
    callbackUrl: `${origin}/api/auth/callback/microsoft-entra-id`,
    issuerConfigured: Boolean(getMicrosoftEntraIssuer()),
    issuer: getMicrosoftEntraIssuer() ?? null,
    allowedDomains: getSsoAllowedDomains(),
    defaultRole: getSsoDefaultRole(),
    seEmailCount: getSsoSeEmails().size,
  };
}

export function isOidcConfigured(): boolean {
  return Boolean(
    process.env.AUTH_OIDC_ID &&
      process.env.AUTH_OIDC_SECRET &&
      process.env.AUTH_OIDC_ISSUER,
  );
}

export function getPublicAuthConfig(): PublicAuthConfig {
  return {
    credentialsEnabled: isCredentialsEnabled(),
    microsoftEntraEnabled: isMicrosoftEntraConfigured(),
    oidcEnabled: isOidcConfigured(),
    oidcDisplayName: process.env.AUTH_OIDC_NAME?.trim() || "Company SSO",
  };
}

/** Comma-separated email domains allowed to sign in via SSO (empty = any). */
export function getSsoAllowedDomains(): string[] {
  const raw = process.env.AUTH_SSO_ALLOWED_DOMAINS ?? "";
  return raw
    .split(",")
    .map((d) => d.trim().toLowerCase())
    .filter(Boolean);
}

export function isEmailAllowedForSso(email: string): boolean {
  const domains = getSsoAllowedDomains();
  if (domains.length === 0) return true;
  const domain = email.split("@")[1]?.toLowerCase();
  return Boolean(domain && domains.includes(domain));
}

/**
 * Optional allowlist of emails that receive sales_engineer on first SSO login.
 * Everyone else defaults to AUTH_SSO_DEFAULT_ROLE (account_manager).
 */
export function getSsoSeEmails(): Set<string> {
  const raw = process.env.AUTH_SSO_SE_EMAILS ?? "";
  return new Set(
    raw
      .split(",")
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean),
  );
}

export function getSsoDefaultRole(): "account_manager" | "sales_engineer" {
  const role = process.env.AUTH_SSO_DEFAULT_ROLE?.trim().toLowerCase();
  return role === "sales_engineer" ? "sales_engineer" : "account_manager";
}
