import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { verifyAndStoreRegistration } from "@/lib/auth/passkeys";
import type { RegistrationResponseJSON } from "@simplewebauthn/types";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as {
    response?: RegistrationResponseJSON;
    deviceName?: string;
  };

  if (!body.response) {
    return NextResponse.json({ error: "Missing response" }, { status: 400 });
  }

  const result = await verifyAndStoreRegistration(
    session.user.id,
    body.response,
    body.deviceName,
  );

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
