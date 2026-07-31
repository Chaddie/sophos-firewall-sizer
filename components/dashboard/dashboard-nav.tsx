"use client";

import Link from "next/link";
import { signOut } from "next-auth/react";
import { AppHeader, AppHeaderNavLink } from "@/components/brand/app-header";
import { Button } from "@/components/ui/button";

export function DashboardNav({ showAdmin = false }: { showAdmin?: boolean }) {
  return (
    <AppHeader
      nav={
        <nav className="hidden items-center gap-5 sm:flex">
          <AppHeaderNavLink href="/dashboard">Requests</AppHeaderNavLink>
          <AppHeaderNavLink href="/dashboard/new">New link</AppHeaderNavLink>
          {showAdmin && (
            <AppHeaderNavLink href="/dashboard/admin/catalog">
              Catalog admin
            </AppHeaderNavLink>
          )}
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
        </div>
      }
    />
  );
}
