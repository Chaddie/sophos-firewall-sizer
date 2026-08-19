"use client";

import { useState } from "react";
import Link from "next/link";
import { requestPasswordResetAction } from "@/lib/account-actions";
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

export function ForgotPasswordForm() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [resetUrl, setResetUrl] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    setResetUrl(null);

    const formData = new FormData(e.currentTarget);
    const result = await requestPasswordResetAction({
      email: String(formData.get("email") ?? ""),
    });

    setLoading(false);
    setMessage(result.message);
    if (result.resetUrl) setResetUrl(result.resetUrl);
  }

  return (
    <Card className="w-full border-[var(--sophos-grey-2)] shadow-sm">
      <CardHeader>
        <CardDescription className="text-center">
          Enter your work email and we&apos;ll send a reset link.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {message && (
            <Alert>
              <AlertDescription className="space-y-2">
                <p>{message}</p>
                {resetUrl && (
                  <a
                    href={resetUrl}
                    className="block break-all text-[var(--sophos-blue)] underline-offset-4 hover:underline"
                  >
                    {resetUrl}
                  </a>
                )}
              </AlertDescription>
            </Alert>
          )}
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="email"
            />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Sending…" : "Send reset link"}
          </Button>
        </form>
        <p className="text-muted-foreground mt-6 text-center text-xs">
          <Link
            href="/login"
            className="text-[var(--sophos-blue)] underline-offset-4 hover:underline"
          >
            Back to sign in
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
