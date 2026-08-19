"use client";

import { useState } from "react";
import Link from "next/link";
import { requestPartnerMagicLink } from "@/lib/partner-actions";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";

export function PartnerMagicLinkForm() {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [devMagicUrl, setDevMagicUrl] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSentTo(null);
    setDevMagicUrl(null);

    const formData = new FormData(e.currentTarget);
    const email = String(formData.get("email") ?? "");
    const name = String(formData.get("name") ?? "");

    const result = await requestPartnerMagicLink({ email, name });
    setLoading(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }

    setSentTo(email);
    if (result.magicUrl) setDevMagicUrl(result.magicUrl);
  }

  if (sentTo) {
    return (
      <Card className="w-full border-[var(--sophos-grey-2)] shadow-sm">
        <CardHeader>
          <CardDescription className="text-center text-base text-[var(--sophos-navy)]">
            {devMagicUrl
              ? "Email delivery is not configured — use the link below."
              : `Check ${sentTo} for your sign-in link.`}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {devMagicUrl ? (
            <Alert>
              <AlertDescription className="break-all text-sm">
                <a
                  href={devMagicUrl}
                  className="text-[var(--sophos-blue)] underline-offset-4 hover:underline"
                >
                  {devMagicUrl}
                </a>
              </AlertDescription>
            </Alert>
          ) : (
            <p className="text-muted-foreground text-center text-sm">
              The link expires in 15 minutes and can only be used once.
            </p>
          )}
          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={() => {
              setSentTo(null);
              setDevMagicUrl(null);
            }}
          >
            Use a different email
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full border-[var(--sophos-grey-2)] shadow-sm">
      <CardHeader>
        <CardDescription className="text-center">
          Enter your work email to get a one-time sign-in link. You can create
          sizing links and return later to see customer results.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          <div className="space-y-2">
            <Label htmlFor="name">Your name</Label>
            <Input
              id="name"
              name="name"
              type="text"
              autoComplete="name"
              placeholder="Alex Partner"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Work email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="email"
            />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Sending link…" : "Email me a sign-in link"}
          </Button>
        </form>
        <p className="text-muted-foreground mt-6 text-center text-xs">
          Sophos staff?{" "}
          <Link
            href="/login"
            className="text-[var(--sophos-blue)] underline-offset-4 hover:underline"
          >
            Presales sign in
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
