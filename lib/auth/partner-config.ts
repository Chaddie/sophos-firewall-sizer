/**
 * Partner portal allowlists and helpers.
 */

function parseList(raw: string | undefined): string[] {
  return (raw ?? "")
    .split(",")
    .map((d) => d.trim().toLowerCase())
    .filter(Boolean);
}

/** Comma-separated domains allowed for /partner magic links. Empty = any. */
export function getPartnerAllowedDomains(): string[] {
  return parseList(process.env.AUTH_PARTNER_ALLOWED_DOMAINS);
}

export function isEmailAllowedForPartner(email: string): boolean {
  const domains = getPartnerAllowedDomains();
  if (domains.length === 0) return true;
  const domain = email.split("@")[1]?.toLowerCase();
  return Boolean(domain && domains.includes(domain));
}

export function isMagicLinkEmailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_FROM);
}
