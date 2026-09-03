"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { recomputeOpenSubmissionBomsAction } from "@/lib/catalog-recompute";

export function CatalogRecomputeButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function run() {
    if (
      !window.confirm(
        "Recalculate BOMs for all active submitted deals from their stored answers? Prior versions will be archived.",
      )
    ) {
      return;
    }
    setLoading(true);
    setMessage(null);
    const result = await recomputeOpenSubmissionBomsAction();
    setLoading(false);
    if (!result.ok) {
      setMessage(result.error);
      return;
    }
    setMessage(
      `Updated ${result.updated} submission(s); skipped ${result.skipped}.`,
    );
    router.refresh();
  }

  return (
    <div className="space-y-2">
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={loading}
        onClick={() => void run()}
      >
        {loading ? "Recalculating…" : "Recalculate open BOMs"}
      </Button>
      {message && (
        <p className="text-muted-foreground text-xs">{message}</p>
      )}
    </div>
  );
}
