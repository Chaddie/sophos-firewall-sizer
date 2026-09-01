import { randomUUID } from "crypto";
import type { SeReviewNote } from "@/lib/sizing/types";

export function createSeReviewNote(input: {
  body: string;
  authorId: string;
  authorName: string;
  authorEmail?: string | null;
  createdAt?: Date;
}): SeReviewNote {
  return {
    id: randomUUID(),
    body: input.body.trim(),
    authorId: input.authorId,
    authorName: input.authorName.trim() || "Sales Engineer",
    authorEmail: input.authorEmail ?? null,
    createdAt: (input.createdAt ?? new Date()).toISOString(),
  };
}
