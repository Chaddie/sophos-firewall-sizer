"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  addSeReviewNoteAction,
  archiveRequestAction,
  flagRequestForSeAction,
  reopenForResubmitAction,
  setReviewStatusAction,
  unarchiveRequestAction,
  updateOpportunityIdAction,
} from "@/lib/request-actions";
import {
  formatSeReviewNotePrefix,
  resolveReviewNotes,
} from "@/lib/sizing/review-notes";
import type { SeReviewNote } from "@/lib/sizing/types";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function RequestWorkflowPanel({
  requestId,
  isSe,
  isAdmin,
  status,
  reviewStatus,
  reviewNote,
  reviewNotes,
  flaggedNote,
  opportunityId,
  archivedAt,
  reviewedAt,
  reviewedById,
  hasSubmission = false,
}: {
  requestId: string;
  isSe: boolean;
  isAdmin: boolean;
  status: "pending" | "submitted";
  reviewStatus: string | null;
  reviewNote: string | null;
  reviewNotes: SeReviewNote[] | null;
  flaggedNote: string | null;
  opportunityId: string | null;
  archivedAt: Date | string | null;
  reviewedAt?: Date | string | null;
  reviewedById?: string | null;
  hasSubmission?: boolean;
}) {
  const router = useRouter();
  const [note, setNote] = useState("");
  const [opp, setOpp] = useState(opportunityId ?? "");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const archived = Boolean(archivedAt);
  const notes = resolveReviewNotes({
    reviewNotes,
    reviewNote,
    reviewedAt,
    reviewedById,
  });
  const awaitingResubmit = status === "pending" && hasSubmission;

  async function flag() {
    setLoading(true);
    setError(null);
    const result = await flagRequestForSeAction(requestId, note);
    setLoading(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setNote("");
    router.refresh();
  }

  async function setReview(next: "reviewed" | "needs_changes") {
    setLoading(true);
    setError(null);
    const result = await setReviewStatusAction(requestId, next, note);
    setLoading(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setNote("");
    router.refresh();
  }

  async function addNote() {
    setLoading(true);
    setError(null);
    const result = await addSeReviewNoteAction(requestId, note);
    setLoading(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setNote("");
    router.refresh();
  }

  async function reopen() {
    setLoading(true);
    setError(null);
    const result = await reopenForResubmitAction(requestId, note);
    setLoading(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setNote("");
    router.refresh();
  }

  async function saveOpp() {
    setLoading(true);
    setError(null);
    const result = await updateOpportunityIdAction(requestId, opp);
    setLoading(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    router.refresh();
  }

  async function archive() {
    setLoading(true);
    setError(null);
    const result = await archiveRequestAction(requestId);
    setLoading(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    router.refresh();
  }

  async function unarchive() {
    setLoading(true);
    setError(null);
    const result = await unarchiveRequestAction(requestId);
    setLoading(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    router.refresh();
  }

  const reviewLabel =
    reviewStatus === "flagged"
      ? "Pending SE Review"
      : reviewStatus === "reviewed"
        ? "Reviewed by SE"
        : reviewStatus === "needs_changes"
          ? "Needs changes"
          : null;

  return (
    <div className="space-y-4 rounded-xl border border-[var(--sophos-grey-2)] bg-white p-4 shadow-sm">
      <div>
        <h2 className="font-heading text-lg text-[var(--sophos-navy)]">
          Quote handoff
        </h2>
        {reviewLabel && (
          <p className="text-muted-foreground mt-1 text-xs">
            Status: {reviewLabel}
            {flaggedNote ? ` — ${flaggedNote}` : ""}
          </p>
        )}
        {awaitingResubmit && (
          <p className="mt-1 text-xs font-medium text-amber-800">
            Link reopened for customer resubmit — previous BOM stays visible
            until they submit again.
          </p>
        )}
        {archived && (
          <p className="mt-1 text-xs font-medium text-amber-800">
            Archived — hidden from the default request list.
          </p>
        )}
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="flex flex-wrap items-end gap-2">
        <div className="min-w-[220px] flex-1 space-y-1">
          <Label htmlFor="opportunityId">Opportunity / deal ID</Label>
          <Input
            id="opportunityId"
            value={opp}
            onChange={(e) => setOpp(e.target.value)}
            placeholder="SFDC opportunity ID or URL"
          />
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={loading}
          onClick={() => void saveOpp()}
        >
          Save
        </Button>
      </div>

      {notes.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium text-[var(--sophos-navy)]">
            SE review notes
          </p>
          <ul className="space-y-2">
            {notes.map((entry) => (
              <li
                key={entry.id}
                className="rounded-md border border-[var(--sophos-grey-2)] bg-[var(--sophos-grey-1)] px-3 py-2 text-sm"
              >
                <p className="text-muted-foreground text-xs">
                  {formatSeReviewNotePrefix(entry)}
                </p>
                <p className="mt-1 whitespace-pre-wrap text-[var(--sophos-navy)]">
                  {entry.body}
                </p>
              </li>
            ))}
          </ul>
        </div>
      )}

      {status === "submitted" && !archived && (
        <div className="space-y-2">
          <Label htmlFor="workflowNote">
            {isSe ? "SE review note" : "Note (optional)"}
          </Label>
          <Input
            id="workflowNote"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder={
              isSe ? "SE review note…" : "Message for your Sales Engineer…"
            }
          />
          <div className="flex flex-wrap gap-2">
            {!isSe && (
              <Button
                type="button"
                size="sm"
                disabled={loading}
                onClick={() => void flag()}
              >
                Flag for SE
              </Button>
            )}
            {isSe && (
              <>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={loading || !note.trim()}
                  onClick={() => void addNote()}
                >
                  Add note
                </Button>
                <Button
                  type="button"
                  size="sm"
                  disabled={loading}
                  onClick={() => void setReview("reviewed")}
                >
                  Mark reviewed
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={loading}
                  onClick={() => void setReview("needs_changes")}
                >
                  Needs changes
                </Button>
              </>
            )}
            {hasSubmission && (
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={loading}
                onClick={() => void reopen()}
              >
                Allow customer resubmit
              </Button>
            )}
            {isSe && hasSubmission && (
              <Link
                href={`/dashboard/${requestId}/correct`}
                className="inline-flex h-8 items-center justify-center rounded-lg border border-[var(--sophos-grey-2)] bg-background px-3 text-sm font-medium transition-colors hover:bg-muted"
              >
                SE correction
              </Link>
            )}
          </div>
        </div>
      )}

      {awaitingResubmit && !archived && isSe && (
        <div className="flex flex-wrap gap-2">
          <Link
            href={`/dashboard/${requestId}/correct`}
            className="inline-flex h-8 items-center justify-center rounded-lg border border-[var(--sophos-grey-2)] bg-background px-3 text-sm font-medium transition-colors hover:bg-muted"
          >
            SE correction instead
          </Link>
        </div>
      )}

      {isAdmin && (status === "submitted" || hasSubmission) && (
        <div className="border-t border-[var(--sophos-grey-2)] pt-3">
          {archived ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={loading}
              onClick={() => void unarchive()}
            >
              Unarchive request
            </Button>
          ) : (
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={loading}
              onClick={() => void archive()}
            >
              Archive request
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
