import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";

type SophosLogoProps = {
  variant?: "color" | "white";
  className?: string;
  href?: string;
  priority?: boolean;
};

export function SophosLogo({
  variant = "color",
  className,
  href = "/",
  priority = false,
}: SophosLogoProps) {
  const src =
    variant === "white" ? "/sophos-logo-white.svg" : "/sophos-logo.svg";

  const logo = (
    <Image
      src={src}
      alt="Sophos"
      width={148}
      height={16}
      priority={priority}
      className={cn("h-4 w-auto", className)}
    />
  );

  if (!href) return logo;

  return (
    <Link href={href} className="inline-flex shrink-0 items-center">
      {logo}
    </Link>
  );
}
