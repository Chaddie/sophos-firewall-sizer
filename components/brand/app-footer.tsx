import { SophosLogo } from "@/components/brand/sophos-logo";
import { sophosBrand } from "@/lib/brand";

export function AppFooter() {
  return (
    <footer className="mt-auto border-t border-[var(--sophos-grey-2)] bg-[var(--sophos-grey-1)]">
      <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-6 text-sm sm:flex-row sm:items-center sm:justify-between">
        <SophosLogo href="/" />
        <p className="text-[var(--sophos-grey-4)]">
          {sophosBrand.tagline}
        </p>
      </div>
    </footer>
  );
}
