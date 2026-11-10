import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import { authConfig } from "@/lib/auth.config";

/**
 * Next.js 16 Proxy (formerly middleware). Uses the edge-safe Auth.js config
 * so Node-only deps (bcrypt, Drizzle, WebAuthn) are not bundled here.
 */
const { auth } = NextAuth(authConfig);

export default auth((req) => {
  const isLoggedIn = !!req.auth;
  const path = req.nextUrl.pathname;
  const isDashboard = path.startsWith("/dashboard");
  const isLogin = path.startsWith("/login");
  const isPartner = path === "/partner" || path.startsWith("/partner/");
  const isHome = path === "/";

  if (isHome && isLoggedIn) {
    return NextResponse.redirect(new URL("/dashboard", req.nextUrl.origin));
  }

  if (isDashboard && !isLoggedIn) {
    const loginUrl = new URL("/login", req.nextUrl.origin);
    loginUrl.searchParams.set("callbackUrl", path);
    return NextResponse.redirect(loginUrl);
  }

  if (isLogin && isLoggedIn) {
    return NextResponse.redirect(new URL("/dashboard", req.nextUrl.origin));
  }

  if (isPartner && isLoggedIn && path === "/partner") {
    return NextResponse.redirect(new URL("/dashboard", req.nextUrl.origin));
  }

  return NextResponse.next();
});

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
