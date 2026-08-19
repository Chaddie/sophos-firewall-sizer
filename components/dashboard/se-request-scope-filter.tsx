"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

function buildDashboardHref(scope: "mine" | "all", q: string) {
  const params = new URLSearchParams();
  if (scope === "all") params.set("scope", "all");
  const trimmed = q.trim();
  if (trimmed) params.set("q", trimmed);
  const qs = params.toString();
  return qs ? `/dashboard?${qs}` : "/dashboard";
}

export function SeRequestScopeFilter({
  scope,
  creatorQuery,
}: {
  scope: "mine" | "all";
  creatorQuery: string;
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
        router.push(buildDashboardHref(scope, query));
      });
    }, 300);
    return () => window.clearTimeout(handle);
  }, [query, creatorQuery, scope, router]);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div
        className="inline-flex rounded-lg border border-[var(--sophos-grey-2)] bg-white p-0.5 shadow-sm"
        role="group"
        aria-label="Filter sizing requests"
      >
        <Link
          href={buildDashboardHref("mine", query)}
          className={cn(
            "rounded-md px-3 py-1.5 text-sm transition-colors",
            scope === "mine"
              ? "bg-[var(--sophos-navy)] text-white"
              : "text-[var(--sophos-grey-4)] hover:text-[var(--sophos-navy)]",
          )}
          aria-current={scope === "mine" ? "page" : undefined}
        >
          My requests
        </Link>
        <Link
          href={buildDashboardHref("all", query)}
          className={cn(
            "rounded-md px-3 py-1.5 text-sm transition-colors",
            scope === "all"
              ? "bg-[var(--sophos-navy)] text-white"
              : "text-[var(--sophos-grey-4)] hover:text-[var(--sophos-navy)]",
          )}
          aria-current={scope === "all" ? "page" : undefined}
        >
          All requests
        </Link>
      </div>
      <Input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search AM or Partner…"
        aria-label="Search by account manager or partner name or email"
        className={cn(
          "h-8 w-56 border-[var(--sophos-grey-2)] bg-white shadow-sm",
          pending && "opacity-70",
        )}
      />
    </div>
  );
}
