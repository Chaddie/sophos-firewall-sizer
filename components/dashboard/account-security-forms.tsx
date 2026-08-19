"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  startRegistration,
  browserSupportsWebAuthn,
} from "@simplewebauthn/browser";
import {
  changePasswordAction,
  deletePasskeyAction,
  listMyPasskeysAction,
} from "@/lib/account-actions";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type PasskeyRow = {
  id: string;
  deviceName: string | null;
  createdAt: Date | string;
};

export function AccountSecurityForms({
  hasPassword,
  initialPasskeys,
}: {
  hasPassword: boolean;
  initialPasskeys: PasskeyRow[];
}) {
  const router = useRouter();
  const [passkeys, setPasskeys] = useState(initialPasskeys);
  const [pwdError, setPwdError] = useState<string | null>(null);
  const [pwdSuccess, setPwdSuccess] = useState<string | null>(null);
  const [pwdLoading, setPwdLoading] = useState(false);
  const [passkeyError, setPasskeyError] = useState<string | null>(null);
  const [passkeyLoading, setPasskeyLoading] = useState(false);
  const [deviceName, setDeviceName] = useState("");

  async function handlePassword(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPwdLoading(true);
    setPwdError(null);
    setPwdSuccess(null);

    const formData = new FormData(e.currentTarget);
    const result = await changePasswordAction({
      currentPassword: String(formData.get("currentPassword") ?? "") || undefined,
      password: String(formData.get("password") ?? ""),
      confirmPassword: String(formData.get("confirmPassword") ?? ""),
    });

    setPwdLoading(false);
    if (!result.ok) {
      setPwdError(result.error);
      return;
    }
    setPwdSuccess("Password updated.");
    e.currentTarget.reset();
    router.refresh();
  }

  async function handleAddPasskey() {
    if (!browserSupportsWebAuthn()) {
      setPasskeyError("This browser does not support passkeys.");
      return;
    }
    setPasskeyLoading(true);
    setPasskeyError(null);
    try {
      const optionsRes = await fetch("/api/passkey/register/options", {
        method: "POST",
      });
      if (!optionsRes.ok) {
        throw new Error("Could not start passkey registration");
      }
      const options = await optionsRes.json();
      const attestation = await startRegistration(options);

      const verifyRes = await fetch("/api/passkey/register/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          response: attestation,
          deviceName: deviceName || "Passkey",
        }),
      });
      const body = await verifyRes.json();
      if (!verifyRes.ok) {
        throw new Error(body.error || "Could not save passkey");
      }

      setDeviceName("");
      const next = await listMyPasskeysAction();
      setPasskeys(next);
      router.refresh();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Passkey registration failed";
      if (
        message.toLowerCase().includes("cancel") ||
        message.toLowerCase().includes("not allowed")
      ) {
        setPasskeyError("Passkey registration was cancelled.");
      } else {
        setPasskeyError(message);
      }
    } finally {
      setPasskeyLoading(false);
    }
  }

  async function handleDelete(id: string) {
    setPasskeyError(null);
    const result = await deletePasskeyAction(id);
    if (!result.ok) {
      setPasskeyError(result.error);
      return;
    }
    setPasskeys((prev) => prev.filter((p) => p.id !== id));
    router.refresh();
  }

  return (
    <div className="space-y-8">
      <section className="space-y-4 rounded-xl border border-[var(--sophos-grey-2)] bg-white p-5 shadow-sm">
        <div>
          <h2 className="font-heading text-xl text-[var(--sophos-navy)]">
            Password
          </h2>
          <p className="text-muted-foreground text-sm">
            {hasPassword
              ? "Change your sign-in password."
              : "Set a password so you can also sign in without a passkey or SSO."}
          </p>
        </div>
        <form onSubmit={handlePassword} className="max-w-md space-y-3">
          {pwdError && (
            <Alert variant="destructive">
              <AlertDescription>{pwdError}</AlertDescription>
            </Alert>
          )}
          {pwdSuccess && (
            <Alert>
              <AlertDescription>{pwdSuccess}</AlertDescription>
            </Alert>
          )}
          {hasPassword && (
            <div className="space-y-1">
              <Label htmlFor="currentPassword">Current password</Label>
              <Input
                id="currentPassword"
                name="currentPassword"
                type="password"
                autoComplete="current-password"
                required
              />
            </div>
          )}
          <div className="space-y-1">
            <Label htmlFor="password">New password</Label>
            <Input
              id="password"
              name="password"
              type="password"
              minLength={8}
              autoComplete="new-password"
              required
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="confirmPassword">Confirm new password</Label>
            <Input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              minLength={8}
              autoComplete="new-password"
              required
            />
          </div>
          <Button type="submit" disabled={pwdLoading}>
            {pwdLoading
              ? "Saving…"
              : hasPassword
                ? "Update password"
                : "Set password"}
          </Button>
        </form>
      </section>

      <section className="space-y-4 rounded-xl border border-[var(--sophos-grey-2)] bg-white p-5 shadow-sm">
        <div>
          <h2 className="font-heading text-xl text-[var(--sophos-navy)]">
            Multi-factor authentication
          </h2>
          <p className="text-muted-foreground text-sm">
            Add a passkey (Face ID, Touch ID, Windows Hello, or a security key)
            for stronger sign-in. Passkeys can replace your password on supported
            devices.
          </p>
        </div>

        {passkeyError && (
          <Alert variant="destructive">
            <AlertDescription>{passkeyError}</AlertDescription>
          </Alert>
        )}

        {passkeys.length === 0 ? (
          <p className="text-muted-foreground text-sm">No passkeys registered yet.</p>
        ) : (
          <ul className="space-y-2">
            {passkeys.map((p) => (
              <li
                key={p.id}
                className="flex items-center justify-between gap-3 rounded-lg border border-[var(--sophos-grey-2)] px-3 py-2 text-sm"
              >
                <div>
                  <p className="font-medium">{p.deviceName || "Passkey"}</p>
                  <p className="text-muted-foreground text-xs">
                    Added{" "}
                    {new Date(p.createdAt).toLocaleDateString(undefined, {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => void handleDelete(p.id)}
                >
                  Remove
                </Button>
              </li>
            ))}
          </ul>
        )}

        <div className="flex max-w-md flex-col gap-2 sm:flex-row sm:items-end">
          <div className="flex-1 space-y-1">
            <Label htmlFor="deviceName">Device name (optional)</Label>
            <Input
              id="deviceName"
              value={deviceName}
              onChange={(e) => setDeviceName(e.target.value)}
              placeholder="MacBook Touch ID"
            />
          </div>
          <Button
            type="button"
            disabled={passkeyLoading}
            onClick={() => void handleAddPasskey()}
          >
            {passkeyLoading ? "Waiting…" : "Add passkey"}
          </Button>
        </div>
      </section>
    </div>
  );
}
