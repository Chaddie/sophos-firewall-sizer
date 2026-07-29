import Link from "next/link";
import { SophosLogo } from "@/components/brand/sophos-logo";
import { cn } from "@/lib/utils";

type AppHeaderProps = {
  nav?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
};

export function AppHeader({ nav, actions, className }: AppHeaderProps) {
  return (
    <header
      className={cn(
        "border-b border-white/10 bg-[var(--sophos-navy)] text-white",
        className,
      )}
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4">
        <div className="flex min-w-0 items-center gap-6">
          <SophosLogo variant="white" href="/" />
          {nav}
        </div>
        {actions}
      </div>
    </header>
  );
}

export function AppHeaderNavLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="text-sm text-white/75 transition-colors hover:text-white"
    >
      {children}
    </Link>
  );
}
