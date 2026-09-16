"use client";

import Link from "next/link";
import { signOut } from "next-auth/react";
import { AppHeader, AppHeaderNavLink } from "@/components/brand/app-header";
import { NotificationBell } from "@/components/dashboard/notification-bell";
import { Button } from "@/components/ui/button";

function initialsFromUser(name: string | null, email: string | null): string {
  const source = name?.trim() || email?.trim() || "?";
  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0]![0]}${parts[1]![0]}`.toUpperCase();
  }
  if (source.includes("@")) {
    return source.slice(0, 2).toUpperCase();
  }
  return source.slice(0, 2).toUpperCase();
}

function roleLabel(role: string | null): string | null {
  if (role === "admin") return "Admin";
  if (role === "sales_engineer") return "Sales Engineer";
  if (role === "account_manager") return "Account Manager";
  if (role === "partner") return "Partner";
  return null;
}

export function DashboardNavClient({
  showAdmin = false,
  showCatalogAdmin = false,
  userName,
  userEmail,
  userRole,
}: {
  showAdmin?: boolean;
  showCatalogAdmin?: boolean;
  userName: string | null;
  userEmail: string | null;
  userRole: string | null;
}) {
  const initials = initialsFromUser(userName, userEmail);
  const label = userName || userEmail || "Profile";
  const role = roleLabel(userRole);

  return (
    <AppHeader
      nav={
        <nav className="hidden items-center gap-5 sm:flex">
          <AppHeaderNavLink href="/dashboard">Requests</AppHeaderNavLink>
          <AppHeaderNavLink href="/dashboard/new">New link</AppHeaderNavLink>
          {showAdmin && (
            <AppHeaderNavLink href="/dashboard/internal/new">
              Internal size
            </AppHeaderNavLink>
          )}
          {showAdmin && (
            <>
              <AppHeaderNavLink href="/dashboard/partners">
                Partners
              </AppHeaderNavLink>
              <AppHeaderNavLink href="/dashboard/admin/sizing-logic">
                Sizing logic
              </AppHeaderNavLink>
              <AppHeaderNavLink href="/dashboard/admin/pilot">
                Pilot metrics
              </AppHeaderNavLink>
            </>
          )}
          {showCatalogAdmin && (
            <AppHeaderNavLink href="/dashboard/admin/catalog">
              Catalog admin
            </AppHeaderNavLink>
          )}
          <a
            href="/guides/when-to-use-sizer.pdf"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-white/75 transition-colors hover:text-white"
          >
            When to use
          </a>
          <a
            href="/guides/account-manager-guide.pdf"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-white/75 transition-colors hover:text-white"
          >
            User guide
          </a>
        </nav>
      }
      actions={
        <div className="flex items-center gap-3">
          <NotificationBell />
          {role && (
            <span className="hidden rounded-full border border-white/25 px-2.5 py-0.5 text-[11px] tracking-wide text-white/85 sm:inline">
              {role}
            </span>
          )}
          <Link href="/dashboard/new" className="sm:hidden">
            <Button
              size="sm"
              className="bg-white text-[var(--sophos-navy)] hover:bg-white/90"
            >
              New link
            </Button>
          </Link>
          <Button
            variant="outline"
            size="sm"
            className="border-white/30 bg-transparent text-white hover:bg-white/10 hover:text-white"
            onClick={() => signOut({ callbackUrl: "/login" })}
          >
            Sign out
          </Button>
          <Link
            href="/dashboard/profile"
            title={`${label} — profile & security`}
            aria-label={`Open profile for ${label}`}
            className="inline-flex size-9 shrink-0 items-center justify-center rounded-full border border-white/25 bg-[var(--sophos-blue)] text-xs font-semibold tracking-wide text-white transition-colors hover:bg-[var(--sophos-blue)]/85 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
          >
            {initials}
          </Link>
        </div>
      }
    />
  );
}
