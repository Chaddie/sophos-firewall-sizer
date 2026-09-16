"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { shareInternalRequestAction } from "@/lib/internal-sizing-actions";

export function ShareInternalRequestButton({
  requestId,
}: {
  requestId: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function share() {
    setLoading(true);
    setError(null);
    const result = await shareInternalRequestAction(requestId);
    setLoading(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    router.refresh();
  }

  return (
    <div className="space-y-1">
      <Button type="button" size="sm" onClick={share} disabled={loading}>
        {loading ? "Sharing…" : "Share with account team"}
      </Button>
      {error && <p className="text-destructive text-xs">{error}</p>}
    </div>
  );
}
