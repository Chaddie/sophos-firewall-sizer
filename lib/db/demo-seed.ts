import bcrypt from "bcryptjs";
import { demoStore, isDemoMode } from "./demo-store";

let seeded = false;

export async function ensureDemoSeed() {
  if (!isDemoMode() || seeded) return;

  const passwordHash = await bcrypt.hash("changeme123", 12);
  await demoStore.users.upsert({
    id: "demo-admin",
    email: "admin@example.com",
    name: "Demo Account Manager",
    passwordHash,
    role: "account_manager",
  });

  await demoStore.users.upsert({
    id: "demo-se",
    email: "se@example.com",
    name: "Demo Sales Engineer",
    passwordHash,
    role: "sales_engineer",
  });

  const existing = await demoStore.sizingRequests.findBySlug("demo-review");
  if (!existing) {
    await demoStore.sizingRequests.create({
      slug: "demo-review",
      label: "Demo Customer",
      status: "pending",
      createdById: "demo-admin",
      expiresAt: null,
    });
  }

  seeded = true;
}
