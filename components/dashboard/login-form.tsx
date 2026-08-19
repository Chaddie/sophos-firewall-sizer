"use client";

import { useEffect, useState } from "react";
import {
  startAuthentication,
  browserSupportsWebAuthn,
} from "@simplewebauthn/browser";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
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
import type { PublicAuthConfig } from "@/lib/auth/config";

type LoginFormProps = {
  authConfig: PublicAuthConfig;
};

export function LoginForm({ authConfig }: LoginFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") ?? "/dashboard";
  const errorParam = searchParams.get("error");
  const [error, setError] = useState<string | null>(
    errorParam === "AccessDenied"
      ? "Your account is not allowed to sign in with SSO. Ask an admin to allow your email domain."
      : errorParam
        ? "Sign-in failed. Try again or use another method."
        : null,
  );
  const [loading, setLoading] = useState(false);
  const [passkeyLoading, setPasskeyLoading] = useState(false);
  const [ssoLoading, setSsoLoading] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [passkeySupported, setPasskeySupported] = useState(false);

  useEffect(() => {
    setPasskeySupported(browserSupportsWebAuthn());
  }, []);

  const hasSso =
    authConfig.microsoftEntraEnabled || authConfig.oidcEnabled;

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const result = await signIn("credentials", {
      email: formData.get("email"),
      password: formData.get("password"),
      redirect: false,
    });

    setLoading(false);

    if (result?.error) {
      setError("Invalid email or password");
      return;
    }

    router.push(callbackUrl);
    router.refresh();
  }

  async function handleSso(providerId: string) {
    setSsoLoading(providerId);
    setError(null);
    await signIn(providerId, { callbackUrl });
  }

  async function handlePasskey() {
    setPasskeyLoading(true);
    setError(null);
    try {
      const optionsRes = await fetch("/api/passkey/login/options", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email || undefined }),
      });
      if (!optionsRes.ok) {
        throw new Error("Could not start passkey sign-in");
      }
      const options = await optionsRes.json();
      const assertion = await startAuthentication(options);

      const verifyRes = await fetch("/api/passkey/login/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ response: assertion }),
      });
      const verifyBody = await verifyRes.json();
      if (!verifyRes.ok) {
        throw new Error(verifyBody.error || "Passkey verification failed");
      }

      const result = await signIn("passkey", {
        ticket: verifyBody.ticket,
        redirect: false,
      });
      if (result?.error) {
        throw new Error("Could not create session");
      }

      router.push(callbackUrl);
      router.refresh();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Passkey sign-in failed";
      if (
        message.toLowerCase().includes("cancel") ||
        message.toLowerCase().includes("not allowed")
      ) {
        setError("Passkey sign-in was cancelled.");
      } else {
        setError(message);
      }
    } finally {
      setPasskeyLoading(false);
    }
  }

  return (
    <Card className="w-full border-[var(--sophos-grey-2)] shadow-sm">
      <CardHeader>
        <CardDescription className="text-center">
          Sign in to create sizing links and view customer submissions.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {authConfig.microsoftEntraEnabled && (
          <Button
            type="button"
            variant="outline"
            className="w-full"
            disabled={ssoLoading !== null || passkeyLoading}
            onClick={() => handleSso("microsoft-entra-id")}
          >
            {ssoLoading === "microsoft-entra-id"
              ? "Redirecting…"
              : "Continue with Microsoft"}
          </Button>
        )}

        {authConfig.oidcEnabled && (
          <Button
            type="button"
            variant="outline"
            className="w-full"
            disabled={ssoLoading !== null || passkeyLoading}
            onClick={() => handleSso("oidc")}
          >
            {ssoLoading === "oidc"
              ? "Redirecting…"
              : `Continue with ${authConfig.oidcDisplayName}`}
          </Button>
        )}

        {passkeySupported && (
          <Button
            type="button"
            variant="outline"
            className="w-full"
            disabled={passkeyLoading || ssoLoading !== null}
            onClick={() => void handlePasskey()}
          >
            {passkeyLoading ? "Waiting for passkey…" : "Sign in with passkey"}
          </Button>
        )}

        {(hasSso || passkeySupported) && authConfig.credentialsEnabled && (
          <div className="relative py-1">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-[var(--sophos-grey-2)]" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card text-muted-foreground px-2">or</span>
            </div>
          </div>
        )}

        {authConfig.credentialsEnabled && (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                required
                autoComplete="email username webauthn"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                <Link
                  href="/login/forgot"
                  className="text-xs text-[var(--sophos-blue)] underline-offset-4 hover:underline"
                >
                  Forgot password?
                </Link>
              </div>
              <Input
                id="password"
                name="password"
                type="password"
                required
                autoComplete="current-password"
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Signing in…" : "Sign in"}
            </Button>
          </form>
        )}

        {!authConfig.credentialsEnabled && !hasSso && !passkeySupported && (
          <p className="text-muted-foreground text-center text-sm">
            No sign-in methods are configured.
          </p>
        )}

        <p className="text-muted-foreground mt-6 text-center text-xs">
          Partner?{" "}
          <Link
            href="/partner"
            className="text-[var(--sophos-blue)] underline-offset-4 hover:underline"
          >
            Request a magic link
          </Link>
          {" · "}
          <Link
            href="/"
            className="text-[var(--sophos-blue)] underline-offset-4 hover:underline"
          >
            Back to home
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
