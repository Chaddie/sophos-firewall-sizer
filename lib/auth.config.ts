import type { NextAuthConfig } from "next-auth";
import type { UserRole } from "@/lib/sizing/types";

/**
 * Edge / proxy-safe Auth.js config. Must not import bcrypt, Drizzle, Neon,
 * WebAuthn, or any Node-only modules — those live in `lib/auth.ts`.
 */
export const authConfig = {
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
  },
  trustHost: true,
  // Providers are registered in lib/auth.ts (Node runtime).
  providers: [],
  callbacks: {
    async session({ session, token }) {
      if (session.user && token.id) {
        session.user.id = token.id as string;
        session.user.role = (token.role as UserRole) ?? "account_manager";
      }
      return session;
    },
  },
} satisfies NextAuthConfig;
