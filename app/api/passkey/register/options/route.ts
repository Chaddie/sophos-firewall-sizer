import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { createRegistrationOptions } from "@/lib/auth/passkeys";
import { getDb } from "@/lib/db";
import { demoStore, isDemoMode } from "@/lib/db/demo-store";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function POST() {
  const session = await auth();
  if (!session?.user?.id || !session.user.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let name = session.user.name ?? session.user.email;
  if (isDemoMode()) {
    const user = await demoStore.users.findById(session.user.id);
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    name = user.name;
  } else {
    const [user] = await getDb()
      .select()
      .from(users)
      .where(eq(users.id, session.user.id))
      .limit(1);
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    name = user.name;
  }

  const options = await createRegistrationOptions({
    id: session.user.id,
    email: session.user.email,
    name,
  });

  return NextResponse.json(options);
}
