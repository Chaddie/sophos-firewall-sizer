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

export function isMicrosoftEntraConfigured(): boolean {
  return Boolean(
    process.env.AUTH_MICROSOFT_ENTRA_ID_ID &&
      process.env.AUTH_MICROSOFT_ENTRA_ID_SECRET,
  );
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
