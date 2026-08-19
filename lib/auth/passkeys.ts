import { createHash, randomBytes } from "crypto";
import {
  generateAuthenticationOptions,
  generateRegistrationOptions,
  verifyAuthenticationResponse,
  verifyRegistrationResponse,
} from "@simplewebauthn/server";
import type {
  AuthenticationResponseJSON,
  AuthenticatorTransportFuture,
  RegistrationResponseJSON,
} from "@simplewebauthn/types";
import { and, eq, gt, isNotNull, isNull } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { demoStore, isDemoMode } from "@/lib/db/demo-store";
import {
  passkeyLoginTickets,
  passkeys,
  users,
  webauthnChallenges,
} from "@/lib/db/schema";
import type { UserRole } from "@/lib/sizing/types";
import {
  fromBase64Url,
  getWebAuthnConfig,
  toBase64Url,
} from "@/lib/auth/webauthn-config";

const CHALLENGE_TTL_MS = 5 * 60 * 1000;
const TICKET_TTL_MS = 2 * 60 * 1000;

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function parseClientChallenge(
  response: RegistrationResponseJSON | AuthenticationResponseJSON,
): string {
  const clientData = JSON.parse(
    Buffer.from(response.response.clientDataJSON, "base64url").toString("utf8"),
  ) as { challenge: string };
  return clientData.challenge;
}

async function saveChallenge(input: {
  challenge: string;
  userId?: string | null;
  purpose: "registration" | "authentication";
}) {
  const expiresAt = new Date(Date.now() + CHALLENGE_TTL_MS);
  if (isDemoMode()) {
    await demoStore.webauthnChallenges.create({
      challenge: input.challenge,
      userId: input.userId ?? null,
      purpose: input.purpose,
      expiresAt,
    });
    return;
  }
  await getDb().insert(webauthnChallenges).values({
    challenge: input.challenge,
    userId: input.userId ?? null,
    purpose: input.purpose,
    expiresAt,
  });
}

async function peekChallenge(
  challenge: string,
  purpose: "registration" | "authentication",
  userId?: string,
): Promise<{ challenge: string; userId: string | null }> {
  const now = new Date();
  if (isDemoMode()) {
    const row = await demoStore.webauthnChallenges.findValid(
      challenge,
      purpose,
      now,
    );
    if (!row) throw new Error("Challenge not found");
    if (userId && row.userId && row.userId !== userId) {
      throw new Error("Challenge user mismatch");
    }
    return { challenge: row.challenge, userId: row.userId };
  }

  const [row] = await getDb()
    .select()
    .from(webauthnChallenges)
    .where(
      and(
        eq(webauthnChallenges.challenge, challenge),
        eq(webauthnChallenges.purpose, purpose),
        gt(webauthnChallenges.expiresAt, now),
      ),
    )
    .limit(1);
  if (!row) throw new Error("Challenge not found");
  if (userId && row.userId && row.userId !== userId) {
    throw new Error("Challenge user mismatch");
  }
  return { challenge: row.challenge, userId: row.userId };
}

async function consumeChallenge(
  challenge: string,
  purpose: "registration" | "authentication",
) {
  if (isDemoMode()) {
    const row = await demoStore.webauthnChallenges.findValid(
      challenge,
      purpose,
      new Date(),
    );
    if (row) await demoStore.webauthnChallenges.delete(row.id);
    return;
  }
  await getDb()
    .delete(webauthnChallenges)
    .where(
      and(
        eq(webauthnChallenges.challenge, challenge),
        eq(webauthnChallenges.purpose, purpose),
      ),
    );
}

async function listPasskeysForUser(userId: string) {
  if (isDemoMode()) {
    return demoStore.passkeys.listByUser(userId);
  }
  return getDb().select().from(passkeys).where(eq(passkeys.userId, userId));
}

export async function getPasskeysForUser(userId: string) {
  const rows = await listPasskeysForUser(userId);
  return rows.map((p) => ({
    id: p.id,
    deviceName: p.deviceName,
    createdAt: p.createdAt,
  }));
}

export async function createRegistrationOptions(user: {
  id: string;
  email: string;
  name: string;
}) {
  const { rpID, rpName } = getWebAuthnConfig();
  const existing = await listPasskeysForUser(user.id);

  const options = await generateRegistrationOptions({
    rpName,
    rpID,
    userID: user.id,
    userName: user.email,
    userDisplayName: user.name,
    attestationType: "none",
    excludeCredentials: existing.map((p) => ({
      id: fromBase64Url(p.credentialId),
      type: "public-key",
      transports: p.transports
        ? (JSON.parse(p.transports) as AuthenticatorTransportFuture[])
        : undefined,
    })),
    authenticatorSelection: {
      residentKey: "preferred",
      userVerification: "preferred",
    },
  });

  await saveChallenge({
    challenge: options.challenge,
    userId: user.id,
    purpose: "registration",
  });

  return options;
}

export async function verifyAndStoreRegistration(
  userId: string,
  response: RegistrationResponseJSON,
  deviceName?: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { rpID, origin } = getWebAuthnConfig();

  let expectedChallenge: string;
  try {
    const peeked = await peekChallenge(
      parseClientChallenge(response),
      "registration",
      userId,
    );
    expectedChallenge = peeked.challenge;
  } catch {
    return { ok: false, error: "Registration challenge expired. Try again." };
  }

  let verification;
  try {
    verification = await verifyRegistrationResponse({
      response,
      expectedChallenge,
      expectedOrigin: origin,
      expectedRPID: rpID,
    });
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Passkey registration failed.",
    };
  }

  if (!verification.verified || !verification.registrationInfo) {
    return { ok: false, error: "Passkey registration could not be verified." };
  }

  await consumeChallenge(expectedChallenge, "registration");

  const { credentialID, credentialPublicKey, counter } =
    verification.registrationInfo;
  const credentialId = toBase64Url(credentialID);
  const publicKey = toBase64Url(credentialPublicKey);
  const transports = response.response.transports
    ? JSON.stringify(response.response.transports)
    : null;

  if (isDemoMode()) {
    await demoStore.passkeys.create({
      userId,
      credentialId,
      publicKey,
      counter,
      transports,
      deviceName: deviceName?.trim() || "Passkey",
    });
  } else {
    await getDb().insert(passkeys).values({
      userId,
      credentialId,
      publicKey,
      counter,
      transports,
      deviceName: deviceName?.trim() || "Passkey",
    });
  }

  return { ok: true };
}

export async function createAuthenticationOptions(email?: string) {
  const { rpID } = getWebAuthnConfig();
  let allowCredentials:
    | {
        id: Uint8Array;
        type: "public-key";
        transports?: AuthenticatorTransportFuture[];
      }[]
    | undefined;
  let userId: string | null = null;

  if (email?.trim()) {
    const normalized = email.trim().toLowerCase();
    if (isDemoMode()) {
      const user = await demoStore.users.findByEmail(normalized);
      if (user) {
        userId = user.id;
        const creds = await demoStore.passkeys.listByUser(user.id);
        allowCredentials = creds.map((p) => ({
          id: fromBase64Url(p.credentialId),
          type: "public-key" as const,
          transports: p.transports
            ? (JSON.parse(p.transports) as AuthenticatorTransportFuture[])
            : undefined,
        }));
      }
    } else {
      const [user] = await getDb()
        .select()
        .from(users)
        .where(eq(users.email, normalized))
        .limit(1);
      if (user) {
        userId = user.id;
        const creds = await getDb()
          .select()
          .from(passkeys)
          .where(eq(passkeys.userId, user.id));
        allowCredentials = creds.map((p) => ({
          id: fromBase64Url(p.credentialId),
          type: "public-key" as const,
          transports: p.transports
            ? (JSON.parse(p.transports) as AuthenticatorTransportFuture[])
            : undefined,
        }));
      }
    }
  }

  const options = await generateAuthenticationOptions({
    rpID,
    userVerification: "preferred",
    allowCredentials:
      allowCredentials && allowCredentials.length > 0
        ? allowCredentials
        : undefined,
  });

  await saveChallenge({
    challenge: options.challenge,
    userId,
    purpose: "authentication",
  });

  return options;
}

export async function verifyAuthenticationAndIssueTicket(
  response: AuthenticationResponseJSON,
): Promise<{ ok: true; ticket: string } | { ok: false; error: string }> {
  const { rpID, origin } = getWebAuthnConfig();

  let expectedChallenge: string;
  try {
    const peeked = await peekChallenge(
      parseClientChallenge(response),
      "authentication",
    );
    expectedChallenge = peeked.challenge;
  } catch {
    return { ok: false, error: "Sign-in challenge expired. Try again." };
  }

  const credentialId = response.id;
  let passkeyRow:
    | {
        id: string;
        userId: string;
        credentialId: string;
        publicKey: string;
        counter: number;
        transports: string | null;
      }
    | null = null;

  if (isDemoMode()) {
    passkeyRow = await demoStore.passkeys.findByCredentialId(credentialId);
  } else {
    const [row] = await getDb()
      .select()
      .from(passkeys)
      .where(eq(passkeys.credentialId, credentialId))
      .limit(1);
    passkeyRow = row ?? null;
  }

  if (!passkeyRow) {
    return { ok: false, error: "Unknown passkey." };
  }

  let verification;
  try {
    verification = await verifyAuthenticationResponse({
      response,
      expectedChallenge,
      expectedOrigin: origin,
      expectedRPID: rpID,
      authenticator: {
        credentialID: fromBase64Url(passkeyRow.credentialId),
        credentialPublicKey: fromBase64Url(passkeyRow.publicKey),
        counter: passkeyRow.counter,
        transports: passkeyRow.transports
          ? (JSON.parse(passkeyRow.transports) as AuthenticatorTransportFuture[])
          : undefined,
      },
    });
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Passkey sign-in failed.",
    };
  }

  if (!verification.verified) {
    return { ok: false, error: "Passkey sign-in could not be verified." };
  }

  await consumeChallenge(expectedChallenge, "authentication");

  const newCounter = verification.authenticationInfo.newCounter;
  if (isDemoMode()) {
    await demoStore.passkeys.updateCounter(passkeyRow.id, newCounter);
  } else {
    await getDb()
      .update(passkeys)
      .set({ counter: newCounter })
      .where(eq(passkeys.id, passkeyRow.id));
  }

  const ticket = randomBytes(32).toString("hex");
  const tokenHash = hashToken(ticket);
  const expiresAt = new Date(Date.now() + TICKET_TTL_MS);

  if (isDemoMode()) {
    await demoStore.passkeyLoginTickets.create({
      userId: passkeyRow.userId,
      tokenHash,
      expiresAt,
    });
  } else {
    await getDb().insert(passkeyLoginTickets).values({
      userId: passkeyRow.userId,
      tokenHash,
      expiresAt,
    });
  }

  return { ok: true, ticket };
}

export async function consumePasskeyLoginTicket(ticket: string): Promise<{
  id: string;
  email: string;
  name: string;
  role: UserRole;
} | null> {
  const tokenHash = hashToken(ticket);
  const now = new Date();
  const recentlyUsedCutoff = new Date(now.getTime() - 2 * 60 * 1000);

  if (isDemoMode()) {
    let row = await demoStore.passkeyLoginTickets.findValid(tokenHash, now);
    if (row) {
      await demoStore.passkeyLoginTickets.markUsed(row.id);
    } else {
      row = await demoStore.passkeyLoginTickets.findRecentlyUsed(
        tokenHash,
        recentlyUsedCutoff,
      );
      if (!row) return null;
    }
    const user = await demoStore.users.findById(row.userId);
    if (!user) return null;
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    };
  }

  const [fresh] = await getDb()
    .select()
    .from(passkeyLoginTickets)
    .where(
      and(
        eq(passkeyLoginTickets.tokenHash, tokenHash),
        isNull(passkeyLoginTickets.usedAt),
        gt(passkeyLoginTickets.expiresAt, now),
      ),
    )
    .limit(1);

  let userId: string | null = null;
  if (fresh) {
    await getDb()
      .update(passkeyLoginTickets)
      .set({ usedAt: now })
      .where(eq(passkeyLoginTickets.id, fresh.id));
    userId = fresh.userId;
  } else {
    const [recent] = await getDb()
      .select()
      .from(passkeyLoginTickets)
      .where(
        and(
          eq(passkeyLoginTickets.tokenHash, tokenHash),
          isNotNull(passkeyLoginTickets.usedAt),
          gt(passkeyLoginTickets.usedAt, recentlyUsedCutoff),
        ),
      )
      .limit(1);
    if (!recent) return null;
    userId = recent.userId;
  }

  const [user] = await getDb()
    .select()
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  if (!user) return null;

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role as UserRole,
  };
}

export async function deletePasskeyForUser(
  userId: string,
  passkeyId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (isDemoMode()) {
    const ok = await demoStore.passkeys.deleteForUser(userId, passkeyId);
    return ok ? { ok: true } : { ok: false, error: "Passkey not found." };
  }

  const result = await getDb()
    .delete(passkeys)
    .where(and(eq(passkeys.id, passkeyId), eq(passkeys.userId, userId)))
    .returning({ id: passkeys.id });

  if (result.length === 0) {
    return { ok: false, error: "Passkey not found." };
  }
  return { ok: true };
}
