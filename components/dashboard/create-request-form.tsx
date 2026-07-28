"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createSizingRequest } from "@/lib/actions";
import { slugify } from "@/lib/app-url";

export function CreateRequestForm() {
  const [label, setLabel] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [state, formAction, pending] = useActionState(createSizingRequest, null);

  function handleLabelChange(value: string) {
    setLabel(value);
    if (!slugTouched) {
      setSlug(slugify(value));
    }
  }

  return (
    <form action={formAction} className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="label">Customer / company label (optional)</Label>
        <Input
          id="label"
          name="label"
          value={label}
          onChange={(e) => handleLabelChange(e.target.value)}
          placeholder="Acme Corp"
        />
        <p className="text-muted-foreground text-xs">
          Shown to the customer on the sizing form.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="slug">Vanity URL slug</Label>
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground text-sm">/r/</span>
          <Input
            id="slug"
            name="slug"
            value={slug}
            onChange={(e) => {
              setSlugTouched(true);
              setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""));
            }}
            required
            placeholder="acme-corp-jul2026"
          />
        </div>
        {state?.error?.slug && (
          <p className="text-destructive text-xs">{state.error.slug.join(", ")}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="expiresAt">Link expiry (optional)</Label>
        <Input id="expiresAt" name="expiresAt" type="datetime-local" />
      </div>

      <Button type="submit" disabled={pending || !slug}>
        {pending ? "Creating…" : "Create sizing link"}
      </Button>
    </form>
  );
}
