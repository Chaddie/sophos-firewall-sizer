import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Next.js 16 Proxy (formerly middleware).
 *
 * Intentionally does NOT import Auth.js / bcrypt / DB here. Those packages
 * previously crashed Vercel with MIDDLEWARE_INVOCATION_FAILED when bundled
 * into the routing layer. Session cookies are an optimistic gate only —
 * pages and server actions still call `auth()` for real authorization.
 */
function hasSessionCookie(req: NextRequest): boolean {
  return Boolean(
    req.cookies.get("__Secure-authjs.session-token")?.value ||
      req.cookies.get("authjs.session-token")?.value ||
      req.cookies.get("__Secure-next-auth.session-token")?.value ||
      req.cookies.get("next-auth.session-token")?.value,
  );
}

export function proxy(req: NextRequest) {
  try {
    const isLoggedIn = hasSessionCookie(req);
    const path = req.nextUrl.pathname;
    const isDashboard = path.startsWith("/dashboard");
    const isLogin = path.startsWith("/login");
    const isPartner = path === "/partner" || path.startsWith("/partner/");
    const isHome = path === "/";

    if (isHome && isLoggedIn) {
      return NextResponse.redirect(new URL("/dashboard", req.nextUrl));
    }

    if (isDashboard && !isLoggedIn) {
      const loginUrl = new URL("/login", req.nextUrl);
      loginUrl.searchParams.set("callbackUrl", path);
      return NextResponse.redirect(loginUrl);
    }

    if (isLogin && isLoggedIn) {
      return NextResponse.redirect(new URL("/dashboard", req.nextUrl));
    }

    if (isPartner && isLoggedIn && path === "/partner") {
      return NextResponse.redirect(new URL("/dashboard", req.nextUrl));
    }

    return NextResponse.next();
  } catch {
    return NextResponse.next();
  }
}

export const config = {
  matcher: [
    "/",
    "/dashboard/:path*",
    "/login",
    "/login/:path*",
    "/partner",
    "/partner/:path*",
  ],
};
