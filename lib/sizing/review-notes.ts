import type { SeReviewNote } from "@/lib/sizing/types";

/**
 * Prefer reviewNotes JSON array. Fall back to legacy single review_note so
 * older submissions still display.
 */
export function resolveReviewNotes(input: {
  reviewNotes?: SeReviewNote[] | null;
  reviewNote?: string | null;
  reviewedAt?: Date | string | null;
  reviewedById?: string | null;
}): SeReviewNote[] {
  const notes = Array.isArray(input.reviewNotes) ? input.reviewNotes : [];
  if (notes.length > 0) return notes;

  const legacy = input.reviewNote?.trim();
  if (!legacy) return [];

  const createdAt =
    input.reviewedAt instanceof Date
      ? input.reviewedAt.toISOString()
      : typeof input.reviewedAt === "string"
        ? input.reviewedAt
        : new Date(0).toISOString();

  return [
    {
      id: "legacy",
      body: legacy,
      authorId: input.reviewedById ?? "legacy",
      authorName: "Sales Engineer",
      authorEmail: null,
      createdAt,
    },
  ];
}

export function formatSeReviewNotePrefix(note: SeReviewNote): string {
  const when = new Date(note.createdAt);
  const stamp = Number.isNaN(when.getTime())
    ? note.createdAt
    : when.toLocaleString();
  return `${note.authorName} · ${stamp}`;
}
