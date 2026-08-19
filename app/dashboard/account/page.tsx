import { redirect } from "next/navigation";

/** Legacy URL — profile lives at /dashboard/profile. */
export default function AccountRedirectPage() {
  redirect("/dashboard/profile");
}
