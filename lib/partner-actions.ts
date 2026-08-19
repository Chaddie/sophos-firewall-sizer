"use server";

import { z } from "zod";
import { auth } from "@/lib/auth";
import { hasSePrivileges } from "@/lib/auth-utils";
import { createPartnerMagicLink } from "@/lib/auth/partner-magic-link";
import { isEmailAllowedForPartner } from "@/lib/auth/partner-config";
import { partnerMagicLinkEmail, sendEmail } from "@/lib/email/send";

const requestSchema = z.object({
  email: z.string().email(),
  name: z.string().trim().max(120).optional(),
});

export type RequestPartnerMagicLinkResult =
  | {
      ok: true;
      delivered: boolean;
      /** Present when email was not delivered (local/demo) so the user can continue. */
      magicUrl?: string;
    }
  | { ok: false; error: string };

async function sendPartnerLink(input: {
  email: string;
  name?: string;
  sponsoredById?: string;
}): Promise<RequestPartnerMagicLinkResult> {
  const parsed = requestSchema.safeParse({
    email: input.email,
    name: input.name?.trim() || undefined,
  });
  if (!parsed.success) {
    return { ok: false, error: "Enter a valid email address." };
  }

  const email = parsed.data.email.trim().toLowerCase();
  const name = parsed.data.name;

  if (!isEmailAllowedForPartner(email)) {
    return {
      ok: false,
      error: "That email domain is not allowed for partner access.",
    };
  }

  const { magicUrl } = await createPartnerMagicLink({
    email,
    name,
    sponsoredById: input.sponsoredById,
  });
  const content = partnerMagicLinkEmail(magicUrl);
  const sent = await sendEmail({
    to: email,
    ...content,
  });

  if (!sent.ok) {
    return { ok: false, error: sent.error };
  }

  if (!sent.delivered) {
    return { ok: true, delivered: false, magicUrl };
  }

  return { ok: true, delivered: true };
}

export async function requestPartnerMagicLink(input: {
  email: string;
  name?: string;
}): Promise<RequestPartnerMagicLinkResult> {
  return sendPartnerLink(input);
}

/** SE invites a partner; their account is sponsored by this SE on first sign-in. */
export async function invitePartnerMagicLink(input: {
  email: string;
  name?: string;
}): Promise<RequestPartnerMagicLinkResult> {
  const session = await auth();
  if (!session?.user?.id || !hasSePrivileges(session.user.role)) {
    return { ok: false, error: "Only sales engineers can invite partners." };
  }

  return sendPartnerLink({
    ...input,
    sponsoredById: session.user.id,
  });
}
