"use client";

import { type ReactNode, useEffect, useState } from "react";
import { AppHeader } from "@/components/brand/app-header";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { verifyRequestAccess } from "@/lib/actions";

function sessionKey(slug: string) {
  return `sizing-gate-verified:${slug}`;
}

export function EmailGate({
  slug,
  hasGate,
  children,
}: {
  slug: string;
  hasGate: boolean;
  children: ReactNode;
}) {
  const [verified, setVerified] = useState(!hasGate);
  const [checkedSession, setCheckedSession] = useState(!hasGate);
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!hasGate) return;
    try {
      if (sessionStorage.getItem(sessionKey(slug)) === "true") {
        setVerified(true);
      }
    } finally {
      setCheckedSession(true);
    }
  }, [hasGate, slug]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const result = await verifyRequestAccess(slug, email);
    if (result?.success) {
      try {
        sessionStorage.setItem(sessionKey(slug), "true");
      } catch {
        // sessionStorage unavailable — verification still applies for this render
      }
      setVerified(true);
    } else {
      setError(result?.error ?? "That email doesn't match what we have on file.");
    }
    setSubmitting(false);
  }

  if (!checkedSession) {
    return null;
  }

  if (verified) {
    return <>{children}</>;
  }

  return (
    <>
      <AppHeader />
      <div className="mx-auto flex max-w-md flex-1 flex-col justify-center px-4 py-16">
        <Card>
          <CardHeader>
            <CardTitle className="font-heading text-2xl font-light text-[var(--sophos-navy)]">
              Confirm your email
            </CardTitle>
            <CardDescription>
              To open this sizing questionnaire, please enter your work email
              address. It must match the company domain this link was sent
              to.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="gate-email">Email address</Label>
                <Input
                  id="gate-email"
                  type="email"
                  autoFocus
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@company.com"
                />
              </div>
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting ? "Checking…" : "Continue"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
