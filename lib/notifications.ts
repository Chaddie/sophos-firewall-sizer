import { getAppUrl } from "@/lib/app-url";
import { sendEmail } from "@/lib/email/send";

export function submissionNotifyEmail(input: {
  label: string;
  slug: string;
  requestId: string;
}): { subject: string; html: string; text: string } {
  const url = `${getAppUrl()}/dashboard/${input.requestId}`;
  const subject = `Sizing submitted: ${input.label}`;
  const text = `The customer has submitted the sizing questionnaire for "${input.label}".\n\nOpen results: ${url}\n`;
  const html = `
    <p>The customer has submitted the sizing questionnaire for <strong>${input.label}</strong>.</p>
    <p><a href="${url}">Open results</a></p>
  `.trim();
  return { subject, html, text };
}

export async function notifyCreatorOfSubmission(input: {
  toEmail: string;
  label: string;
  slug: string;
  requestId: string;
}) {
  const content = submissionNotifyEmail(input);
  return sendEmail({ to: input.toEmail, ...content });
}
