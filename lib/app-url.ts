/**
 * Stable Vercel project alias. Prefer this over VERCEL_PROJECT_PRODUCTION_URL,
 * which switches to a custom domain once one is attached and breaks passkeys /
 * Auth when users go back to *.vercel.app.
 */
export const PRODUCTION_APP_ORIGIN =
  "https://sophos-firewall-sizer.vercel.app";

function stripTrailingSlash(url: string): string {
  return url.replace(/\/$/, "");
}

/** Unique per-deploy hosts like project-abc123-team.vercel.app */
function isEphemeralVercelDeployHost(url: string): boolean {
  try {
    const host = new URL(url).hostname;
    return (
      host.endsWith(".vercel.app") &&
      host !== "sophos-firewall-sizer.vercel.app"
    );
  } catch {
    return false;
  }
}

export function getAppUrl() {
  const configured = process.env.NEXT_PUBLIC_APP_URL
    ? stripTrailingSlash(process.env.NEXT_PUBLIC_APP_URL)
    : "";

  // Local / explicit localhost always wins.
  if (configured.includes("localhost") || configured.includes("127.0.0.1")) {
    return configured;
  }

  // Production: pin to the stable Vercel project alias. A custom domain left in
  // NEXT_PUBLIC_APP_URL / VERCEL_PROJECT_PRODUCTION_URL must not override this
  // while the app is used on *.vercel.app again.
  if (process.env.VERCEL_ENV === "production") {
    return PRODUCTION_APP_ORIGIN;
  }

  if (configured && !isEphemeralVercelDeployHost(configured)) {
    return configured;
  }

  // Preview: unique deployment URL is correct for share links.
  if (process.env.VERCEL_URL) {
    return `https://${stripTrailingSlash(process.env.VERCEL_URL)}`;
  }

  return configured || "http://localhost:3000";
}

export function buildVanityUrl(slug: string) {
  return `${getAppUrl()}/r/${slug}`;
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
}
