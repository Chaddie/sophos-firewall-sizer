import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import MicrosoftEntraID from "next-auth/providers/microsoft-entra-id";
import type { Provider } from "next-auth/providers";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { authConfig } from "@/lib/auth.config";
import { getDb } from "@/lib/db";
import { demoStore, isDemoMode } from "@/lib/db/demo-store";
import { ensureDemoSeed } from "@/lib/db/demo-seed";
import { users } from "@/lib/db/schema";
import type { UserRole } from "@/lib/sizing/types";
import {
  getMicrosoftEntraIssuer,
  getPublicAuthConfig,
  isCredentialsEnabled,
  isEmailAllowedForSso,
  isMicrosoftEntraConfigured,
  isOidcConfigured,
} from "@/lib/auth/config";
import { resolveSsoUser } from "@/lib/auth/sso-users";
import { consumePartnerMagicLink } from "@/lib/auth/partner-magic-link";
import { consumePasskeyLoginTicket } from "@/lib/auth/passkeys";
import { normalizeAuthEnvUrls } from "@/lib/env-url";

normalizeAuthEnvUrls();

function isPasswordlessProvider(provider?: string | null): boolean {
  return (
    provider === "credentials" ||
    provider === "partner-magic-link" ||
    provider === "passkey"
  );
}

function buildProviders(): Provider[] {
  const providers: Provider[] = [];

  // Always available — used by /partner/verify (not shown on /login).
  providers.push(
    Credentials({
      id: "partner-magic-link",
      name: "Partner magic link",
      credentials: {
        token: { label: "Token", type: "text" },
      },
      async authorize(credentials) {
        const token = credentials?.token;
        if (!token || typeof token !== "string") return null;
        const user = await consumePartnerMagicLink(token);
        if (!user) return null;
        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        };
      },
    }),
  );

  // Passkey login tickets issued after WebAuthn assertion verify.
  providers.push(
    Credentials({
      id: "passkey",
      name: "Passkey",
      credentials: {
        ticket: { label: "Ticket", type: "text" },
      },
      async authorize(credentials) {
        const ticket = credentials?.ticket;
        if (!ticket || typeof ticket !== "string") return null;
        const user = await consumePasskeyLoginTicket(ticket);
        if (!user) return null;
        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        };
      },
    }),
  );

  if (isCredentialsEnabled()) {
    providers.push(
      Credentials({
        id: "credentials",
        name: "credentials",
        credentials: {
          email: { label: "Email", type: "email" },
          password: { label: "Password", type: "password" },
        },
        async authorize(credentials) {
          if (!credentials?.email || !credentials?.password) {
            return null;
          }

          const email = credentials.email as string;
          const password = credentials.password as string;

          if (isDemoMode()) {
            await ensureDemoSeed();
            const user = await demoStore.users.findByEmail(email);
            if (!user?.passwordHash) return null;
            const valid = await bcrypt.compare(password, user.passwordHash);
            if (!valid) return null;
            return {
              id: user.id,
              email: user.email,
              name: user.name,
              role: user.role,
            };
          }

          const [user] = await getDb()
            .select()
            .from(users)
            .where(eq(users.email, email.toLowerCase()))
            .limit(1);

          if (!user?.passwordHash) return null;

          const valid = await bcrypt.compare(password, user.passwordHash);
          if (!valid) return null;

          return {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role as UserRole,
          };
        },
      }),
    );
  }

  if (isMicrosoftEntraConfigured()) {
    const issuer = getMicrosoftEntraIssuer();
    providers.push(
      MicrosoftEntraID({
        clientId: process.env.AUTH_MICROSOFT_ENTRA_ID_ID!,
        clientSecret: process.env.AUTH_MICROSOFT_ENTRA_ID_SECRET!,
        ...(issuer ? { issuer } : {}),
        // Same email can use password today and Microsoft later (or both).
        allowDangerousEmailAccountLinking: true,
      }),
    );
  }

  if (isOidcConfigured()) {
    const displayName = getPublicAuthConfig().oidcDisplayName;
    providers.push({
      id: "oidc",
      name: displayName,
      type: "oidc",
      clientId: process.env.AUTH_OIDC_ID!,
      clientSecret: process.env.AUTH_OIDC_SECRET!,
      issuer: process.env.AUTH_OIDC_ISSUER!,
      allowDangerousEmailAccountLinking: true,
    });
  }

  return providers;
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: buildProviders(),
  callbacks: {
    ...authConfig.callbacks,
    async signIn({ user, account }) {
      if (!account || isPasswordlessProvider(account.provider)) {
        return true;
      }

      const email = user.email?.toLowerCase();
      if (!email) return false;
      if (!isEmailAllowedForSso(email)) return false;

      const resolved = await resolveSsoUser({
        email,
        name: user.name,
      });
      if (!resolved) return false;

      user.id = resolved.id;
      user.name = resolved.name;
      user.role = resolved.role;
      return true;
    },
    async jwt({ token, user, account }) {
      if (user && isPasswordlessProvider(account?.provider)) {
        token.id = user.id;
        token.role = user.role ?? "account_manager";
      }

      // Always map SSO identities to our users table (IdP `sub` is not our UUID).
      if (
        user &&
        account &&
        !isPasswordlessProvider(account.provider) &&
        user.email
      ) {
        const resolved = await resolveSsoUser({
          email: user.email,
          name: user.name,
        });
        if (resolved) {
          token.id = resolved.id;
          token.role = resolved.role;
        }
      }

      // Refresh role from DB so role changes (e.g. promote to admin) apply without a full re-login.
      if (token.id && !isDemoMode()) {
        try {
          const [row] = await getDb()
            .select({ role: users.role })
            .from(users)
            .where(eq(users.id, token.id as string))
            .limit(1);
          if (row) token.role = row.role as UserRole;
        } catch {
          // Keep the role already on the token if the DB is unreachable.
        }
      }

      return token;
    },
  },
});
