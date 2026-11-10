import { SophosLogo } from "@/components/brand/sophos-logo";

export function AppFooter() {
  return (
    <footer className="mt-auto border-t border-[var(--sophos-grey-2)] bg-[var(--sophos-grey-1)]">
      <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-6 text-sm sm:flex-row sm:items-start sm:justify-between">
        <SophosLogo href="/" />
        <p className="max-w-xl text-xs leading-relaxed text-[var(--sophos-grey-4)] sm:text-right">
          This site is not affiliated with Sophos officially. It is a personal
          project by a member of the Sales Engineering team, built as an
          experimental scoping tool with the intention of becoming a sizing aid
          in the future.
        </p>
      </div>
    </footer>
  );
}
