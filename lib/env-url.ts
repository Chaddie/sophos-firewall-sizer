/**
 * Auth.js and URL helpers require absolute URLs with a scheme. Vercel env
 * values are sometimes pasted as bare hostnames, which throws ERR_INVALID_URL.
 */
export function ensureAbsoluteUrl(
  value: string | undefined,
  fallback?: string,
): string | undefined {
  const raw = value?.trim() || fallback?.trim();
  if (!raw) return undefined;
  if (/^https?:\/\//i.test(raw)) return raw.replace(/\/$/, "");
  return `https://${raw.replace(/\/$/, "")}`;
}

/** Mutate process.env so Auth.js sees a valid AUTH_URL / APP URL. */
export function normalizeAuthEnvUrls(): void {
  const authUrl = ensureAbsoluteUrl(
    process.env.AUTH_URL,
    process.env.VERCEL_ENV === "production"
      ? "https://sophos-firewall-sizer.vercel.app"
      : undefined,
  );
  if (authUrl) process.env.AUTH_URL = authUrl;

  const appUrl = ensureAbsoluteUrl(process.env.NEXT_PUBLIC_APP_URL);
  if (appUrl) process.env.NEXT_PUBLIC_APP_URL = appUrl;
}
