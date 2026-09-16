"use client";

import { useMemo, useState } from "react";
import { Check, Copy, Mail } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { buildCustomerInviteEmail } from "@/lib/customer-invite-email";
import { cn } from "@/lib/utils";

export type CustomerInviteEmailProps = {
  label: string;
  vanityUrl: string;
  contactEmail: string;
  contactName?: string | null;
  contactDomain?: string | null;
  expiresAt?: Date | string | null;
  senderName?: string | null;
  senderEmail?: string | null;
  /** Compact button row only (header actions). */
  variant?: "card" | "buttons";
};

function resolveExpiresAt(
  expiresAt?: Date | string | null,
): Date | null {
  if (!expiresAt) return null;
  if (expiresAt instanceof Date) return expiresAt;
  const parsed = new Date(expiresAt);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function CustomerInviteEmail({
  label,
  vanityUrl,
  contactEmail,
  contactName,
  contactDomain,
  expiresAt,
  senderName,
  senderEmail,
  variant = "card",
}: CustomerInviteEmailProps) {
  const [copied, setCopied] = useState(false);

  const invite = useMemo(
    () =>
      buildCustomerInviteEmail({
        label,
        vanityUrl,
        contactEmail,
        contactName,
        contactDomain,
        expiresAt: resolveExpiresAt(expiresAt),
        senderName,
        senderEmail,
      }),
    [
      label,
      vanityUrl,
      contactEmail,
      contactName,
      contactDomain,
      expiresAt,
      senderName,
      senderEmail,
    ],
  );

  async function handleCopy() {
    await navigator.clipboard.writeText(invite.body);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const actions = (
    <div className="flex flex-wrap gap-2">
      <a
        href={invite.mailtoUrl}
        className={cn(
          buttonVariants({ size: "sm", variant: "default" }),
          "inline-flex items-center gap-1.5",
        )}
      >
        <Mail className="size-4" />
        Email customer
      </a>
      <Button type="button" size="sm" variant="outline" onClick={handleCopy}>
        {copied ? (
          <>
            <Check className="size-4" />
            Copied
          </>
        ) : (
          <>
            <Copy className="size-4" />
            Copy email
          </>
        )}
      </Button>
    </div>
  );

  if (variant === "buttons") {
    return actions;
  }

  return (
    <Card className="border-[var(--sophos-grey-2)] shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="font-heading text-xl font-light">
          Invite the customer
        </CardTitle>
        <CardDescription>
          Open Outlook with a ready-made message, or copy the email text to
          paste elsewhere. To: {invite.to}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <pre className="max-h-48 overflow-auto whitespace-pre-wrap rounded-md border border-[var(--sophos-grey-2)] bg-[var(--sophos-grey-1)] p-3 text-xs text-[var(--sophos-navy)]">
          {`Subject: ${invite.subject}\n\n${invite.body}`}
        </pre>
        {actions}
      </CardContent>
    </Card>
  );
}
