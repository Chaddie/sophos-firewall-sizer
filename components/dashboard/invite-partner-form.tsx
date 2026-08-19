"use client";

import { useState } from "react";
import { invitePartnerMagicLink } from "@/lib/partner-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";

export function InvitePartnerForm() {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [devMagicUrl, setDevMagicUrl] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);
    setDevMagicUrl(null);

    const formData = new FormData(e.currentTarget);
    const email = String(formData.get("email") ?? "");
    const name = String(formData.get("name") ?? "");

    const result = await invitePartnerMagicLink({ email, name });
    setLoading(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }

    setSuccess(
      result.delivered
        ? `Invite sent to ${email}. Their links will show as Partner on your dashboard.`
        : `Invite created for ${email} (email not configured — share the link below).`,
    );
    if (result.magicUrl) setDevMagicUrl(result.magicUrl);
    e.currentTarget.reset();
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-3 rounded-xl border border-[var(--sophos-grey-2)] bg-white p-4 shadow-sm"
    >
      <div>
        <p className="font-medium text-[var(--sophos-navy)]">Invite a partner</p>
        <p className="text-muted-foreground text-xs">
          They get a magic-link sign-in. You&apos;ll see their sizing links
          attributed as Partner.
        </p>
      </div>
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      {success && (
        <Alert>
          <AlertDescription className="space-y-2">
            <p>{success}</p>
            {devMagicUrl && (
              <a
                href={devMagicUrl}
                className="block break-all text-[var(--sophos-blue)] underline-offset-4 hover:underline"
              >
                {devMagicUrl}
              </a>
            )}
          </AlertDescription>
        </Alert>
      )}
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <Label htmlFor="invite-name">Name</Label>
          <Input id="invite-name" name="name" type="text" placeholder="Optional" />
        </div>
        <div className="space-y-1">
          <Label htmlFor="invite-email">Email</Label>
          <Input
            id="invite-email"
            name="email"
            type="email"
            required
            placeholder="partner@company.com"
          />
        </div>
      </div>
      <Button type="submit" disabled={loading} size="sm">
        {loading ? "Sending…" : "Send partner invite"}
      </Button>
    </form>
  );
}
