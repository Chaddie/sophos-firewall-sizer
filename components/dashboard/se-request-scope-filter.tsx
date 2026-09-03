"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export type ReviewFilter = "any" | "flagged" | "needs_changes" | "reviewed";

function buildDashboardHref(input: {
  scope: "mine" | "all";
  q: string;
  status: "all" | "pending" | "submitted";
  review: ReviewFilter;
  archive: "active" | "archived";
}) {
  const params = new URLSearchParams();
  if (input.scope === "all") params.set("scope", "all");
  if (input.status !== "all") params.set("status", input.status);
  if (input.review !== "any") params.set("review", input.review);
  if (input.archive === "archived") params.set("archive", "archived");
  const trimmed = input.q.trim();
  if (trimmed) params.set("q", trimmed);
  const qs = params.toString();
  return qs ? `/dashboard?${qs}` : "/dashboard";
}

export function SeRequestScopeFilter({
  scope,
  creatorQuery,
  status,
  review = "any",
  archive = "active",
  showArchiveFilter = false,
}: {
  scope: "mine" | "all";
  creatorQuery: string;
  status: "all" | "pending" | "submitted";
  review?: ReviewFilter;
  archive?: "active" | "archived";
  showArchiveFilter?: boolean;
}) {
  const router = useRouter();
  const [query, setQuery] = useState(creatorQuery);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    setQuery(creatorQuery);
  }, [creatorQuery]);

  useEffect(() => {
    const handle = window.setTimeout(() => {
      if (query.trim() === creatorQuery.trim()) return;
      startTransition(() => {
        router.push(
          buildDashboardHref({ scope, q: query, status, review, archive }),
        );
      });
    }, 300);
    return () => window.clearTimeout(handle);
  }, [query, creatorQuery, scope, status, review, archive, router]);

  const statuses: Array<"all" | "pending" | "submitted"> = [
    "all",
    "pending",
    "submitted",
  ];

  const reviews: Array<{ id: ReviewFilter; label: string }> = [
    { id: "any", label: "Any review" },
    { id: "flagged", label: "SE queue" },
    { id: "needs_changes", label: "Needs changes" },
    { id: "reviewed", label: "Reviewed" },
  ];

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div
        className="inline-flex rounded-lg border border-[var(--sophos-grey-2)] bg-white p-0.5 shadow-sm"
        role="group"
        aria-label="Filter by owner"
      >
        <Link
          href={buildDashboardHref({
            scope: "mine",
            q: query,
            status,
            review,
            archive,
          })}
          className={cn(
            "rounded-md px-3 py-1.5 text-sm transition-colors",
            scope === "mine"
              ? "bg-[var(--sophos-navy)] text-white"
              : "text-[var(--sophos-grey-4)] hover:text-[var(--sophos-navy)]",
          )}
        >
          My requests
        </Link>
        <Link
          href={buildDashboardHref({
            scope: "all",
            q: query,
            status,
            review,
            archive,
          })}
          className={cn(
            "rounded-md px-3 py-1.5 text-sm transition-colors",
            scope === "all"
              ? "bg-[var(--sophos-navy)] text-white"
              : "text-[var(--sophos-grey-4)] hover:text-[var(--sophos-navy)]",
          )}
        >
          All requests
        </Link>
      </div>
      <div
        className="inline-flex rounded-lg border border-[var(--sophos-grey-2)] bg-white p-0.5 shadow-sm"
        role="group"
        aria-label="Filter by status"
      >
        {statuses.map((s) => (
          <Link
            key={s}
            href={buildDashboardHref({
              scope,
              q: query,
              status: s,
              review,
              archive,
            })}
            className={cn(
              "rounded-md px-3 py-1.5 text-sm capitalize transition-colors",
              status === s
                ? "bg-[var(--sophos-navy)] text-white"
                : "text-[var(--sophos-grey-4)] hover:text-[var(--sophos-navy)]",
            )}
          >
            {s === "all" ? "Any status" : s}
          </Link>
        ))}
      </div>
      <div
        className="inline-flex rounded-lg border border-[var(--sophos-grey-2)] bg-white p-0.5 shadow-sm"
        role="group"
        aria-label="Filter by SE review"
      >
        {reviews.map((r) => (
          <Link
            key={r.id}
            href={buildDashboardHref({
              scope,
              q: query,
              status,
              review: r.id,
              archive,
            })}
            className={cn(
              "rounded-md px-3 py-1.5 text-sm transition-colors",
              review === r.id
                ? "bg-[var(--sophos-navy)] text-white"
                : "text-[var(--sophos-grey-4)] hover:text-[var(--sophos-navy)]",
            )}
          >
            {r.label}
          </Link>
        ))}
      </div>
      {showArchiveFilter && (
        <div
          className="inline-flex rounded-lg border border-[var(--sophos-grey-2)] bg-white p-0.5 shadow-sm"
          role="group"
          aria-label="Filter archived"
        >
          <Link
            href={buildDashboardHref({
              scope,
              q: query,
              status,
              review,
              archive: "active",
            })}
            className={cn(
              "rounded-md px-3 py-1.5 text-sm transition-colors",
              archive === "active"
                ? "bg-[var(--sophos-navy)] text-white"
                : "text-[var(--sophos-grey-4)] hover:text-[var(--sophos-navy)]",
            )}
          >
            Active
          </Link>
          <Link
            href={buildDashboardHref({
              scope,
              q: query,
              status,
              review,
              archive: "archived",
            })}
            className={cn(
              "rounded-md px-3 py-1.5 text-sm transition-colors",
              archive === "archived"
                ? "bg-[var(--sophos-navy)] text-white"
                : "text-[var(--sophos-grey-4)] hover:text-[var(--sophos-navy)]",
            )}
          >
            Archived
          </Link>
        </div>
      )}
      <Input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search creator, customer, contact…"
        aria-label="Search by creator, customer label, contact, or slug"
        className={cn(
          "h-8 w-64 border-[var(--sophos-grey-2)] bg-white shadow-sm",
          pending && "opacity-70",
        )}
      />
    </div>
  );
}
