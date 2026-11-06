import { getAppUrl, PRODUCTION_APP_ORIGIN } from "@/lib/app-url";

function tryOrigin(value: string | null | undefined): string | null {
  if (!value?.trim()) return null;
  try {
    const u = new URL(value.trim());
    if (u.protocol === "https:" || u.protocol === "http:") return u.origin;
  } catch {
    /* ignore */
  }
  return null;
}

function originFromHost(
  host: string | null | undefined,
  protoHint?: string | null,
): string | null {
  const h = host?.split(",")[0]?.trim();
  if (!h) return null;
  const proto =
    protoHint?.split(",")[0]?.trim() ||
    (h.startsWith("localhost") || h.startsWith("127.") ? "http" : "https");
  return tryOrigin(`${proto}://${h}`);
}

/** Origins we always accept for WebAuthn on this project. */
function configuredOrigins(): string[] {
  const out: string[] = [];
  const add = (o: string | null) => {
    if (o && !out.includes(o)) out.push(o);
  };
  add(PRODUCTION_APP_ORIGIN);
  add(tryOrigin(process.env.NEXT_PUBLIC_APP_URL));
  add(tryOrigin(process.env.AUTH_URL));
  add(tryOrigin(getAppUrl()));
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    add(tryOrigin(`https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`));
  }
  if (process.env.VERCEL_URL) {
    add(tryOrigin(`https://${process.env.VERCEL_URL}`));
  }
  return out;
}

/**
 * Prefer the browser Origin so passkeys match the host the user is on.
 * Fall back to the stable Vercel project alias (not a unique deploy host).
 */
export function resolveRequestOrigin(request?: Request): string {
  if (request) {
    const fromOrigin = tryOrigin(request.headers.get("origin"));
    if (fromOrigin) return fromOrigin;

    const fromReferer = tryOrigin(request.headers.get("referer"));
    if (fromReferer) return fromReferer;

    const fromForwarded = originFromHost(
      request.headers.get("x-forwarded-host"),
      request.headers.get("x-forwarded-proto"),
    );
    if (fromForwarded) return fromForwarded;

    const fromHost = originFromHost(
      request.headers.get("host"),
      request.headers.get("x-forwarded-proto"),
    );
    if (fromHost) return fromHost;
  }

  return getAppUrl();
}

export function getWebAuthnConfig(request?: Request) {
  const primary = resolveRequestOrigin(request);
  const url = new URL(primary);
  const expectedOrigins = [primary, ...configuredOrigins()].filter(
    (o, i, arr) => arr.indexOf(o) === i,
  );

  // rpID must be the hostname of the page the user is on. If the browser is on
  // the stable alias, never use a custom domain or unique deploy host as rpID.
  let rpID = url.hostname;
  if (
    primary === PRODUCTION_APP_ORIGIN ||
    url.hostname === "sophos-firewall-sizer.vercel.app"
  ) {
    rpID = "sophos-firewall-sizer.vercel.app";
  }

  return {
    rpID,
    rpName: "Sophos Hardware Sizing",
    origin: primary,
    expectedOrigins,
  };
}

export function toBase64Url(data: Uint8Array): string {
  return Buffer.from(data).toString("base64url");
}

export function fromBase64Url(value: string): Uint8Array {
  return new Uint8Array(Buffer.from(value, "base64url"));
}
