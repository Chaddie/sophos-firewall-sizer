"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

function buildDashboardHref(input: {
  scope: "mine" | "all";
  q: string;
  status: "all" | "pending" | "submitted";
}) {
  const params = new URLSearchParams();
  if (input.scope === "all") params.set("scope", "all");
  if (input.status !== "all") params.set("status", input.status);
  const trimmed = input.q.trim();
  if (trimmed) params.set("q", trimmed);
  const qs = params.toString();
  return qs ? `/dashboard?${qs}` : "/dashboard";
}

export function SeRequestScopeFilter({
  scope,
  creatorQuery,
  status,
}: {
  scope: "mine" | "all";
  creatorQuery: string;
  status: "all" | "pending" | "submitted";
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
        router.push(buildDashboardHref({ scope, q: query, status }));
      });
    }, 300);
    return () => window.clearTimeout(handle);
  }, [query, creatorQuery, scope, status, router]);

  const statuses: Array<"all" | "pending" | "submitted"> = [
    "all",
    "pending",
    "submitted",
  ];

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div
        className="inline-flex rounded-lg border border-[var(--sophos-grey-2)] bg-white p-0.5 shadow-sm"
        role="group"
        aria-label="Filter by owner"
      >
        <Link
          href={buildDashboardHref({ scope: "mine", q: query, status })}
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
          href={buildDashboardHref({ scope: "all", q: query, status })}
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
            href={buildDashboardHref({ scope, q: query, status: s })}
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
