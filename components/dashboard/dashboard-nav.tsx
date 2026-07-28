"use client";

import Link from "next/link";
import { signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";

export function DashboardNav() {
  return (
    <header className="border-b bg-card">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
        <div className="flex items-center gap-6">
          <Link href="/dashboard" className="font-semibold tracking-tight">
            Sophos Firewall Sizer
          </Link>
          <nav className="hidden gap-4 text-sm sm:flex">
            <Link
              href="/dashboard"
              className="text-muted-foreground hover:text-foreground"
            >
              Requests
            </Link>
            <Link
              href="/dashboard/new"
              className="text-muted-foreground hover:text-foreground"
            >
              New link
            </Link>
          </nav>
        </div>
        <Button variant="outline" size="sm" onClick={() => signOut({ callbackUrl: "/login" })}>
          Sign out
        </Button>
      </div>
    </header>
  );
}
