import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { db } from "../lib/db";
import { users } from "../lib/db/schema";

async function upsertUser(
  email: string,
  password: string,
  name: string,
  role: "account_manager" | "sales_engineer",
) {
  const [existing] = await db
    .select()
    .from(users)
    .where(eq(users.email, email.toLowerCase()))
    .limit(1);

  const passwordHash = await bcrypt.hash(password, 12);

  if (existing) {
    await db
      .update(users)
      .set({ passwordHash, name, role })
      .where(eq(users.id, existing.id));
    console.log(`Updated ${role} user: ${email}`);
  } else {
    await db.insert(users).values({
      email: email.toLowerCase(),
      name,
      passwordHash,
      role,
    });
    console.log(`Created ${role} user: ${email}`);
  }
}

async function seed() {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL is required");
    process.exit(1);
  }

  await upsertUser(
    process.env.SEED_ADMIN_EMAIL ?? "admin@example.com",
    process.env.SEED_ADMIN_PASSWORD ?? "changeme123",
    process.env.SEED_ADMIN_NAME ?? "Account Manager",
    "account_manager",
  );

  await upsertUser(
    process.env.SEED_SALES_ENGINEER_EMAIL ?? "se@example.com",
    process.env.SEED_SALES_ENGINEER_PASSWORD ?? "changeme123",
    process.env.SEED_SALES_ENGINEER_NAME ?? "Sales Engineer",
    "sales_engineer",
  );

  console.log("Seed complete.");
  process.exit(0);
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
