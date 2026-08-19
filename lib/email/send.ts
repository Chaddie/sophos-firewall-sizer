import { isMagicLinkEmailConfigured } from "@/lib/auth/partner-config";

export type SendEmailInput = {
  to: string;
  subject: string;
  html: string;
  text: string;
};

export type SendEmailResult =
  | { ok: true; delivered: true }
  | { ok: true; delivered: false; reason: "not_configured" }
  | { ok: false; error: string };

/**
 * Send transactional email via Resend when configured.
 * Without RESEND_API_KEY + EMAIL_FROM, returns not_configured so callers
 * can surface the magic link in UI for local/demo use.
 */
export async function sendEmail(
  input: SendEmailInput,
): Promise<SendEmailResult> {
  if (!isMagicLinkEmailConfigured()) {
    return { ok: true, delivered: false, reason: "not_configured" };
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: process.env.EMAIL_FROM,
        to: input.to,
        subject: input.subject,
        html: input.html,
        text: input.text,
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      return {
        ok: false,
        error: `Email provider error (${res.status}): ${body.slice(0, 200)}`,
      };
    }

    return { ok: true, delivered: true };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Failed to send email",
    };
  }
}

export function partnerMagicLinkEmail(magicUrl: string): {
  subject: string;
  html: string;
  text: string;
} {
  const subject = "Your Sophos Hardware Sizing partner sign-in link";
  const text = `Sign in to the partner portal:\n\n${magicUrl}\n\nThis link expires in 15 minutes and can only be used once.`;
  const html = `
    <p>Sign in to the Sophos Hardware Sizing partner portal:</p>
    <p><a href="${magicUrl}">${magicUrl}</a></p>
    <p style="color:#666;font-size:13px">This link expires in 15 minutes and can only be used once.</p>
  `.trim();
  return { subject, html, text };
}
