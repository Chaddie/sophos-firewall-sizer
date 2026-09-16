"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createInternalSizingRequest } from "@/lib/internal-sizing-actions";

export function CreateInternalSizeForm() {
  const [state, action, pending] = useActionState(
    createInternalSizingRequest,
    null,
  );

  return (
    <form action={action} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="label">Deal / company label</Label>
        <Input
          id="label"
          name="label"
          required
          minLength={2}
          maxLength={120}
          placeholder="Acme HQ refresh (internal)"
        />
        {state?.error?.label && (
          <p className="text-destructive text-xs">{state.error.label.join(", ")}</p>
        )}
      </div>
      <p className="text-muted-foreground text-xs">
        No customer link is created. The result stays private to Sales Engineers
        until you share it from the request page.
      </p>
      <Button type="submit" disabled={pending}>
        {pending ? "Starting…" : "Start internal size"}
      </Button>
    </form>
  );
}
