export type CustomerInviteEmailInput = {
  label: string;
  vanityUrl: string;
  contactEmail: string;
  contactName?: string | null;
  contactDomain?: string | null;
  expiresAt?: Date | null;
  senderName?: string | null;
  senderEmail?: string | null;
};

export type CustomerInviteEmail = {
  to: string;
  subject: string;
  body: string;
  mailtoUrl: string;
};

export function buildCustomerInviteEmail(
  input: CustomerInviteEmailInput,
): CustomerInviteEmail {
  const greetingName = input.contactName?.trim() || "there";
  const domain =
    input.contactDomain?.trim() ||
    input.contactEmail.split("@")[1]?.trim() ||
    null;
  const sender =
    input.senderName?.trim() ||
    input.senderEmail?.trim() ||
    "your Sophos account team";

  const lines = [
    `Hi ${greetingName},`,
    "",
    `Please complete the Sophos sizing questionnaire for ${input.label}:`,
    input.vanityUrl,
    "",
  ];

  if (domain) {
    lines.push(
      `Anyone with an @${domain} email can open the link. It takes about 10–15 minutes and autosaves as you go.`,
    );
  } else {
    lines.push(
      "It takes about 10–15 minutes and autosaves as you go.",
    );
  }

  if (input.expiresAt) {
    lines.push(
      "",
      `Please complete it before ${input.expiresAt.toLocaleString()}.`,
    );
  }

  lines.push("", "Thanks,", sender);

  const to = input.contactEmail.trim();
  const subject = `Sophos sizing questionnaire — ${input.label}`;
  const body = lines.join("\n");
  const mailtoUrl = `mailto:${to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

  return { to, subject, body, mailtoUrl };
}
