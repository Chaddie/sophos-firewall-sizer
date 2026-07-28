import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { db } from "../lib/db";
import { users } from "../lib/db/schema";

async function seed() {
  const email = process.env.SEED_ADMIN_EMAIL ?? "admin@example.com";
  const password = process.env.SEED_ADMIN_PASSWORD ?? "changeme123";
  const name = process.env.SEED_ADMIN_NAME ?? "Admin";

  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL is required");
    process.exit(1);
  }

  const [existing] = await db
    .select()
    .from(users)
    .where(eq(users.email, email.toLowerCase()))
    .limit(1);

  const passwordHash = await bcrypt.hash(password, 12);

  if (existing) {
    await db
      .update(users)
      .set({ passwordHash, name })
      .where(eq(users.id, existing.id));
    console.log(`Updated admin user: ${email}`);
  } else {
    await db.insert(users).values({
      email: email.toLowerCase(),
      name,
      passwordHash,
    });
    console.log(`Created admin user: ${email}`);
  }

  console.log("Seed complete.");
  process.exit(0);
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
