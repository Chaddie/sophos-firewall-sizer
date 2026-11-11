"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createUserForAdmin } from "@/lib/admin-user-actions";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const ROLES = [
  { value: "account_manager", label: "Account manager" },
  { value: "sales_engineer", label: "Sales engineer" },
  { value: "admin", label: "Admin" },
  { value: "partner", label: "Partner" },
] as const;

export function CreateUserForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    const form = e.currentTarget;
    const formData = new FormData(form);
    const result = await createUserForAdmin({
      name: String(formData.get("name") ?? ""),
      email: String(formData.get("email") ?? ""),
      password: String(formData.get("password") ?? ""),
      role: String(formData.get("role") ?? ""),
    });
    setLoading(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }

    setSuccess(`Created login for ${result.email}.`);
    form.reset();
    router.refresh();
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4 rounded-xl border border-[var(--sophos-grey-2)] bg-white p-4 shadow-sm"
    >
      <div>
        <p className="font-medium text-[var(--sophos-navy)]">Create user</p>
        <p className="text-muted-foreground text-xs">
          Adds a password login. Share the email and temporary password with
          them securely; they can change it from Profile.
        </p>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      {success && (
        <Alert>
          <AlertDescription>{success}</AlertDescription>
        </Alert>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <Label htmlFor="create-user-name">Name</Label>
          <Input
            id="create-user-name"
            name="name"
            type="text"
            required
            autoComplete="off"
            placeholder="Jane Smith"
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="create-user-email">Email</Label>
          <Input
            id="create-user-email"
            name="email"
            type="email"
            required
            autoComplete="off"
            placeholder="jane@company.com"
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="create-user-password">Temporary password</Label>
          <Input
            id="create-user-password"
            name="password"
            type="text"
            required
            minLength={6}
            autoComplete="new-password"
            placeholder="At least 6 characters"
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="create-user-role">Role</Label>
          <select
            id="create-user-role"
            name="role"
            required
            defaultValue="account_manager"
            className="border-input bg-background ring-offset-background focus-visible:ring-ring flex h-9 w-full rounded-md border px-3 py-1 text-sm shadow-xs focus-visible:ring-2 focus-visible:outline-none"
          >
            {ROLES.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <Button type="submit" disabled={loading} size="sm">
        {loading ? "Creating…" : "Create user"}
      </Button>
    </form>
  );
}
